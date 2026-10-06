// Dinheiro é sempre representado em centavos inteiros. Nunca use float para valores.

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** 3590 -> "R$ 35,90" (com espaço normal, não NBSP, para facilitar testes e cópia). */
export function formatBRL(cents: number): string {
  if (!Number.isInteger(cents)) throw new Error("formatBRL espera centavos inteiros");
  return brl.format(cents / 100).replace(/ /g, " ");
}

/** "35,90" | "R$ 1.234,56" | "35.90" | "35" -> centavos. Retorna null se inválido. */
export function parseBRLToCents(input: string): number | null {
  const raw = input.replace(/R\$|\s/g, "").trim();
  if (!raw) return null;
  let normalized: string;
  if (raw.includes(",")) {
    // padrão brasileiro: pontos são milhar, vírgula é decimal
    normalized = raw.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(raw)) {
    normalized = raw.replace(/\./g, "");
  } else {
    normalized = raw;
  }
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const [intPart, decPart = ""] = normalized.split(".");
  const cents = Number(intPart) * 100 + Number(decPart.padEnd(2, "0"));
  return Number.isSafeInteger(cents) ? cents : null;
}

/** Centavos -> "35.90" (formato exigido pelo campo 54 do BR Code Pix). */
export function centsToDecimalString(cents: number): string {
  if (!Number.isInteger(cents) || cents < 0) throw new Error("valor inválido");
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
}

export function sumCents(values: number[]): number {
  return values.reduce((acc, v) => acc + v, 0);
}
