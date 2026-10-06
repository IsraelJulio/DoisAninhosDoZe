import { verifySignedToken } from "./signing";

export const ADMIN_COOKIE = "jose_admin";
export const ADMIN_PURPOSE = "admin-session";

export function isAdminToken(token: string | undefined): boolean {
  return verifySignedToken<{ sub: string }>(token, ADMIN_PURPOSE)?.sub === "admin";
}
