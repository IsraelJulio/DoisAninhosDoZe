"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionState } from "@/lib/action-state";
import { isDomainError } from "@/lib/domain-error";
import { getDb } from "@/server/db";
import { enforceRateLimit, RateLimitError } from "@/server/rate-limit";
import { getGuestIdFromSession } from "@/server/session/guest-session";
import { getReservationMinutes } from "./reservation-settings";
import { createReservationFromCart, releaseReservationToCart, reportPayment } from "./reservation-service";

const orderIdSchema = z.string().min(1).max(64);

async function requireGuestId(next: string) {
  const guestId = await getGuestIdFromSession();
  if (!guestId) redirect(`/entrar?next=${encodeURIComponent(next)}`);
  return guestId;
}

/** Carrinho → reserva temporária (30 min por padrão). */
export async function startCheckoutAction(_prev: ActionState): Promise<ActionState> {
  const guestId = await requireGuestId("/carrinho");
  try {
    await enforceRateLimit("checkout", 15, 10 * 60_000);
    const db = getDb();
    await createReservationFromCart(db, guestId, { reservationMinutes: await getReservationMinutes(db) });
  } catch (error) {
    if (error instanceof RateLimitError || isDomainError(error)) {
      revalidatePath("/carrinho");
      return { error: error.message };
    }
    throw error;
  }
  revalidatePath("/presentes");
  redirect("/checkout");
}

export async function reportPaymentAction(orderId: string): Promise<ActionState> {
  const id = orderIdSchema.parse(orderId);
  const guestId = await requireGuestId(`/pagamento/${id}`);
  try {
    await reportPayment(getDb(), guestId, id);
  } catch (error) {
    if (isDomainError(error)) return { error: error.message };
    throw error;
  }
  redirect(`/pedido/${id}`);
}

/** Desistir/renovar: itens voltam para o carrinho. */
export async function releaseReservationAction(orderId: string): Promise<ActionState> {
  const id = orderIdSchema.parse(orderId);
  const guestId = await requireGuestId("/carrinho");
  try {
    await releaseReservationToCart(getDb(), guestId, id);
  } catch (error) {
    if (isDomainError(error)) return { error: error.message };
    throw error;
  }
  revalidatePath("/presentes");
  redirect("/carrinho");
}
