/** Aceita apenas caminhos internos (evita open redirect via ?next=). */
export function safeNextPath(next: unknown, fallback = "/"): string {
  if (typeof next !== "string") return fallback;
  // Qualquer caractere de controle ou espaço é recusado: navegadores removem TAB/LF de URLs,
  // então "/\t/evil.com" viraria "//evil.com" (redirect para outro domínio).
  if (/[\u0000- \u007f\\]/.test(next)) return fallback;
  if (!next.startsWith("/") || next.startsWith("//")) return fallback;
  return next;
}
