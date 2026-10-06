import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AssetImage } from "@/components/asset-image";
import { PageShell } from "@/components/layout/page-shell";
import { WoodSign } from "@/components/ui/wood-sign";
import { AdminLoginForm } from "@/features/admin/components/admin-login-form";
import { isAdminAuthenticated } from "@/server/session/admin-session";

export const metadata: Metadata = { title: "Login do painel" };

export default async function AdminLoginPage() {
  if (await isAdminAuthenticated()) redirect("/admin");
  return (
    <PageShell background="soft" overlay="strong">
      <div className="flex flex-1 flex-col justify-center gap-5 px-6 py-10">
        <div className="flex flex-col items-center gap-3 text-center">
          <AssetImage src="/assets/mascots/lion.png" displayWidth={96} />
          <WoodSign as="h1" className="text-2xl">
            Painel dos papais
          </WoodSign>
          <p className="text-sm text-ink-soft">Área restrita para gerenciar convidados, presentes e pagamentos.</p>
        </div>
        <AdminLoginForm />
      </div>
    </PageShell>
  );
}
