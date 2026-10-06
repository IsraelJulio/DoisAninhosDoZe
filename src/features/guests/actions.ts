"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { fieldErrorsFromZod, type ActionState } from "@/lib/action-state";
import { safeNextPath } from "@/lib/safe-redirect";
import { getDb } from "@/server/db";
import { enforceRateLimit, RateLimitError } from "@/server/rate-limit";
import { getGuestIdFromSession, setGuestSession } from "@/server/session/guest-session";
import { guestNameSchema, phoneSchema } from "./guest-schema";
import { identifyGuestByPhone, updateGuestName } from "./guest-service";

const identifySchema = z.object({ phone: phoneSchema, next: z.string().optional() });

export async function identifyGuestAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = identifySchema.safeParse({ phone: formData.get("phone"), next: formData.get("next") ?? undefined });
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error.issues) };

  try {
    await enforceRateLimit("identify", 20, 10 * 60_000);
  } catch (error) {
    if (error instanceof RateLimitError) return { error: error.message };
    throw error;
  }

  const { guest } = await identifyGuestByPhone(getDb(), parsed.data.phone);
  await setGuestSession(guest.id);

  const next = safeNextPath(parsed.data.next, "/presenca");
  // O formulário de presença já pede o nome; nos demais fluxos pedimos aqui (passo 2).
  if (!guest.name && !next.startsWith("/presenca")) {
    redirect(`/entrar?etapa=nome&next=${encodeURIComponent(next)}`);
  }
  redirect(next);
}

const nameSchema = z.object({ name: guestNameSchema, next: z.string().optional() });

export async function saveGuestNameAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const guestId = await getGuestIdFromSession();
  if (!guestId) redirect("/entrar");

  const parsed = nameSchema.safeParse({ name: formData.get("name"), next: formData.get("next") ?? undefined });
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error.issues) };

  await updateGuestName(getDb(), guestId, parsed.data.name);
  redirect(safeNextPath(parsed.data.next, "/presentes"));
}
