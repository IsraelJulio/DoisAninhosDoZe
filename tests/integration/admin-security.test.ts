import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { recordAdminLoginResult } from "@/server/admin-login-rate-limit";
import { createTestDb, hasTestDb, resetDb } from "./helpers";

const describeDb = hasTestDb ? describe : describe.skip;

describeDb("segurança administrativa persistente", () => {
  const db = hasTestDb ? createTestDb() : null!;

  beforeEach(async () => resetDb(db));
  afterAll(async () => db.$disconnect());

  it("bloqueia no quinto erro por 15 minutos e persiste o bloqueio", async () => {
    const now = new Date("2026-10-06T20:00:00Z");
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      await expect(recordAdminLoginResult(db, " Admin ", "203.0.113.10", false, now)).resolves.toMatchObject({ allowed: true });
    }
    const fifth = await recordAdminLoginResult(db, "admin", "203.0.113.10", false, now);
    expect(fifth.allowed).toBe(false);
    expect(fifth.blockedUntil).toEqual(new Date(now.getTime() + 15 * 60_000));
    await expect(recordAdminLoginResult(db, "ADMIN", "203.0.113.10", false, new Date(now.getTime() + 60_000))).resolves.toMatchObject({ allowed: false });
  });

  it("login correto limpa as tentativas do mesmo usuário e IP", async () => {
    const now = new Date("2026-10-06T20:00:00Z");
    await recordAdminLoginResult(db, "admin", "203.0.113.11", false, now);
    await expect(recordAdminLoginResult(db, "ADMIN", "203.0.113.11", true, now)).resolves.toEqual({ allowed: true });
    expect(await db.adminLoginAttempt.count()).toBe(0);
  });
});
