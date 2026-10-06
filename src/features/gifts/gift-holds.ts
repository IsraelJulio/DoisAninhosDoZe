import { Prisma } from "@/generated/prisma/client";
import type { Db, Tx } from "@/server/db";
import type { GiftHolds } from "./gift-availability";

/**
 * Soma, por presente, as quantidades comprometidas em pedidos:
 *  - purchased: pedidos PURCHASED
 *  - reserved: AWAITING_PAYMENT_CONFIRMATION (não expira) + RESERVED ainda dentro do prazo
 * Reservas vencidas deixam de contar imediatamente (expiração "preguiçosa", sem cron).
 */
export async function getGiftHolds(db: Db | Tx, now: Date, giftIds?: string[]): Promise<Map<string, GiftHolds>> {
  const filter = giftIds ? Prisma.sql`AND oi."giftId" = ANY(${giftIds}::text[])` : Prisma.empty;
  const rows = await db.$queryRaw<{ giftId: string; purchased: number; reserved: number }[]>`
    SELECT oi."giftId" AS "giftId",
      COALESCE(SUM(oi.quantity) FILTER (WHERE o.status = 'PURCHASED'), 0)::int AS purchased,
      COALESCE(SUM(oi.quantity) FILTER (
        WHERE o.status = 'AWAITING_PAYMENT_CONFIRMATION'
           OR (o.status = 'RESERVED' AND o."reservationExpiresAt" > ${now})
      ), 0)::int AS reserved
    FROM "OrderItem" oi
    JOIN "Order" o ON o.id = oi."orderId"
    WHERE o.status IN ('PURCHASED', 'AWAITING_PAYMENT_CONFIRMATION', 'RESERVED') ${filter}
    GROUP BY oi."giftId"`;
  return new Map(rows.map((r) => [r.giftId, { purchased: r.purchased, reserved: r.reserved }]));
}
