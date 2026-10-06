import { verifySignedToken } from "./signing";

export const ADMIN_COOKIE = "jose_admin";
export const ADMIN_PURPOSE = "admin-session";

export interface AdminTokenPayload { sub: "admin"; sid: string }

export function parseAdminToken(token: string | undefined): AdminTokenPayload | null {
  const payload = verifySignedToken<AdminTokenPayload>(token, ADMIN_PURPOSE);
  return payload?.sub === "admin" && typeof payload.sid === "string" ? payload : null;
}

export function isAdminToken(token: string | undefined): boolean {
  return parseAdminToken(token) !== null;
}
