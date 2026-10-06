import { afterEach, describe, expect, it, vi } from "vitest";
import { isAdminToken } from "./admin-token";
import { createSignedToken, safeEqual, verifySignedToken } from "./signing";

describe("tokens assinados", () => {
  afterEach(() => vi.useRealTimers());

  it("ida e volta", () => {
    const token = createSignedToken({ gid: "abc" }, "guest-session", 60);
    expect(verifySignedToken<{ gid: string }>(token, "guest-session")?.gid).toBe("abc");
  });

  it("rejeita token adulterado", () => {
    const token = createSignedToken({ gid: "abc" }, "guest-session", 60);
    const [, sig] = token.split(".");
    const forged = `${Buffer.from(JSON.stringify({ gid: "outro", exp: 9999999999 })).toString("base64url")}.${sig}`;
    expect(verifySignedToken(forged, "guest-session")).toBeNull();
    expect(verifySignedToken("lixo", "guest-session")).toBeNull();
    expect(verifySignedToken(undefined, "guest-session")).toBeNull();
  });

  it("token de convidado não vale como admin", () => {
    const guestToken = createSignedToken({ sub: "admin" }, "guest-session", 60);
    expect(isAdminToken(guestToken)).toBe(false);
    expect(isAdminToken(createSignedToken({ sub: "admin", sid: "session-1" }, "admin-session", 60))).toBe(true);
  });

  it("expira", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-01T00:00:00Z"));
    const token = createSignedToken({ gid: "abc" }, "guest-session", 60);
    vi.setSystemTime(new Date("2026-11-01T00:02:00Z"));
    expect(verifySignedToken(token, "guest-session")).toBeNull();
  });

  it("safeEqual", () => {
    expect(safeEqual("senha", "senha")).toBe(true);
    expect(safeEqual("senha", "senhA")).toBe(false);
    expect(safeEqual("a", "aaaa")).toBe(false);
  });
});
