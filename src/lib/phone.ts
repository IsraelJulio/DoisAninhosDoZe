// Telefones são armazenados em E.164 (+55DDDNÚMERO) e exibidos no padrão brasileiro.

const VALID_DDDS = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35, 37, 38, 41, 42, 43,
  44, 45, 46, 47, 48, 49, 51, 53, 54, 55, 61, 62, 63, 64, 65, 66, 67, 68, 69, 71, 73, 74, 75, 77,
  79, 81, 82, 83, 84, 85, 86, 87, 88, 89, 91, 92, 93, 94, 95, 96, 97, 98, 99,
]);

/**
 * Normaliza um telefone brasileiro para E.164. Aceita com/sem +55, máscara, espaços.
 * Retorna null se não for um celular/fixo brasileiro válido.
 */
export function normalizeBrazilianPhone(input: string): string | null {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) {
    digits = digits.slice(2);
  }
  if (digits.startsWith("0")) digits = digits.slice(1); // 0 de discagem (ex.: 031...)
  if (digits.length !== 10 && digits.length !== 11) return null;

  const ddd = Number(digits.slice(0, 2));
  if (!VALID_DDDS.has(ddd)) return null;
  const local = digits.slice(2);
  if (local.length === 9 && !local.startsWith("9")) return null; // celular começa com 9
  if (local.length === 8 && !/^[2-5]/.test(local)) return null; // fixo começa com 2-5
  return `+55${digits}`;
}

/** +5531999999999 -> "(31) 99999-9999" */
export function formatBrazilianPhone(e164: string): string {
  const d = e164.replace(/^\+55/, "").replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return e164;
}

/** +5531999998888 -> "(31) •••••-8888" — usado no admin para não expor o número inteiro. */
export function maskBrazilianPhone(e164: string): string {
  const d = e164.replace(/^\+55/, "").replace(/\D/g, "");
  if (d.length < 10) return "•••";
  return `(${d.slice(0, 2)}) ${"•".repeat(d.length - 6)}-${d.slice(-4)}`;
}

/** Máscara progressiva para o input enquanto o usuário digita (sem o +55). */
export function maskPhoneInput(value: string): string {
  let digits = value.replace(/\D/g, "");
  // Colagem do WhatsApp ("+55 31 9…") ou com 0 de discagem: o campo já mostra o +55
  if (digits.length > 11 && digits.startsWith("55")) digits = digits.slice(2);
  if (digits.length > 11 && digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length === 12 && digits.startsWith("0")) digits = digits.slice(1);
  const d = digits.slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
