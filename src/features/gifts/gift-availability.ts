// Regras puras de disponibilidade de presentes (sem acesso a banco — fáceis de testar).
//
// A disponibilidade é POR CONVIDADO: vários convidados podem dar o mesmo presente. Quando um
// convidado tem o presente numa reserva ativa, aguardando confirmação ou já pago, o presente
// fica indisponível apenas para ele. `stockQuantity` é o máximo que cada convidado pode levar.

export type GiftStatus = "AVAILABLE" | "RESERVED" | "PURCHASED" | "INACTIVE";

export interface GiftHolds {
  /** Quantidade em pedidos PURCHASED. */
  purchased: number;
  /** Quantidade em reservas ativas (RESERVED não expirado) + AWAITING_PAYMENT_CONFIRMATION. */
  reserved: number;
}

export interface GiftAvailability {
  available: number;
  status: GiftStatus;
}

/** `holds` são os pedidos do PRÓPRIO convidado (sem convidado, nada bloqueia). */
export function computeGiftAvailability(
  gift: { stockQuantity: number; active: boolean },
  holds: GiftHolds = { purchased: 0, reserved: 0 },
): GiftAvailability {
  if (!gift.active || gift.stockQuantity <= 0) return { available: 0, status: "INACTIVE" };
  if (holds.purchased > 0) return { available: 0, status: "PURCHASED" };
  if (holds.reserved > 0) return { available: 0, status: "RESERVED" };
  return { available: gift.stockQuantity, status: "AVAILABLE" };
}

export const GIFT_STATUS_LABEL: Record<GiftStatus, string> = {
  AVAILABLE: "Disponível",
  RESERVED: "Reservado por você",
  PURCHASED: "Você presenteou",
  INACTIVE: "Indisponível",
};
