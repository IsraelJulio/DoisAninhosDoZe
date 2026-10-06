import type { Db } from "@/server/db";
import type { RsvpInput } from "./rsvp-schema";

/** Cria ou atualiza a confirmação do convidado (e o nome dele) atomicamente. */
export async function upsertRsvp(db: Db, guestId: string, input: RsvpInput) {
  const data = {
    attending: input.attending,
    adults: input.adults,
    children: input.children,
    message: input.message ?? null,
  };
  const [, rsvp] = await db.$transaction([
    db.guest.update({ where: { id: guestId }, data: { name: input.name } }),
    db.rsvp.upsert({ where: { guestId }, update: data, create: { guestId, ...data } }),
  ]);
  return rsvp;
}

export interface RsvpTotals {
  confirmedGuests: number;
  declinedGuests: number;
  adults: number;
  children: number;
  totalPeople: number;
}

/** Totais para o dashboard — crianças são usadas para as lembrancinhas. */
export async function getRsvpTotals(db: Db): Promise<RsvpTotals> {
  const [attending, declined] = await Promise.all([
    db.rsvp.aggregate({ where: { attending: true }, _count: { _all: true }, _sum: { adults: true, children: true } }),
    db.rsvp.count({ where: { attending: false } }),
  ]);
  const adults = attending._sum.adults ?? 0;
  const children = attending._sum.children ?? 0;
  return {
    confirmedGuests: attending._count._all,
    declinedGuests: declined,
    adults,
    children,
    totalPeople: adults + children,
  };
}
