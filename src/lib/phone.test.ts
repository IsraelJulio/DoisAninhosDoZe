import { describe, expect, it } from "vitest";
import { formatBrazilianPhone, maskBrazilianPhone, maskPhoneInput, normalizeBrazilianPhone } from "./phone";

describe("normalizeBrazilianPhone", () => {
  it.each([
    ["(31) 99999-8888", "+5531999998888"],
    ["31999998888", "+5531999998888"],
    ["+55 31 99999-8888", "+5531999998888"],
    ["5531999998888", "+5531999998888"],
    ["031999998888", "+5531999998888"],
    ["(31) 3333-4444", "+553133334444"],
  ])("%s -> %s", (input, expected) => {
    expect(normalizeBrazilianPhone(input)).toBe(expected);
  });

  it.each(["", "123", "(00) 99999-8888", "(31) 89999-8888", "(31) 1333-4444", "319999988881234"])(
    "rejeita %s",
    (input) => {
      expect(normalizeBrazilianPhone(input)).toBeNull();
    },
  );
});

describe("formatação", () => {
  it("formata E.164 para exibição", () => {
    expect(formatBrazilianPhone("+5531999998888")).toBe("(31) 99999-8888");
    expect(formatBrazilianPhone("+553133334444")).toBe("(31) 3333-4444");
  });
  it("mascara para o admin", () => {
    expect(maskBrazilianPhone("+5531999998888")).toBe("(31) •••••-8888");
  });
  it("colar número do WhatsApp com +55 no campo (que já mostra +55)", () => {
    expect(maskPhoneInput("+55 31 99999-8888")).toBe("(31) 99999-8888");
    expect(maskPhoneInput("+55 (31) 99999-8888")).toBe("(31) 99999-8888");
    expect(maskPhoneInput("‪+55 31 99999‑8888‬")).toBe("(31) 99999-8888");
    expect(maskPhoneInput("031 99999 8888")).toBe("(31) 99999-8888");
  });
  it("normaliza colagens do WhatsApp", () => {
    expect(normalizeBrazilianPhone("‪+55 31 99999‑8888‬")).toBe("+5531999998888");
    expect(normalizeBrazilianPhone("  31 9 9999 8888 ")).toBe("+5531999998888");
  });
  it("máscara progressiva do input", () => {
    expect(maskPhoneInput("3")).toBe("(3");
    expect(maskPhoneInput("3199")).toBe("(31) 99");
    expect(maskPhoneInput("31999998888")).toBe("(31) 99999-8888");
    expect(maskPhoneInput("3133334444")).toBe("(31) 3333-4444");
  });
});
