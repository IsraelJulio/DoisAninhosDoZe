import "server-only";
import type { Db } from "./db";

const LIMIT = 5;
const WINDOW_MS = 15 * 60_000;
const BLOCK_MS = 15 * 60_000;
const RETENTION_MS = 24 * 60 * 60_000;

export function normalizeAdminUsername(username: string): string {
  return username.trim().toLocaleLowerCase("pt-BR");
}

export async function recordAdminLoginResult(db: Db, username: string, ip: string, credentialsValid: boolean, now = new Date()) {
  const normalized = normalizeAdminUsername(username);
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`admin-login:${normalized}:${ip}`}, 0))`;
    await tx.adminLoginAttempt.deleteMany({ where: { updatedAt: { lt: new Date(now.getTime() - RETENTION_MS) } } });
    const existing = await tx.adminLoginAttempt.findUnique({ where: { username_ip: { username: normalized, ip } } });
    if (credentialsValid) {
      if (existing) await tx.adminLoginAttempt.delete({ where: { id: existing.id } });
      return { allowed: true };
    }
    if (existing?.blockedUntil && existing.blockedUntil > now) return { allowed: false, blockedUntil: existing.blockedUntil };
    const inWindow = Boolean(existing && now.getTime() - existing.windowStartedAt.getTime() < WINDOW_MS);
    const failureCount = inWindow ? existing!.failureCount + 1 : 1;
    const blockedUntil = failureCount >= LIMIT ? new Date(now.getTime() + BLOCK_MS) : null;
    await tx.adminLoginAttempt.upsert({
      where: { username_ip: { username: normalized, ip } },
      create: { username: normalized, ip, failureCount, windowStartedAt: now, blockedUntil },
      update: { failureCount, windowStartedAt: inWindow ? existing!.windowStartedAt : now, blockedUntil },
    });
    return blockedUntil ? { allowed: false, blockedUntil } : { allowed: true };
  });
}
