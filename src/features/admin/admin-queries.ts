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
    db.order.count({ where: { status: "AWAITING_PAYMENT_CONFIRMATION" } }),
    db.order.aggregate({ where: { status: "PURCHASED" }, _sum: { totalInCents: true }, _count: { _all: true } }),
    db.rsvp.findMany({
      where: { attending: true },
      include: { guest: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
  ]);

  const giftStatus = { AVAILABLE: 0, RESERVED: 0, PURCHASED: 0 };
  for (const gift of gifts) {
    const { status } = computeGiftAvailability(gift, holds.get(gift.id));
    if (status in giftStatus) giftStatus[status as keyof typeof giftStatus] += 1;
  }

  return {
    rsvp,
    gifts: { total: gifts.length, available: giftStatus.AVAILABLE, reserved: giftStatus.RESERVED, purchased: giftStatus.PURCHASED },
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

const TAB_STATUSES: Record<PaymentTab, OrderStatus[]> = {
  pending: ["AWAITING_PAYMENT_CONFIRMATION"],
  reserved: ["RESERVED"],
  confirmed: ["PURCHASED"],
  cancelled: ["CANCELLED", "EXPIRED"],
};

export async function listOrdersForAdmin(db: Db, tab: PaymentTab, now = new Date()) {
  await expireStaleReservations(db, now);
  return db.order.findMany({
    where: { status: { in: TAB_STATUSES[tab] } },
    include: { guest: { select: { name: true, phone: true } }, items: true, payment: true },
    orderBy: tab === "pending" ? { paymentReportedAt: "asc" } : { updatedAt: "desc" },
    take: 200,
  });
}

export async function countOrdersByTab(db: Db) {
  const groups = await db.order.groupBy({ by: ["status"], _count: { _all: true } });
  const count = (statuses: OrderStatus[]) =>
    groups.filter((g) => statuses.includes(g.status)).reduce((acc, g) => acc + g._count._all, 0);
  return {
    pending: count(TAB_STATUSES.pending),
    reserved: count(TAB_STATUSES.reserved),
    confirmed: count(TAB_STATUSES.confirmed),
    cancelled: count(TAB_STATUSES.cancelled),
  };
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
    ...computeGiftAvailability(gift, holds.get(gift.id)),
    holds: holds.get(gift.id) ?? { purchased: 0, reserved: 0 },
    hasOrders: hasOrders.has(gift.id),
  }));
}
