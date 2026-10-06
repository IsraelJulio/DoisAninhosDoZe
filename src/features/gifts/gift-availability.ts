// Regras puras de disponibilidade de presentes (sem acesso a banco — fáceis de testar).

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

export function computeGiftAvailability(
  gift: { stockQuantity: number; active: boolean },
  holds: GiftHolds = { purchased: 0, reserved: 0 },
): GiftAvailability {
  const available = Math.max(0, gift.stockQuantity - holds.purchased - holds.reserved);
  if (!gift.active) return { available: 0, status: "INACTIVE" };
  if (available > 0) return { available, status: "AVAILABLE" };
  if (holds.purchased >= gift.stockQuantity) return { available: 0, status: "PURCHASED" };
  return { available: 0, status: "RESERVED" };
}

export const GIFT_STATUS_LABEL: Record<GiftStatus, string> = {
  AVAILABLE: "Disponível",
  RESERVED: "Reservado",
  PURCHASED: "Presenteado",
  INACTIVE: "Indisponível",
};
