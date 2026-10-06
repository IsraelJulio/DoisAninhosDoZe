import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAdminCredentials, isProduction } from "@/lib/env";
import { getDb } from "@/server/db";
import { ADMIN_COOKIE, ADMIN_PURPOSE as PURPOSE, isAdminToken, parseAdminToken } from "./admin-token";
import { createSignedToken, safeEqual } from "./signing";

export { ADMIN_COOKIE, isAdminToken };
const TTL_SECONDS = 60 * 60 * 6;

function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function verifyAdminCredentials(username: string, password: string): boolean {
  const credentials = getAdminCredentials();
  if (!credentials) return false; // sem credenciais configuradas, ninguém entra
  // avalia as duas comparações sempre, para não vazar qual campo errou pelo tempo de resposta
  const userOk = safeEqual(username, credentials.username);
  const passOk = safeEqual(password, credentials.password);
  return userOk && passOk;
}

export async function setAdminSession(): Promise<void> {
  const sid = randomUUID();
  const token = createSignedToken({ sub: "admin" as const, sid }, PURPOSE, TTL_SECONDS);
  await getDb().adminSession.create({
    data: { id: sid, tokenHash: tokenHash(token), expiresAt: new Date(Date.now() + TTL_SECONDS * 1000) },
  });
  const store = await cookies();
  store.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: TTL_SECONDS,
  });
}

export async function clearAdminSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (token) {
    await getDb().adminSession.updateMany({ where: { tokenHash: tokenHash(token), revokedAt: null }, data: { revokedAt: new Date() } });
  }
  store.delete(ADMIN_COOKIE);
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  const payload = parseAdminToken(token);
  if (!payload || !token) return false;
  const session = await getDb().adminSession.findUnique({ where: { tokenHash: tokenHash(token) } });
  return Boolean(session && session.id === payload.sid && !session.revokedAt && session.expiresAt > new Date());
}

/** Use no início de toda página/ação administrativa (defesa em profundidade além do proxy). */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");
}
