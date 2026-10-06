import { describe, expect, it } from "vitest";
import { computeGiftAvailability } from "./gift-availability";

describe("computeGiftAvailability", () => {
  it("disponível quando sobra estoque", () => {
    expect(computeGiftAvailability({ stockQuantity: 3, active: true }, { purchased: 1, reserved: 1 })).toEqual({
      available: 1,
      status: "AVAILABLE",
    });
  });

  it("reservado quando o estoque restante está em reservas", () => {
    expect(computeGiftAvailability({ stockQuantity: 2, active: true }, { purchased: 1, reserved: 1 })).toEqual({
      available: 0,
      status: "RESERVED",
    });
  });

  it("presenteado quando tudo foi comprado", () => {
    expect(computeGiftAvailability({ stockQuantity: 1, active: true }, { purchased: 1, reserved: 0 })).toEqual({
      available: 0,
      status: "PURCHASED",
    });
  });

  it("inativo nunca fica disponível", () => {
    expect(computeGiftAvailability({ stockQuantity: 5, active: false }).status).toBe("INACTIVE");
  });

  it("nunca retorna disponibilidade negativa (estoque reduzido pelo admin)", () => {
    expect(computeGiftAvailability({ stockQuantity: 1, active: true }, { purchased: 2, reserved: 0 }).available).toBe(0);
  });
});
