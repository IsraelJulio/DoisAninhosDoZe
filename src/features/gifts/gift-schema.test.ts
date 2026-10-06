import { describe, expect, it } from "vitest";
import { giftFormSchema } from "./gift-schema";

const base = { title: "Pista", price: "149,90", category: "Brinquedos", stockQuantity: "1", active: "on" };

describe("giftFormSchema", () => {
  it("converte preço em reais para centavos", () => {
    expect(giftFormSchema.parse(base)).toMatchObject({ price: 14990, active: true });
  });
  it("rejeita preço inválido ou zero", () => {
    expect(giftFormSchema.safeParse({ ...base, price: "abc" }).success).toBe(false);
    expect(giftFormSchema.safeParse({ ...base, price: "0" }).success).toBe(false);
  });
  it("aceita apenas URLs http(s) ou assets locais", () => {
    expect(giftFormSchema.safeParse({ ...base, imageUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(giftFormSchema.safeParse({ ...base, imageUrl: "ftp://x.com/a.png" }).success).toBe(false);
    expect(giftFormSchema.safeParse({ ...base, imageUrl: "https://cf.shopee.com.br/file/abc" }).success).toBe(true);
    expect(giftFormSchema.safeParse({ ...base, imageUrl: "/assets/placeholders/gift-placeholder.png" }).success).toBe(true);
  });
  it("checkbox desmarcado = inativo", () => {
    expect(giftFormSchema.parse({ ...base, active: undefined }).active).toBe(false);
  });
  it("estoque não negativo", () => {
    expect(giftFormSchema.safeParse({ ...base, stockQuantity: "-1" }).success).toBe(false);
  });
});
