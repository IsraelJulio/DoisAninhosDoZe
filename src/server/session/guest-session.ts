import "server-only";
import { cookies } from "next/headers";
import { isProduction } from "@/lib/env";
import { createSignedToken, verifySignedToken } from "./signing";

/**
 * Sessão do convidado.
 *
 * ATENÇÃO: isto NÃO é autenticação forte. O telefone é apenas uma identificação simples
 * (não há verificação por SMS nesta versão). Quem souber o número de alguém consegue se
 * identificar como essa pessoa. O cookie assinado só garante que o navegador não forje um
 * guestId arbitrário — por isso nada sensível (dados financeiros, etc.) fica atrás desta sessão.
 */
const COOKIE = "jose_guest";
const PURPOSE = "guest-session";
const TTL_SECONDS = 60 * 60 * 24 * 180; // 180 dias: o convidado volta pelo link do WhatsApp

interface GuestTokenPayload {
  gid: string;
}

export async function setGuestSession(guestId: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE, createSignedToken<GuestTokenPayload>({ gid: guestId }, PURPOSE, TTL_SECONDS), {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: TTL_SECONDS,
  });
}

export async function getGuestIdFromSession(): Promise<string | null> {
  const store = await cookies();
  return verifySignedToken<GuestTokenPayload>(store.get(COOKIE)?.value, PURPOSE)?.gid ?? null;
}

export async function clearGuestSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}
