import type { Metadata } from "next";
import Image from "next/image";
import { LogOut } from "lucide-react";
import { AdminNav } from "@/features/admin/components/admin-nav";
import { adminLogoutAction } from "@/features/admin/actions";
import { EVENT } from "@/features/event/event";
import { getDb } from "@/server/db";
import { requireAdmin } from "@/server/session/admin-session";

export const metadata: Metadata = { title: { default: "Painel", template: "%s · Painel do José" } };

// Painel administrativo — referência: mockups/10-admin.png
export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const pending = await getDb().order.count({ where: { status: "AWAITING_PAYMENT_CONFIRMATION" } });

  return (
    <div className="min-h-dvh bg-cream">
      <div className="mx-auto flex w-full max-w-[960px] flex-col gap-4 px-4 pb-12 pt-[max(1rem,env(safe-area-inset-top))]">
        <header className="flex items-center gap-3">
          <div className="relative size-12 shrink-0 overflow-hidden rounded-full border-2 border-paper shadow-[var(--shadow-soft)]">
            <Image src="/assets/jose/jose-avatar.webp" alt="" fill sizes="48px" className="object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-display text-xl font-semibold leading-tight">Painel Administrativo</p>
            <p className="text-sm text-ink-soft">
              Aniversário do {EVENT.childName} • {EVENT.age} anos
            </p>
          </div>
          <form action={adminLogoutAction}>
            <button
              type="submit"
              className="grid size-11 place-items-center rounded-full bg-paper text-wood-dark shadow-[var(--shadow-soft)]"
              aria-label="Sair do painel"
            >
              <LogOut className="size-5" aria-hidden />
            </button>
          </form>
        </header>
        <AdminNav pendingCount={pending} />
        <main className="flex flex-col gap-4">{children}</main>
      </div>
    </div>
  );
}
