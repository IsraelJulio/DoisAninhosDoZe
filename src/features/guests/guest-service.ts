import type { Db } from "@/server/db";

/**
 * Identificação simples por telefone (NÃO é autenticação forte — ver guest-session.ts).
 * Telefone já deve chegar normalizado em E.164.
 */
export async function identifyGuestByPhone(db: Db, phoneE164: string) {
  const existing = await db.guest.findUnique({ where: { phone: phoneE164 } });
  if (existing) return { guest: existing, isNew: false };
  // upsert evita erro de unicidade se duas abas enviarem ao mesmo tempo
  const guest = await db.guest.upsert({ where: { phone: phoneE164 }, update: {}, create: { phone: phoneE164 } });
  return { guest, isNew: true };
}

export async function updateGuestName(db: Db, guestId: string, name: string) {
  return db.guest.update({ where: { id: guestId }, data: { name } });
}
