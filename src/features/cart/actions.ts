"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionState } from "@/lib/action-state";
import { isDomainError } from "@/lib/domain-error";
import { getDb } from "@/server/db";
import { getSessionGuestId } from "@/features/guests/current-guest";
import { addToCart, MAX_QUANTITY_PER_ITEM, removeCartItem, setCartItemQuantity } from "./cart-service";

// Apenas giftId + quantidade chegam do navegador. Preço nunca é aceito do cliente.
const addSchema = z.object({
  giftId: z.string().min(1).max(64),
  quantity: z.coerce.number().int().min(1).max(MAX_QUANTITY_PER_ITEM),
  goToCart: z.enum(["1"]).optional(),
});

async function guestOrLogin(nextPath: string) {
  const guestId = await getSessionGuestId();
  if (!guestId) redirect(`/entrar?next=${encodeURIComponent(nextPath)}`);
  return guestId;
}

export async function addToCartAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = addSchema.safeParse({
    giftId: formData.get("giftId"),
    quantity: formData.get("quantity") ?? 1,
    goToCart: formData.get("goToCart") ?? undefined,
  });
  if (!parsed.success) return { error: "Não foi possível adicionar este presente." };
  const guestId = await guestOrLogin(`/presentes/${parsed.data.giftId}`);

  try {
    await addToCart(getDb(), guestId, parsed.data.giftId, parsed.data.quantity);
  } catch (error) {
    if (isDomainError(error)) return { error: error.message };
    throw error;
  }
  revalidatePath("/carrinho");
  if (parsed.data.goToCart) redirect("/carrinho");
  return { ok: true, message: "Adicionado ao carrinho!" };
}

const quantitySchema = z.object({
  giftId: z.string().min(1).max(64),
  quantity: z.coerce.number().int().min(0).max(MAX_QUANTITY_PER_ITEM),
});

export async function updateCartQuantityAction(giftId: string, quantity: number): Promise<ActionState> {
  const parsed = quantitySchema.safeParse({ giftId, quantity });
  if (!parsed.success) return { error: "Quantidade inválida." };
  const guestId = await guestOrLogin("/carrinho");
  await setCartItemQuantity(getDb(), guestId, parsed.data.giftId, parsed.data.quantity);
  revalidatePath("/carrinho");
  return { ok: true };
}

export async function removeFromCartAction(giftId: string): Promise<ActionState> {
  const parsed = z.string().min(1).max(64).safeParse(giftId);
  if (!parsed.success) return { error: "Item inválido." };
  const guestId = await guestOrLogin("/carrinho");
  await removeCartItem(getDb(), guestId, parsed.data);
  revalidatePath("/carrinho");
  return { ok: true };
}
