import { DEFAULT_RESERVATION_MINUTES } from "@/features/event/event";
import type { Db } from "@/server/db";

export const EVENT_SLUG = "jose-2-anos";

/** Duração da reserva configurada no evento (admin → Configurações); padrão 30 min. */
export async function getReservationMinutes(db: Db): Promise<number> {
  const event = await db.event.findUnique({ where: { slug: EVENT_SLUG }, select: { reservationMinutes: true } });
  const minutes = event?.reservationMinutes ?? DEFAULT_RESERVATION_MINUTES;
  return Math.min(180, Math.max(5, minutes));
}
