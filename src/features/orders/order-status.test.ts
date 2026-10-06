import { describe, expect, it } from "vitest";
import { canTransition, effectiveOrderStatus, isReservationActive } from "./order-status";

describe("máquina de estados do pedido", () => {
  it("permite o fluxo feliz", () => {
    expect(canTransition("RESERVED", "AWAITING_PAYMENT_CONFIRMATION")).toBe(true);
    expect(canTransition("AWAITING_PAYMENT_CONFIRMATION", "PURCHASED")).toBe(true);
  });

  it("aguardando confirmação não expira automaticamente", () => {
    expect(canTransition("AWAITING_PAYMENT_CONFIRMATION", "EXPIRED")).toBe(false);
  });

  it("estados finais não mudam", () => {
    for (const to of ["RESERVED", "AWAITING_PAYMENT_CONFIRMATION", "PURCHASED", "CANCELLED"] as const) {
      expect(canTransition("PURCHASED", to)).toBe(false);
      expect(canTransition("CANCELLED", to)).toBe(false);
      expect(canTransition("EXPIRED", to)).toBe(false);
    }
  });

  it("admin pode rejeitar um pagamento informado", () => {
    expect(canTransition("AWAITING_PAYMENT_CONFIRMATION", "CANCELLED")).toBe(true);
  });
});

describe("expiração", () => {
  const now = new Date("2026-11-01T12:00:00Z");
  const reserved = (minutesFromNow: number) => ({
    status: "RESERVED" as const,
    reservationExpiresAt: new Date(now.getTime() + minutesFromNow * 60_000),
  });

  it("reserva dentro do prazo está ativa", () => {
    expect(isReservationActive(reserved(5), now)).toBe(true);
    expect(effectiveOrderStatus(reserved(5), now)).toBe("RESERVED");
  });

  it("reserva vencida é tratada como expirada", () => {
    expect(isReservationActive(reserved(-1), now)).toBe(false);
    expect(effectiveOrderStatus(reserved(0), now)).toBe("EXPIRED");
  });

  it("pedido aguardando confirmação continua aguardando após o prazo", () => {
    expect(
      effectiveOrderStatus({ status: "AWAITING_PAYMENT_CONFIRMATION", reservationExpiresAt: new Date(0) }, now),
    ).toBe("AWAITING_PAYMENT_CONFIRMATION");
  });
});
