import type { OrderStatus, Prisma } from "@/generated/prisma/client";
import { computeGiftAvailability } from "@/features/gifts/gift-availability";
import { getGiftHolds } from "@/features/gifts/gift-holds";
import { expireStaleReservations } from "@/features/orders/reservation-service";
import { getRsvpTotals } from "@/features/rsvp/rsvp-service";
import type { Db } from "@/server/db";

export async function getDashboard(db: Db, now = new Date()) {
  await expireStaleReservations(db, now);
  const [rsvp, gifts, holds, pendingPayments, confirmedValue, recentRsvps] = await Promise.all([
    getRsvpTotals(db),
    db.gift.findMany({ where: { active: true }, select: { id: true, stockQuantity: true, active: true } }),
    getGiftHolds(db, now),
    db.order.count({ where: PENDING_PAYMENTS_WHERE }),
    db.order.aggregate({ where: { status: "PURCHASED" }, _sum: { totalInCents: true }, _count: { _all: true } }),
    db.rsvp.findMany({
      where: { attending: true },
      include: { guest: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
  ]);

  // Vários convidados podem dar o mesmo presente: reservados/presenteados contam unidades.
  let available = 0;
  let reserved = 0;
  let purchased = 0;
  for (const gift of gifts) {
    if (computeGiftAvailability(gift).status === "AVAILABLE") available += 1;
    reserved += holds.get(gift.id)?.reserved ?? 0;
    purchased += holds.get(gift.id)?.purchased ?? 0;
  }

  return {
    rsvp,
    gifts: { total: gifts.length, available, reserved, purchased },
    pendingPayments,
    confirmedOrders: confirmedValue._count._all,
    confirmedValueInCents: confirmedValue._sum.totalInCents ?? 0,
    recentRsvps,
  };
}

export type GuestFilter = "all" | "yes" | "no" | "pending";

export async function listGuestsForAdmin(db: Db, { filter = "all", search = "" }: { filter?: GuestFilter; search?: string }) {
  const where: Prisma.GuestWhereInput = {};
  if (filter === "yes") where.rsvp = { attending: true };
  if (filter === "no") where.rsvp = { attending: false };
  if (filter === "pending") where.rsvp = { is: null };
  if (search.trim()) where.name = { contains: search.trim(), mode: "insensitive" };
  return db.guest.findMany({
    where,
    include: { rsvp: true },
    orderBy: [{ rsvp: { updatedAt: "desc" } }, { createdAt: "desc" }],
    take: 500,
  });
}

export type PaymentTab = "pending" | "confirmed" | "cancelled" | "reserved";

/** Pix informado num pedido que já não está ativo (reserva vencida e presente com outra pessoa). */
const LATE_REPORT: Prisma.OrderWhereInput = {
  status: { in: ["EXPIRED", "CANCELLED"] },
  payment: { status: "AWAITING_CONFIRMATION" },
};

/** Pendentes = aguardando confirmação + avisos de Pix tardios que o admin precisa resolver. */
export const PENDING_PAYMENTS_WHERE: Prisma.OrderWhereInput = {
  OR: [{ status: "AWAITING_PAYMENT_CONFIRMATION" }, LATE_REPORT],
};

const TAB_WHERE: Record<PaymentTab, Prisma.OrderWhereInput> = {
  pending: PENDING_PAYMENTS_WHERE,
  reserved: { status: "RESERVED" },
  confirmed: { status: "PURCHASED" },
  cancelled: { status: { in: ["CANCELLED", "EXPIRED"] as OrderStatus[] }, NOT: LATE_REPORT },
};

export async function listOrdersForAdmin(db: Db, tab: PaymentTab, now = new Date()) {
  await expireStaleReservations(db, now);
  return db.order.findMany({
    where: TAB_WHERE[tab],
    include: { guest: { select: { name: true, phone: true } }, items: true, payment: true },
    orderBy: tab === "pending" ? { paymentReportedAt: "asc" } : { updatedAt: "desc" },
    take: 200,
  });
}

export async function countOrdersByTab(db: Db) {
  const [pending, reserved, confirmed, cancelled] = await Promise.all(
    (["pending", "reserved", "confirmed", "cancelled"] as const).map((tab) => db.order.count({ where: TAB_WHERE[tab] })),
  );
  return { pending, reserved, confirmed, cancelled };
}

export async function listGiftsForAdmin(db: Db, now = new Date()) {
  const [gifts, holds, withOrders] = await Promise.all([
    db.gift.findMany({ orderBy: [{ active: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }] }),
    getGiftHolds(db, now),
    db.orderItem.findMany({ distinct: ["giftId"], select: { giftId: true } }),
  ]);
  const hasOrders = new Set(withOrders.map((o) => o.giftId));
  return gifts.map((gift) => ({
    ...gift,
    ...computeGiftAvailability(gift), // sem convidado: só ativo/inativo; os totais estão em holds
    holds: holds.get(gift.id) ?? { purchased: 0, reserved: 0 },
    hasOrders: hasOrders.has(gift.id),
  }));
}
