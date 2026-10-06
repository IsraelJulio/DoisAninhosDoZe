// Sem "server-only" de propósito: também é usado pelo proxy.ts (roda no servidor, runtime Node).
// Nunca importe este arquivo em Client Components.

const DEV_SESSION_SECRET = "dev-only-insecure-session-secret-change-me-0123456789";

/** Segredo base das sessões (convidado e admin usam chaves derivadas distintas). */
export function getSessionSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET?.trim();
  const production = process.env.NODE_ENV === "production";
  if (secret) {
    if (production && secret.length < 32) {
      throw new Error("ADMIN_SESSION_SECRET deve ter pelo menos 32 caracteres em produção.");
    }
    return secret;
  }
  if (production) throw new Error("ADMIN_SESSION_SECRET é obrigatória em produção.");
  return DEV_SESSION_SECRET;
}
