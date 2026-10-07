import { Prisma } from "@/generated/prisma/client";
import type { Db, Tx } from "@/server/db";
import type { GiftHolds } from "./gift-availability";

/**
 * Soma, por presente, as quantidades comprometidas em pedidos:
 *  - purchased: pedidos PURCHASED
 *  - reserved: AWAITING_PAYMENT_CONFIRMATION (não expira) + RESERVED ainda dentro do prazo
 * Com `guestId`, considera só os pedidos desse convidado (base da disponibilidade);
 * sem ele, soma todos os convidados (totais do admin).
 * Reservas vencidas deixam de contar imediatamente (expiração "preguiçosa", sem cron).
 */
export async function getGiftHolds(
  db: Db | Tx,
  now: Date,
  { giftIds, guestId }: { giftIds?: string[]; guestId?: string } = {},
): Promise<Map<string, GiftHolds>> {
  const giftFilter = giftIds ? Prisma.sql`AND oi."giftId" = ANY(${giftIds}::text[])` : Prisma.empty;
  const guestFilter = guestId ? Prisma.sql`AND o."guestId" = ${guestId}` : Prisma.empty;
  const rows = await db.$queryRaw<{ giftId: string; purchased: number; reserved: number }[]>`
    SELECT oi."giftId" AS "giftId",
      COALESCE(SUM(oi.quantity) FILTER (WHERE o.status = 'PURCHASED'), 0)::int AS purchased,
      COALESCE(SUM(oi.quantity) FILTER (
        WHERE o.status = 'AWAITING_PAYMENT_CONFIRMATION'
           OR (o.status = 'RESERVED' AND o."reservationExpiresAt" > ${now})
      ), 0)::int AS reserved
    FROM "OrderItem" oi
    JOIN "Order" o ON o.id = oi."orderId"
    WHERE o.status IN ('PURCHASED', 'AWAITING_PAYMENT_CONFIRMATION', 'RESERVED') ${giftFilter} ${guestFilter}
    GROUP BY oi."giftId"`;
  return new Map(rows.map((r) => [r.giftId, { purchased: r.purchased, reserved: r.reserved }]));
}
