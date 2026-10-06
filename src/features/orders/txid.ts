import { randomBytes } from "node:crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem 0/O/1/I para facilitar conferência no extrato

/** txid Pix único por pedido: "JOSE" + 12 caracteres (16 no total; limite do BR Code é 25). */
export function generatePixTxid(): string {
  const bytes = randomBytes(12);
  let suffix = "";
  for (const byte of bytes) suffix += ALPHABET[byte % ALPHABET.length];
  return `JOSE${suffix}`;
}
