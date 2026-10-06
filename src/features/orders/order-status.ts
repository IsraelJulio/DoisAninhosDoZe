import type { OrderStatus } from "@/generated/prisma/enums";

/**
 * Máquina de estados do pedido:
 *
 *   RESERVED ──(convidado: "Já fiz o pagamento")──▶ AWAITING_PAYMENT_CONFIRMATION ──(admin confirma)──▶ PURCHASED
 *      │  └──(30 min sem pagamento informado)──▶ EXPIRED
 *      └──(convidado/admin cancela)──▶ CANCELLED ◀──(admin rejeita)── AWAITING_PAYMENT_CONFIRMATION
 *
 * AWAITING_PAYMENT_CONFIRMATION nunca expira sozinho: só o admin decide.
 */
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  RESERVED: ["AWAITING_PAYMENT_CONFIRMATION", "EXPIRED", "CANCELLED", "PURCHASED"],
  AWAITING_PAYMENT_CONFIRMATION: ["PURCHASED", "CANCELLED"],
  PURCHASED: [],
  EXPIRED: [],
  CANCELLED: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

/** Uma reserva RESERVED só vale enquanto não passou do prazo. */
export function isReservationActive(order: { status: OrderStatus; reservationExpiresAt: Date }, now: Date): boolean {
  return order.status === "RESERVED" && order.reservationExpiresAt.getTime() > now.getTime();
}

/** Status efetivo considerando a expiração preguiçosa (sem depender de cron). */
export function effectiveOrderStatus(order: { status: OrderStatus; reservationExpiresAt: Date }, now: Date): OrderStatus {
  if (order.status === "RESERVED" && !isReservationActive(order, now)) return "EXPIRED";
  return order.status;
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  RESERVED: "Reservado",
  AWAITING_PAYMENT_CONFIRMATION: "Aguardando confirmação",
  PURCHASED: "Presenteado",
  EXPIRED: "Reserva expirada",
  CANCELLED: "Cancelado",
};
