import { returnItemsToCart } from "@/features/cart/cart-service";
import { computeTotals } from "@/features/cart/cart-totals";
import { computeGiftAvailability } from "@/features/gifts/gift-availability";
import { getGiftHolds } from "@/features/gifts/gift-holds";
import { DomainError } from "@/lib/domain-error";
import type { Db } from "@/server/db";
import { generatePixTxid } from "./txid";

export interface UnavailableItem {
  giftId: string;
  title: string;
  requested: number;
  available: number;
}

interface LockedGift {
  id: string;
  title: string;
  imageUrl: string | null;
  priceInCents: number;
  stockQuantity: number;
  active: boolean;
}

/**
 * Cria uma reserva temporária a partir do carrinho do convidado.
 *
 * Concorrência: dentro de UMA transação, travamos as linhas dos presentes envolvidos com
 * SELECT ... FOR UPDATE (sempre em ordem de id, evitando deadlock). Uma segunda transação que
 * queira os mesmos presentes espera o commit da primeira e, ao recalcular as reservas, já
 * enxerga o pedido recém-criado — então duas pessoas nunca reservam a mesma última unidade.
 *
 * Preços e total vêm exclusivamente do banco.
 * Se o convidado já tinha uma reserva ativa, ela é desfeita e seus itens entram na nova
 * (tudo na mesma transação).
 */
export async function createReservationFromCart(
  db: Db,
  guestId: string,
  { now = new Date(), reservationMinutes = 30 }: { now?: Date; reservationMinutes?: number } = {},
) {
  return db.$transaction(
    async (tx) => {
      // 1. Reserva ativa anterior volta para o carrinho (renovação da reserva)
      const previous = await tx.order.findMany({
        where: { guestId, status: "RESERVED", reservationExpiresAt: { gt: now } },
        include: { items: true },
      });
      for (const order of previous) {
        const changed = await tx.order.updateMany({
          where: { id: order.id, status: "RESERVED" },
          data: { status: "CANCELLED", cancelledAt: now },
        });
        if (changed.count) {
          await tx.payment.updateMany({ where: { orderId: order.id }, data: { status: "CANCELLED" } });
          await returnItemsToCart(tx, guestId, order.items);
        }
      }

      // 2. Itens do carrinho
      const cart = await tx.cart.findUnique({ where: { guestId }, include: { items: true } });
      const items = cart?.items ?? [];
      if (!cart || items.length === 0) throw new DomainError("EMPTY_CART", "Seu carrinho está vazio.");

      // 3. Trava as linhas dos presentes (ordem determinística)
      const giftIds = [...new Set(items.map((i) => i.giftId))].sort();
      const locked = await tx.$queryRaw<LockedGift[]>`
        SELECT id, title, "imageUrl", "priceInCents", "stockQuantity", active
        FROM "Gift"
        WHERE id = ANY(${giftIds}::text[])
        ORDER BY id
        FOR UPDATE`;
      const giftsById = new Map(locked.map((g) => [g.id, g]));

      // 4. Disponibilidade calculada já com as travas adquiridas
      const holds = await getGiftHolds(tx, now, giftIds);
      const unavailable: UnavailableItem[] = [];
      for (const item of items) {
        const gift = giftsById.get(item.giftId);
        const available = gift ? computeGiftAvailability(gift, holds.get(item.giftId)).available : 0;
        if (!gift || available < item.quantity) {
          unavailable.push({ giftId: item.giftId, title: gift?.title ?? "Presente", requested: item.quantity, available });
        }
      }
      if (unavailable.length) {
        throw new DomainError(
          "UNAVAILABLE",
          unavailable.length === 1
            ? `Ops! "${unavailable[0]!.title}" acabou de ser reservado por outra pessoa.`
            : "Ops! Alguns presentes acabaram de ser reservados por outras pessoas.",
          unavailable,
        );
      }

      // 5. Totais a partir dos preços do banco
      const lines = items.map((item) => {
        const gift = giftsById.get(item.giftId)!;
        return { gift, quantity: item.quantity, unitPriceInCents: gift.priceInCents };
      });
      const totals = computeTotals(lines);

      // 6. Pedido + pagamento pendente
      const order = await tx.order.create({
        data: {
          guestId,
          status: "RESERVED",
          subtotalInCents: totals.subtotalInCents,
          totalInCents: totals.totalInCents,
          pixTxid: generatePixTxid(),
          reservationExpiresAt: new Date(now.getTime() + reservationMinutes * 60_000),
          items: {
            create: lines.map((l) => ({
              giftId: l.gift.id,
              quantity: l.quantity,
              unitPriceInCents: l.unitPriceInCents,
              giftTitleSnapshot: l.gift.title,
              giftImageSnapshot: l.gift.imageUrl,
            })),
          },
          payment: { create: { method: "PIX", status: "PENDING", amountInCents: totals.totalInCents } },
        },
        include: { items: true, payment: true },
      });

      // 7. Carrinho esvaziado
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      return order;
    },
    { timeout: 15_000, maxWait: 10_000 },
  );
}

