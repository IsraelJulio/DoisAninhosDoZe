import { describe, expect, it } from "vitest";
import { centsToDecimalString, formatBRL, parseBRLToCents, sumCents } from "./money";

describe("formatBRL", () => {
  it("formata centavos em reais", () => {
    expect(formatBRL(3590)).toBe("R$ 35,90");
    expect(formatBRL(14990)).toBe("R$ 149,90");
    expect(formatBRL(123456)).toBe("R$ 1.234,56");
    expect(formatBRL(0)).toBe("R$ 0,00");
  });
  it("rejeita valores não inteiros", () => {
    expect(() => formatBRL(35.9)).toThrow();
  });
});

describe("parseBRLToCents", () => {
  it.each([
    ["35,90", 3590],
    ["R$ 35,90", 3590],
    ["1.234,56", 123456],
    ["149.90", 14990],
    ["149", 14900],
    ["1.000", 100000],
    ["0,5", 50],
  ])("%s -> %i", (input, cents) => {
    expect(parseBRLToCents(input)).toBe(cents);
  });
  it.each(["", "abc", "12,345", "-5", "1,2,3"])("rejeita %s", (input) => {
    expect(parseBRLToCents(input)).toBeNull();
  });
  it("não sofre erro de ponto flutuante", () => {
    expect(parseBRLToCents("0,29")).toBe(29);
    expect(parseBRLToCents("1,15")).toBe(115);
  });
});

describe("helpers", () => {
  it("centsToDecimalString", () => {
    expect(centsToDecimalString(23980)).toBe("239.80");
    expect(centsToDecimalString(7)).toBe("0.07");
  });
  it("sumCents", () => {
    expect(sumCents([14990, 8990, 12990])).toBe(36970);
  });
});
