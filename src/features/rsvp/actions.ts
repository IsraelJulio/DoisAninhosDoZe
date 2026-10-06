"use server";

import { redirect } from "next/navigation";
import { fieldErrorsFromZod, type ActionState } from "@/lib/action-state";
import { getDb } from "@/server/db";
import { getGuestIdFromSession } from "@/server/session/guest-session";
import { rsvpSchema } from "./rsvp-schema";
import { upsertRsvp } from "./rsvp-service";

export async function saveRsvpAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const guestId = await getGuestIdFromSession();
  if (!guestId) redirect("/entrar?next=/presenca");

  const parsed = rsvpSchema.safeParse({
    name: formData.get("name"),
    attending: formData.get("attending"),
    adults: formData.get("adults"),
    children: formData.get("children"),
    message: formData.get("message") ?? undefined,
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error.issues) };

  await upsertRsvp(getDb(), guestId, parsed.data);
  redirect("/presenca?confirmado=1");
}
