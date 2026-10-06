import { computeGiftAvailability, type GiftStatus } from "@/features/gifts/gift-availability";
import { getGiftHolds } from "@/features/gifts/gift-holds";
import { DomainError } from "@/lib/domain-error";
import type { Db, Tx } from "@/server/db";
import { MAX_QUANTITY_PER_ITEM } from "./cart-constants";
import { computeTotals } from "./cart-totals";

export { MAX_QUANTITY_PER_ITEM };


export interface CartLine {
  giftId: string;
  title: string;
  imageUrl: string | null;
  unitPriceInCents: number;
  quantity: number;
  available: number;
  status: GiftStatus;
  /** quantidade pedida maior do que o disponível agora */
  exceedsAvailability: boolean;
}

export async function getCart(db: Db, guestId: string, now = new Date()) {
  const cart = await db.cart.findUnique({
    where: { guestId },
    include: { items: { include: { gift: true }, orderBy: { id: "asc" } } },
  });
  const items = cart?.items ?? [];
  const holds = await getGiftHolds(db, now, items.map((i) => i.giftId));
  const lines: CartLine[] = items.map((item) => {
    const { available, status } = computeGiftAvailability(item.gift, holds.get(item.giftId));
    return {
      giftId: item.giftId,
      title: item.gift.title,
      imageUrl: item.gift.imageUrl,
      unitPriceInCents: item.gift.priceInCents,
      quantity: item.quantity,
      available,
      status,
      exceedsAvailability: item.quantity > available,
    };
  });
  return { lines, ...computeTotals(lines) };
}

export async function getCartItemCount(db: Db, guestId: string): Promise<number> {
  const result = await db.cartItem.aggregate({ where: { cart: { guestId } }, _sum: { quantity: true } });
  return result._sum.quantity ?? 0;
}

async function ensureCart(db: Db | Tx, guestId: string) {
  return db.cart.upsert({ where: { guestId }, update: {}, create: { guestId }, select: { id: true } });
}

function assertQuantity(quantity: number) {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY_PER_ITEM) {
    throw new DomainError("INVALID_QUANTITY", "Quantidade inválida.");
  }
}

/** Adiciona ao carrinho validando a disponibilidade atual (a garantia real acontece no checkout). */
export async function addToCart(db: Db, guestId: string, giftId: string, quantity: number, now = new Date()) {
  assertQuantity(quantity);
  const gift = await db.gift.findUnique({ where: { id: giftId } });
  if (!gift || !gift.active) throw new DomainError("GIFT_NOT_FOUND", "Este presente não está mais na lista.");
  const holds = await getGiftHolds(db, now, [giftId]);
  const { available } = computeGiftAvailability(gift, holds.get(giftId));
  const cart = await ensureCart(db, guestId);
  const existing = await db.cartItem.findUnique({ where: { cartId_giftId: { cartId: cart.id, giftId } } });
  const desired = (existing?.quantity ?? 0) + quantity;
  if (available <= 0) throw new DomainError("UNAVAILABLE", "Este presente já foi reservado ou presenteado.");
  if (desired > available) {
    throw new DomainError("NOT_ENOUGH_STOCK", `Só ${available === 1 ? "resta 1 unidade" : `restam ${available} unidades`} deste presente.`);
  }
  await db.cartItem.upsert({
    where: { cartId_giftId: { cartId: cart.id, giftId } },
    update: { quantity: desired },
    create: { cartId: cart.id, giftId, quantity },
  });
}

export async function setCartItemQuantity(db: Db, guestId: string, giftId: string, quantity: number) {
  if (quantity === 0) return removeCartItem(db, guestId, giftId);
  assertQuantity(quantity);
  await db.cartItem.updateMany({ where: { giftId, cart: { guestId } }, data: { quantity } });
}

export async function removeCartItem(db: Db, guestId: string, giftId: string) {
  await db.cartItem.deleteMany({ where: { giftId, cart: { guestId } } });
}

/**
 * Devolve itens (ex.: de uma reserva expirada/cancelada) ao carrinho.
 * mode "add" soma quantidades; "max" é idempotente (clicar duas vezes não duplica).
 */
export async function returnItemsToCart(
  tx: Db | Tx,
  guestId: string,
  items: { giftId: string; quantity: number }[],
  mode: "add" | "max" = "add",
) {
  if (!items.length) return;
  const cart = await ensureCart(tx, guestId);
  for (const item of items) {
    const key = { cartId_giftId: { cartId: cart.id, giftId: item.giftId } };
    const existing = await tx.cartItem.findUnique({ where: key });
    const quantity =
      mode === "add" ? (existing?.quantity ?? 0) + item.quantity : Math.max(existing?.quantity ?? 0, item.quantity);
    await tx.cartItem.upsert({
      where: key,
      update: { quantity: Math.min(quantity, MAX_QUANTITY_PER_ITEM) },
      create: { cartId: cart.id, giftId: item.giftId, quantity: Math.min(quantity, MAX_QUANTITY_PER_ITEM) },
    });
  }
}
