import { describe, expect, it } from "vitest";
import { computeGiftAvailability } from "./gift-availability";

describe("computeGiftAvailability", () => {
  it("disponível até o máximo por convidado quando ele não tem pedido do presente", () => {
    expect(computeGiftAvailability({ stockQuantity: 3, active: true })).toEqual({ available: 3, status: "AVAILABLE" });
  });

  it("reservado quando o convidado já tem o presente numa reserva", () => {
    expect(computeGiftAvailability({ stockQuantity: 2, active: true }, { purchased: 0, reserved: 1 })).toEqual({
      available: 0,
      status: "RESERVED",
    });
  });

  it("presenteado quando o convidado já pagou o presente", () => {
    expect(computeGiftAvailability({ stockQuantity: 1, active: true }, { purchased: 1, reserved: 0 })).toEqual({
      available: 0,
      status: "PURCHASED",
    });
  });

  it("inativo nunca fica disponível", () => {
    expect(computeGiftAvailability({ stockQuantity: 5, active: false }).status).toBe("INACTIVE");
  });

  it("quantidade zero deixa o presente indisponível", () => {
    expect(computeGiftAvailability({ stockQuantity: 0, active: true })).toEqual({ available: 0, status: "INACTIVE" });
  });
});
