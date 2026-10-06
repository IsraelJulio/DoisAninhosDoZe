"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fieldErrorsFromZod, type ActionState } from "@/lib/action-state";
import { isDomainError } from "@/lib/domain-error";
import { deleteOrDeactivateGift, createGift, setGiftActive, updateGift } from "@/features/gifts/gift-admin-service";
import { giftFormSchema } from "@/features/gifts/gift-schema";
import { importGiftFromUrl, type ImportPreview } from "@/features/gifts/import/import-service";
import { UnsafeUrlError } from "@/features/gifts/import/url-guard";
import { EVENT_SLUG } from "@/features/orders/reservation-settings";
import { cancelOrderByAdmin, confirmOrderPayment } from "@/features/payments/payment-service";
import { getDb } from "@/server/db";
import { enforceRateLimit, RateLimitError } from "@/server/rate-limit";
import {
  clearAdminSession,
  requireAdmin,
  setAdminSession,
  verifyAdminCredentials,
} from "@/server/session/admin-session";
import { getAdminCredentials } from "@/lib/env";

// Toda Server Action do admin começa com requireAdmin(): actions são endpoints públicos.

const loginSchema = z.object({ username: z.string().trim().min(1).max(100), password: z.string().min(1).max(200) });

export async function adminLoginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await enforceRateLimit("admin-login", 8, 15 * 60_000);
  } catch (error) {
    if (error instanceof RateLimitError) return { error: error.message };
    throw error;
  }
  if (!getAdminCredentials()) {
    return { error: "Admin não configurado: defina ADMIN_USERNAME e ADMIN_PASSWORD nas variáveis de ambiente." };
  }
  const parsed = loginSchema.safeParse({ username: formData.get("username"), password: formData.get("password") });
  if (!parsed.success || !verifyAdminCredentials(parsed.data.username, parsed.data.password)) {
    return { error: "Usuário ou senha incorretos." };
  }
  await setAdminSession();
  redirect("/admin");
}

export async function adminLogoutAction(): Promise<void> {
  await clearAdminSession();
  redirect("/admin/login");
}

const idSchema = z.string().min(1).max(64);

function revalidateOrders() {
  revalidatePath("/admin", "layout");
  revalidatePath("/presentes");
}

export async function confirmPaymentAction(orderId: string): Promise<ActionState> {
  await requireAdmin();
  try {
    await confirmOrderPayment(getDb(), idSchema.parse(orderId));
  } catch (error) {
    if (isDomainError(error)) return { error: error.message };
    throw error;
  }
  revalidateOrders();
  redirect("/admin/pagamentos?aba=pending&feito=confirmado"); // o card sai da aba, então o aviso fica na página
}

export async function cancelOrderAction(orderId: string): Promise<ActionState> {
  await requireAdmin();
  try {
    await cancelOrderByAdmin(getDb(), idSchema.parse(orderId));
  } catch (error) {
    if (isDomainError(error)) return { error: error.message };
    throw error;
  }
  revalidateOrders();
  redirect("/admin/pagamentos?aba=pending&feito=cancelado");
}

export async function saveGiftAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const raw = Object.fromEntries(formData.entries());
  const parsed = giftFormSchema.safeParse({ ...raw, active: raw.active ?? "false" });
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error.issues), error: "Confira os campos destacados." };

  const id = typeof raw.id === "string" && raw.id ? idSchema.parse(raw.id) : null;
  const db = getDb();
  if (id) await updateGift(db, id, parsed.data);
  else await createGift(db, parsed.data);
  revalidatePath("/admin", "layout");
  revalidatePath("/presentes", "layout");
  redirect("/admin/presentes?salvo=1");
}

export async function toggleGiftActiveAction(giftId: string, active: boolean): Promise<ActionState> {
  await requireAdmin();
  await setGiftActive(getDb(), idSchema.parse(giftId), active);
  revalidatePath("/admin/presentes");
  revalidatePath("/presentes", "layout");
  return { ok: true };
}

export async function deleteGiftAction(giftId: string): Promise<ActionState> {
  await requireAdmin();
  const result = await deleteOrDeactivateGift(getDb(), idSchema.parse(giftId));
  revalidatePath("/admin/presentes");
  revalidatePath("/presentes", "layout");
  return {
    ok: true,
    message: result === "deleted" ? "Presente excluído." : "Este presente tem pedidos, então foi apenas desativado.",
  };
}

export async function importGiftAction(url: string): Promise<{ preview?: ImportPreview; error?: string }> {
  await requireAdmin();
  try {
    await enforceRateLimit("gift-import", 30, 10 * 60_000);
    const preview = await importGiftFromUrl(getDb(), z.string().max(2000).parse(url));
    return { preview };
  } catch (error) {
    if (error instanceof UnsafeUrlError || error instanceof RateLimitError) return { error: error.message };
    if (error instanceof z.ZodError) return { error: "Link muito longo." };
    console.error("Falha no importador", error);
    return { error: "Não foi possível obter todas as informações automaticamente." };
  }
}

const settingsSchema = z.object({ reservationMinutes: z.coerce.number().int().min(5).max(180) });

export async function saveSettingsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = settingsSchema.safeParse({ reservationMinutes: formData.get("reservationMinutes") });
  if (!parsed.success) return { error: "Informe um tempo entre 5 e 180 minutos." };
  const db = getDb();
  const existing = await db.event.findUnique({ where: { slug: EVENT_SLUG } });
  if (existing) {
    await db.event.update({ where: { slug: EVENT_SLUG }, data: parsed.data });
  } else {
    const { EVENT } = await import("@/features/event/event");
    await db.event.create({
      data: { slug: EVENT_SLUG, childName: EVENT.childName, eventDate: EVENT.startsAt, ...parsed.data },
    });
  }
  await db.adminAuditLog.create({ data: { action: "SETTINGS_UPDATED", entityType: "Event", entityId: EVENT_SLUG, metadata: parsed.data } });
  revalidatePath("/admin/configuracoes");
  return { ok: true, message: "Configurações salvas." };
}
