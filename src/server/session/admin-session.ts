import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAdminCredentials, isProduction } from "@/lib/env";
import { createSignedToken, safeEqual, verifySignedToken } from "./signing";

export const ADMIN_COOKIE = "jose_admin";
const PURPOSE = "admin-session";
const TTL_SECONDS = 60 * 60 * 12; // 12 horas

interface AdminTokenPayload {
  sub: "admin";
}

export function verifyAdminCredentials(username: string, password: string): boolean {
  const credentials = getAdminCredentials();
  if (!credentials) return false; // sem credenciais configuradas, ninguém entra
  // avalia as duas comparações sempre, para não vazar qual campo errou pelo tempo de resposta
  const userOk = safeEqual(username, credentials.username);
  const passOk = safeEqual(password, credentials.password);
  return userOk && passOk;
}

export function isAdminToken(token: string | undefined): boolean {
  return verifySignedToken<AdminTokenPayload>(token, PURPOSE)?.sub === "admin";
}

export async function setAdminSession(): Promise<void> {
  const store = await cookies();
  store.set(ADMIN_COOKIE, createSignedToken<AdminTokenPayload>({ sub: "admin" }, PURPOSE, TTL_SECONDS), {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: TTL_SECONDS,
  });
}

export async function clearAdminSession(): Promise<void> {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const store = await cookies();
  return isAdminToken(store.get(ADMIN_COOKIE)?.value);
}

/** Use no início de toda página/ação administrativa (defesa em profundidade além do proxy). */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");
}
