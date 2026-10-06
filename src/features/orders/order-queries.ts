import type { Db } from "@/server/db";

const ORDER_INCLUDE = { items: { orderBy: { id: "asc" } }, payment: true } as const;

/** Pedido do convidado (nunca retorna pedido de outra pessoa). */
export async function getGuestOrder(db: Db, guestId: string, orderId: string) {
  return db.order.findFirst({ where: { id: orderId, guestId }, include: ORDER_INCLUDE });
}

/** Reserva ainda válida do convidado, se houver. */
export async function getActiveReservation(db: Db, guestId: string, now = new Date()) {
  return db.order.findFirst({
    where: { guestId, status: "RESERVED", reservationExpiresAt: { gt: now } },
    include: ORDER_INCLUDE,
    orderBy: { createdAt: "desc" },
  });
}

/** Pedido mais recente que vale acompanhar (aguardando ou confirmado). */
export async function getLatestTrackableOrder(db: Db, guestId: string) {
  return db.order.findFirst({
    where: { guestId, status: { in: ["AWAITING_PAYMENT_CONFIRMATION", "PURCHASED"] } },
    select: { id: true, status: true },
    orderBy: { updatedAt: "desc" },
  });
}

export type GuestOrder = NonNullable<Awaited<ReturnType<typeof getGuestOrder>>>;