/**
 * "Já fiz o pagamento": RESERVED (dentro do prazo) → AWAITING_PAYMENT_CONFIRMATION.
 * O UPDATE condicional é atômico — o prazo é verificado pelo servidor, não pelo contador da tela.
 */
export async function reportPayment(db: Db, guestId: string, orderId: string, now = new Date()) {
  return db.$transaction(async (tx) => {
    const changed = await tx.order.updateMany({
      where: { id: orderId, guestId, status: "RESERVED", reservationExpiresAt: { gt: now } },
      data: { status: "AWAITING_PAYMENT_CONFIRMATION", paymentReportedAt: now },
    });
    if (changed.count === 1) {
      await tx.payment.updateMany({ where: { orderId }, data: { status: "AWAITING_CONFIRMATION" } });
      return;
    }
    const order = await tx.order.findFirst({ where: { id: orderId, guestId } });
    if (!order) throw new DomainError("ORDER_NOT_FOUND", "Pedido não encontrado.");
    if (order.status === "AWAITING_PAYMENT_CONFIRMATION" || order.status === "PURCHASED") return; // idempotente
    if (order.status === "RESERVED" || order.status === "EXPIRED") {
      throw new DomainError("RESERVATION_EXPIRED", "O tempo da reserva acabou antes de o pagamento ser informado.");
    }
    throw new DomainError("ORDER_CLOSED", "Este pedido foi cancelado.");
  });
}

/** Convidado desiste da reserva (ou ela venceu): itens voltam ao carrinho. */
export async function releaseReservationToCart(db: Db, guestId: string, orderId: string, now = new Date()) {
  return db.$transaction(async (tx) => {
    const order = await tx.order.findFirst({ where: { id: orderId, guestId }, include: { items: true } });
    if (!order) throw new DomainError("ORDER_NOT_FOUND", "Pedido não encontrado.");
    if (order.status !== "RESERVED") {
      if (order.status === "EXPIRED" || order.status === "CANCELLED") {
        await returnItemsToCart(tx, guestId, order.items, "max");
        return;
      }
      throw new DomainError("ORDER_LOCKED", "Este pedido já está aguardando confirmação do pagamento.");
    }
    const expired = order.reservationExpiresAt <= now;
    const changed = await tx.order.updateMany({
      where: { id: orderId, status: "RESERVED" },
      data: expired ? { status: "EXPIRED" } : { status: "CANCELLED", cancelledAt: now },
    });
    if (changed.count) {
      await tx.payment.updateMany({ where: { orderId }, data: { status: expired ? "EXPIRED" : "CANCELLED" } });
    }
    await returnItemsToCart(tx, guestId, order.items, "max");
  });
}

/** Marca como EXPIRED as reservas vencidas (housekeeping; a disponibilidade já ignora vencidas). */
export async function expireStaleReservations(db: Db, now = new Date()): Promise<number> {
  const stale = await db.order.findMany({
    where: { status: "RESERVED", reservationExpiresAt: { lte: now } },
    select: { id: true },
  });
  if (!stale.length) return 0;
  const ids = stale.map((o) => o.id);
  const [result] = await db.$transaction([
    db.order.updateMany({ where: { id: { in: ids }, status: "RESERVED" }, data: { status: "EXPIRED" } }),
    db.payment.updateMany({ where: { orderId: { in: ids }, status: "PENDING" }, data: { status: "EXPIRED" } }),
  ]);
  return result.count;
}
