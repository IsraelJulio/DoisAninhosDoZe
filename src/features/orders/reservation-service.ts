import { returnItemsToCart } from "@/features/cart/cart-service";
import { computeTotals } from "@/features/cart/cart-totals";
import { computeGiftAvailability } from "@/features/gifts/gift-availability";
import { getGiftHolds } from "@/features/gifts/gift-holds";
import { DomainError } from "@/lib/domain-error";
import type { Db, Tx } from "@/server/db";
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
 * Serializa as operações de pedido de UM convidado (clique duplo, duas abas, renovação x
 * "já paguei"). É sempre a primeira trava da transação: a ordem fixa convidado → presentes
 * elimina deadlocks entre essas operações.
 */
async function lockGuest(tx: Tx, guestId: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${guestId}, 0))`;
}

/**
 * Lê os presentes (ordem de id) e calcula a disponibilidade PARA ESTE CONVIDADO.
 * FOR SHARE: convidados diferentes não se bloqueiam (vários podem dar o mesmo presente),
 * mas uma edição do admin (preço, desativar) espera o pedido terminar e vice-versa.
 * Deve rodar depois de lockGuest, que serializa os pedidos do próprio convidado.
 */
async function lockGiftsWithAvailability(tx: Tx, guestId: string, giftIds: string[], now: Date) {
  const ids = [...new Set(giftIds)].sort();
  const locked = await tx.$queryRaw<LockedGift[]>`
    SELECT id, title, "imageUrl", "priceInCents", "stockQuantity", active
    FROM "Gift"
    WHERE id = ANY(${ids}::text[])
    ORDER BY id
    FOR SHARE`;
  const holds = await getGiftHolds(tx, now, { giftIds: ids, guestId });
  return new Map(locked.map((g) => [g.id, { gift: g, available: computeGiftAvailability(g, holds.get(g.id)).available }]));
}

const ORDER_INCLUDE = { items: true, payment: true } as const;

/**
 * Cria uma reserva temporária a partir do carrinho do convidado.
 *
 * Disponibilidade por convidado: um presente que ele já tem em reserva ativa, aguardando
 * confirmação ou pago fica indisponível só para ele; outros convidados podem dar o mesmo item.
 *
 * Concorrência: trava por convidado (advisory lock) → clique duplo/duas abas não criam pedidos
 * duplicados nem deixam o mesmo convidado reservar o mesmo presente duas vezes.
 *
 * Idempotente: com o carrinho vazio e uma reserva ativa, devolve a reserva existente.
 * Se havia reserva ativa e o carrinho tem itens novos, a reserva é renovada com tudo junto.
 * Preços e total vêm exclusivamente do banco.
 */
export async function createReservationFromCart(
  db: Db,
  guestId: string,
  { now = new Date(), reservationMinutes = 30 }: { now?: Date; reservationMinutes?: number } = {},
) {
  return db.$transaction(
    async (tx) => {
      await lockGuest(tx, guestId);

      const cart = await tx.cart.findUnique({ where: { guestId }, include: { items: true } });
      const active = await tx.order.findMany({
        where: { guestId, status: "RESERVED", reservationExpiresAt: { gt: now } },
        include: ORDER_INCLUDE,
        orderBy: { createdAt: "desc" },
      });

      if (!cart || cart.items.length === 0) {
        if (active[0]) return active[0]; // segundo clique / refresh: a mesma reserva
        throw new DomainError("EMPTY_CART", "Seu carrinho está vazio.");
      }

      // Renovação: reservas ativas anteriores voltam ao carrinho e entram no novo pedido
      for (const order of active) {
        const changed = await tx.order.updateMany({
          where: { id: order.id, status: "RESERVED" },
          data: { status: "CANCELLED", cancelledAt: now },
        });
        if (changed.count) {
          await tx.payment.updateMany({ where: { orderId: order.id }, data: { status: "CANCELLED" } });
          await returnItemsToCart(tx, guestId, order.items);
        }
      }
      const items = active.length ? await tx.cartItem.findMany({ where: { cartId: cart.id } }) : cart.items;

      const giftsById = await lockGiftsWithAvailability(tx, guestId, items.map((i) => i.giftId), now);
      const unavailable: UnavailableItem[] = [];
      for (const item of items) {
        const entry = giftsById.get(item.giftId);
        if (!entry || !entry.gift.active || entry.available < item.quantity) {
          unavailable.push({
            giftId: item.giftId,
            title: entry?.gift.title ?? "Presente",
            requested: item.quantity,
            available: entry?.available ?? 0,
          });
        }
      }
      if (unavailable.length) {
        throw new DomainError(
          "UNAVAILABLE",
          unavailable.length === 1
            ? `Ops! "${unavailable[0]!.title}" não está disponível para você nessa quantidade.`
            : "Ops! Alguns presentes não estão disponíveis para você nessa quantidade.",
          unavailable,
        );
      }

      const lines = items.map((item) => {
        const { gift } = giftsById.get(item.giftId)!;
        return { gift, quantity: item.quantity, unitPriceInCents: gift.priceInCents };
      });
      const totals = computeTotals(lines);

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
        include: ORDER_INCLUDE,
      });

      // Remove só os itens que entraram no pedido (um item adicionado em paralelo não se perde)
      await tx.cartItem.deleteMany({ where: { id: { in: items.map((i) => i.id) } } });
      return order;
    },
    { timeout: 15_000, maxWait: 10_000 },
  );
}

export type ReportResult = "AWAITING" | "LATE_UNAVAILABLE" | "CLOSED_REPORTED";

/**
 * "Já fiz o pagamento". O prazo é decidido pelo servidor, nunca pelo contador da tela.
 *  - reserva válida → AWAITING_PAYMENT_CONFIRMATION (não expira mais; só o admin decide);
 *  - reserva vencida, mas os presentes continuam disponíveis para o convidado → reativa e fica AWAITING;
 *  - reserva vencida e presente indisponível para ele (desativado, ou já está em outro pedido
 *    dele) → NÃO duplica: o aviso fica registrado (Payment AWAITING_CONFIRMATION num pedido
 *    EXPIRED) para o admin resolver;
 *  - pedido cancelado → o aviso também fica registrado (o convidado pode ter pago mesmo assim).
 * Idempotente para pedidos já aguardando/confirmados.
 */
export async function reportPayment(db: Db, guestId: string, orderId: string, now = new Date()): Promise<ReportResult> {
  return db.$transaction(async (tx) => {
    await lockGuest(tx, guestId);
    const order = await tx.order.findFirst({ where: { id: orderId, guestId }, include: { items: true } });
    if (!order) throw new DomainError("ORDER_NOT_FOUND", "Pedido não encontrado.");
    if (order.status === "AWAITING_PAYMENT_CONFIRMATION" || order.status === "PURCHASED") return "AWAITING";

    const markAwaiting = async () => {
      await tx.order.update({ where: { id: orderId }, data: { status: "AWAITING_PAYMENT_CONFIRMATION", paymentReportedAt: now } });
      await tx.payment.updateMany({ where: { orderId }, data: { status: "AWAITING_CONFIRMATION" } });
    };
    const recordLateReport = async (status: "EXPIRED" | "CANCELLED") => {
      await tx.order.update({ where: { id: orderId }, data: { status, paymentReportedAt: now } });
      await tx.payment.updateMany({ where: { orderId }, data: { status: "AWAITING_CONFIRMATION" } });
    };

    if (order.status === "RESERVED" && order.reservationExpiresAt > now) {
      await markAwaiting();
      return "AWAITING";
    }

    if (order.status === "RESERVED" || order.status === "EXPIRED") {
      const gifts = await lockGiftsWithAvailability(tx, guestId, order.items.map((i) => i.giftId), now);
      const stillAvailable = order.items.every((item) => {
        const entry = gifts.get(item.giftId);
        return Boolean(entry && entry.gift.active && entry.available >= item.quantity);
      });
      if (stillAvailable) {
        await markAwaiting();
        return "AWAITING";
      }
      await recordLateReport("EXPIRED");
      return "LATE_UNAVAILABLE";
    }

    await recordLateReport("CANCELLED");
    return "CLOSED_REPORTED";
  });
}

/** Convidado desiste da reserva (ou ela venceu): itens voltam ao carrinho. */
export async function releaseReservationToCart(db: Db, guestId: string, orderId: string, now = new Date()) {
  return db.$transaction(async (tx) => {
    await lockGuest(tx, guestId);
    const order = await tx.order.findFirst({ where: { id: orderId, guestId }, include: { items: true } });
    if (!order) throw new DomainError("ORDER_NOT_FOUND", "Pedido não encontrado.");
    if (order.status !== "RESERVED") {
      if (order.status === "EXPIRED" || order.status === "CANCELLED") {
        // Aba antiga: se já existe outra reserva ativa (ex.: renovação), não duplica itens.
        const otherActive = await tx.order.count({ where: { guestId, status: "RESERVED", reservationExpiresAt: { gt: now } } });
        if (!otherActive) await returnItemsToCart(tx, guestId, order.items, "max");
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
