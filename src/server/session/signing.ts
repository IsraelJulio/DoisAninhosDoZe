import { createHmac, timingSafeEqual } from "node:crypto";
import { getSessionSecret } from "./secret";

// Tokens assinados com HMAC-SHA256: base64url(payload JSON).base64url(assinatura).
// Cada uso ("guest", "admin") deriva sua própria chave a partir do segredo base,
// então um token de convidado nunca é aceito como token de admin.

function deriveKey(purpose: string): Buffer {
  return createHmac("sha256", getSessionSecret()).update(`jose-2-anos:${purpose}`).digest();
}

function sign(data: string, purpose: string): string {
  return createHmac("sha256", deriveKey(purpose)).update(data).digest("base64url");
}

export function createSignedToken<T extends object>(payload: T, purpose: string, ttlSeconds: number): string {
  const body = { ...payload, exp: Math.floor(Date.now() / 1000) + ttlSeconds };
  const data = Buffer.from(JSON.stringify(body)).toString("base64url");
  return `${data}.${sign(data, purpose)}`;
}

export function verifySignedToken<T extends object>(token: string | undefined, purpose: string): T | null {
  if (!token) return null;
  const [data, signature] = token.split(".");
  if (!data || !signature) return null;
  const expected = Buffer.from(sign(data, purpose));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as T & { exp?: number };
    if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Comparação em tempo constante para strings (credenciais do admin). */
export function safeEqual(a: string, b: string): boolean {
  const ha = createHmac("sha256", "cmp").update(a).digest();
  const hb = createHmac("sha256", "cmp").update(b).digest();
  return timingSafeEqual(ha, hb);
}
