import "server-only";
import { headers } from "next/headers";

// Rate limiting básico em memória (janela deslizante).
// Limitação conhecida: em ambiente serverless (Vercel) cada instância tem sua própria memória,
// então o limite é por instância. Suficiente para inibir abuso casual em um site de festa;
// para algo mais forte, trocar por um store compartilhado (ex.: tabela no Postgres ou Redis).

const buckets = new Map<string, number[]>();
const MAX_KEYS = 10_000;

export function checkRateLimit(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return false;
  }
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > MAX_KEYS) {
    const oldest = buckets.keys().next().value;
    if (oldest) buckets.delete(oldest);
  }
  return true;
}

export async function getClientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

export class RateLimitError extends Error {
  constructor() {
    super("Muitas tentativas. Aguarde um pouquinho e tente novamente.");
  }
}

/** Lança RateLimitError quando o IP excede o limite para a operação. */
export async function enforceRateLimit(operation: string, limit: number, windowMs: number): Promise<void> {
  const ip = await getClientIp();
  if (!checkRateLimit(`${operation}:${ip}`, limit, windowMs)) throw new RateLimitError();
}

export function resetRateLimits(): void {
  buckets.clear();
}
