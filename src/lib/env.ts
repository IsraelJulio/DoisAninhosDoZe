import "server-only";

// Acesso centralizado às variáveis de ambiente do servidor. Nunca importe em Client Components.

export const isProduction = process.env.NODE_ENV === "production";

function read(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

export function getDatabaseUrl(): string {
  const url = read("DATABASE_URL");
  if (!url) throw new Error("DATABASE_URL não configurada. Veja .env.example.");
  return url;
}

const DEV_SESSION_SECRET = "dev-only-insecure-session-secret-change-me-0123456789";

/** Segredo base das sessões (convidado e admin usam chaves derivadas distintas). */
export function getSessionSecret(): string {
  const secret = read("ADMIN_SESSION_SECRET");
  if (secret) {
    if (isProduction && secret.length < 32) {
      throw new Error("ADMIN_SESSION_SECRET deve ter pelo menos 32 caracteres em produção.");
    }
    return secret;
  }
  if (isProduction) throw new Error("ADMIN_SESSION_SECRET é obrigatória em produção.");
  return DEV_SESSION_SECRET;
}

export function getAdminCredentials(): { username: string; password: string } | null {
  const username = read("ADMIN_USERNAME");
  const password = read("ADMIN_PASSWORD");
  if (!username || !password) return null;
  return { username, password };
}

export interface PixEnvConfig {
  key: string;
  receiverName: string;
  receiverCity: string;
  descriptionPrefix?: string;
}

/** Retorna null quando o Pix ainda não foi configurado (chave real nunca é inventada). */
export function getPixEnvConfig(): PixEnvConfig | null {
  const key = read("PIX_KEY");
  const receiverName = read("PIX_RECEIVER_NAME");
  const receiverCity = read("PIX_RECEIVER_CITY");
  if (!key || !receiverName || !receiverCity) return null;
  return { key, receiverName, receiverCity, descriptionPrefix: read("PIX_DESCRIPTION_PREFIX") };
}

export function getAppUrl(): string | undefined {
  return read("NEXT_PUBLIC_APP_URL");
}
