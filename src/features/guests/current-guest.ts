import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getDb } from "@/server/db";
import { getGuestIdFromSession } from "@/server/session/guest-session";

/** Convidado da sessão atual (ou null). Memoizado por request. */
export const getCurrentGuest = cache(async () => {
  const guestId = await getGuestIdFromSession();
  if (!guestId) return null;
  return getDb().guest.findUnique({ where: { id: guestId }, include: { rsvp: true } });
});

/**
 * Garante um convidado identificado; senão manda para /entrar e volta depois.
 * `requireName`: também exige o nome (necessário para presentear).
 */
export async function requireGuest(nextPath: string, { requireName = false } = {}) {
  const guest = await getCurrentGuest();
  const next = encodeURIComponent(nextPath);
  if (!guest) redirect(`/entrar?next=${next}`);
  if (requireName && !guest.name) redirect(`/entrar?etapa=nome&next=${next}`);
  return guest;
}
