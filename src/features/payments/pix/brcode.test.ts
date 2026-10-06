import { describe, expect, it } from "vitest";
import {
  buildStaticPixPayload,
  isValidPixCrc,
  normalizePixKey,
  parseEmv,
  PixPayloadError,
  sanitizePixText,
} from "./brcode";
import { crc16Ccitt } from "./crc16";

describe("crc16Ccitt", () => {
  it("bate com o valor de verificação padrão do CRC-16/CCITT-FALSE", () => {
    expect(crc16Ccitt("123456789")).toBe("29B1");
  });

  it("bate com o exemplo oficial do manual do BCB", () => {
    const example =
      "00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***6304";
    expect(crc16Ccitt(example)).toBe("1D3D");
  });
});

describe("buildStaticPixPayload", () => {
  const base = {
    key: "123e4567-e12b-12d1-a456-426655440000",
    receiverName: "Fulano de Tal",
    receiverCity: "Sarzedo",
    amountInCents: 23980,
    txid: "JOSE2ABC123",
  };

  it("gera campos EMV corretos e CRC válido", () => {
    const payload = buildStaticPixPayload(base);
    expect(isValidPixCrc(payload)).toBe(true);
    const f = parseEmv(payload);
    expect(f["00"]).toBe("01");
    expect(f["01"]).toBe("11");
    expect(f["52"]).toBe("0000");
    expect(f["53"]).toBe("986");
    expect(f["54"]).toBe("239.80");
    expect(f["58"]).toBe("BR");
    expect(f["59"]).toBe("Fulano de Tal");
    expect(f["60"]).toBe("Sarzedo");
    const merchant = parseEmv(f["26"]!);
    expect(merchant["00"]).toBe("br.gov.bcb.pix");
    expect(merchant["01"]).toBe(base.key);
    expect(parseEmv(f["62"]!)["05"]).toBe("JOSE2ABC123");
  });

  it("formata valores em centavos sem float", () => {
    expect(parseEmv(buildStaticPixPayload({ ...base, amountInCents: 3590 }))["54"]).toBe("35.90");
    expect(parseEmv(buildStaticPixPayload({ ...base, amountInCents: 5 }))["54"]).toBe("0.05");
    expect(parseEmv(buildStaticPixPayload({ ...base, amountInCents: 100000 }))["54"]).toBe("1000.00");
  });

  it("remove acentos e limita nome (25) e cidade (15)", () => {
    const payload = buildStaticPixPayload({
      ...base,
      receiverName: "José Antônio da Conceição Filho",
      receiverCity: "São José dos Campos do Sul",
    });
    const f = parseEmv(payload);
    expect(f["59"]).toBe("Jose Antonio da Conceicao");
    expect(f["60"]).toBe("Sao Jose dos Ca");
    expect(isValidPixCrc(payload)).toBe(true);
  });

  it("inclui descrição limitada para caber no campo 26", () => {
    const payload = buildStaticPixPayload({ ...base, description: "Presente José ".repeat(10) });
    const f = parseEmv(payload);
    expect(f["26"]!.length).toBeLessThanOrEqual(99);
    expect(parseEmv(f["26"]!)["02"]).toMatch(/^Presente Jose/);
  });

  it("rejeita entradas inválidas", () => {
    expect(() => buildStaticPixPayload({ ...base, amountInCents: 0 })).toThrow(PixPayloadError);
    expect(() => buildStaticPixPayload({ ...base, amountInCents: 10.5 })).toThrow(PixPayloadError);
    expect(() => buildStaticPixPayload({ ...base, txid: "com-hifen" })).toThrow(PixPayloadError);
    expect(() => buildStaticPixPayload({ ...base, txid: "A".repeat(26) })).toThrow(PixPayloadError);
    expect(() => buildStaticPixPayload({ ...base, key: "chave qualquer" })).toThrow(PixPayloadError);
  });

  it("detecta payload adulterado pelo CRC", () => {
    const payload = buildStaticPixPayload(base);
    expect(isValidPixCrc(payload.replace("239.80", "139.80"))).toBe(false);
  });
});

describe("normalizePixKey", () => {
  it("aceita os tipos de chave válidos", () => {
    expect(normalizePixKey("Pessoa@Email.com")).toBe("pessoa@email.com");
    expect(normalizePixKey("+5531999998888")).toBe("+5531999998888");
    expect(normalizePixKey("123.456.789-09")).toBe("12345678909");
    expect(normalizePixKey("12.345.678/0001-95")).toBe("12345678000195");
  });
});

describe("sanitizePixText", () => {
  it("remove caracteres não seguros", () => {
    expect(sanitizePixText("Ação & Cia!", 25)).toBe("Acao Cia");
  });
});
