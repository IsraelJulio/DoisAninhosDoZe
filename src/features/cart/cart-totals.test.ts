import { describe, expect, it } from "vitest";
import { computeTotals } from "./cart-totals";

describe("computeTotals", () => {
  it("soma em centavos inteiros", () => {
    expect(
      computeTotals([
        { quantity: 1, unitPriceInCents: 14990 },
        { quantity: 1, unitPriceInCents: 8990 },
        { quantity: 1, unitPriceInCents: 12990 },
      ]),
    ).toEqual({ subtotalInCents: 36970, totalInCents: 36970, itemCount: 3 });
  });

  it("multiplica quantidades", () => {
    expect(computeTotals([{ quantity: 3, unitPriceInCents: 3590 }]).totalInCents).toBe(10770);
  });

  it("carrinho vazio soma zero", () => {
    expect(computeTotals([])).toEqual({ subtotalInCents: 0, totalInCents: 0, itemCount: 0 });
  });

  it("rejeita quantidades e preços inválidos", () => {
    expect(() => computeTotals([{ quantity: 0, unitPriceInCents: 100 }])).toThrow();
    expect(() => computeTotals([{ quantity: 1.5, unitPriceInCents: 100 }])).toThrow();
    expect(() => computeTotals([{ quantity: 1, unitPriceInCents: 10.5 }])).toThrow();
  });
});
