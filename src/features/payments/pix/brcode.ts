import { centsToDecimalString } from "@/lib/money";
import { crc16Ccitt } from "./crc16";

// Gerador de BR Code (EMV® QRCPS-MPM) para Pix estático, conforme o Manual de Padrões
// para Iniciação do Pix do Banco Central.

export class PixPayloadError extends Error {}

export interface StaticPixInput {
  key: string;
  receiverName: string;
  receiverCity: string;
  amountInCents: number;
  /** Identificador da transação: 1–25 caracteres alfanuméricos. */
  txid: string;
  description?: string;
}

const GUI = "br.gov.bcb.pix";

function tlv(id: string, value: string): string {
  if (value.length > 99) throw new PixPayloadError(`Campo ${id} excede 99 caracteres`);
  return `${id}${String(value.length).padStart(2, "0")}${value}`;
}

/** Remove acentos e caracteres fora do conjunto seguro aceito pelos bancos. */
export function sanitizePixText(value: string, maxLength: number): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 .-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength)
    .trim();
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EVP = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Valida o formato de uma chave Pix (e-mail, telefone +55, CPF, CNPJ ou aleatória). */
export function normalizePixKey(rawKey: string): string {
  const key = rawKey.trim();
  // Comprimentos EMV contam bytes; chaves Pix válidas são sempre ASCII.
  if (!/^[\x21-\x7e]+$/.test(key.replace(/[\s]/g, ""))) {
    throw new PixPayloadError("PIX_KEY inválida: contém caracteres não permitidos");
  }
  if (EMAIL.test(key)) return key.toLowerCase();
  if (EVP.test(key)) return key.toLowerCase();
  if (/^\+55\d{10,11}$/.test(key)) return key;
  const digits = key.replace(/[.\-/\s]/g, "");
  if (/^\d{11}$/.test(digits) || /^\d{14}$/.test(digits)) return digits; // CPF / CNPJ
  throw new PixPayloadError(
    "PIX_KEY inválida: use e-mail, telefone no formato +55DDDNUMERO, CPF, CNPJ ou chave aleatória",
  );
}

export function buildStaticPixPayload(input: StaticPixInput): string {
  if (!Number.isInteger(input.amountInCents) || input.amountInCents <= 0) {
    throw new PixPayloadError("Valor do Pix deve ser um inteiro positivo em centavos");
  }
  if (!/^[A-Za-z0-9]{1,25}$/.test(input.txid)) {
    throw new PixPayloadError("txid deve ter de 1 a 25 caracteres alfanuméricos");
  }
  const key = normalizePixKey(input.key);
  const name = sanitizePixText(input.receiverName, 25);
  const city = sanitizePixText(input.receiverCity, 15);
  if (!name) throw new PixPayloadError("PIX_RECEIVER_NAME inválido");
  if (!city) throw new PixPayloadError("PIX_RECEIVER_CITY inválido");

  const guiAndKey = tlv("00", GUI) + tlv("01", key);
  // O campo 26 inteiro tem no máximo 99 caracteres; a descrição usa o espaço que sobrar.
  const room = 99 - guiAndKey.length - 4;
  const description = input.description ? sanitizePixText(input.description, Math.max(0, room)) : "";
  const merchantAccount = guiAndKey + (description ? tlv("02", description) : "");

  const payload =
    tlv("00", "01") + // Payload Format Indicator
    tlv("01", "11") + // Point of Initiation Method: 11 = estático
    tlv("26", merchantAccount) +
    tlv("52", "0000") + // Merchant Category Code
    tlv("53", "986") + // BRL
    tlv("54", centsToDecimalString(input.amountInCents)) +
    tlv("58", "BR") +
    tlv("59", name) +
    tlv("60", city) +
    tlv("62", tlv("05", input.txid)) +
    "6304";

  return payload + crc16Ccitt(payload);
}

/** Lê um payload EMV em pares id→valor (nível superior). Útil para testes e diagnóstico. */
export function parseEmv(payload: string): Record<string, string> {
  const fields: Record<string, string> = {};
  let i = 0;
  while (i < payload.length) {
    const id = payload.slice(i, i + 2);
    const len = Number(payload.slice(i + 2, i + 4));
    if (!Number.isFinite(len)) throw new PixPayloadError("Payload EMV malformado");
    fields[id] = payload.slice(i + 4, i + 4 + len);
    i += 4 + len;
  }
  return fields;
}

export function isValidPixCrc(payload: string): boolean {
  if (payload.length < 8) return false;
  const body = payload.slice(0, -4);
  return body.endsWith("6304") && crc16Ccitt(body) === payload.slice(-4).toUpperCase();
}
