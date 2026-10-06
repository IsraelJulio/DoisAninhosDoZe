import type { Metadata } from "next";
import { CheckCircle2, XCircle } from "lucide-react";
import { SettingsForm } from "@/features/admin/components/settings-form";
import { EVENT } from "@/features/event/event";
import { getReservationMinutes } from "@/features/orders/reservation-settings";
import { normalizePixKey } from "@/features/payments/pix/brcode";
import { getAdminCredentials, getAppUrl, getPixEnvConfig } from "@/lib/env";
import { getDb } from "@/server/db";

export const metadata: Metadata = { title: "Configurações" };

function maskKey(key: string) {
  return key.length <= 6 ? "•••" : `${key.slice(0, 3)}•••${key.slice(-3)}`;
}

function Row({ ok, label, detail }: { ok: boolean; label: string; detail?: string }) {
  return (
    <li className="flex items-start gap-3 py-2.5">
      {ok ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" aria-hidden /> : <XCircle className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden />}
      <p className="text-sm">
        <span className="font-bold">{label}</span>
        {detail && <span className="block text-ink-soft">{detail}</span>}
      </p>
    </li>
  );
}

export default async function AdminSettingsPage() {
  const minutes = await getReservationMinutes(getDb());
  const pix = getPixEnvConfig();
  let pixKeyValid = false;
  try {
    if (pix) pixKeyValid = Boolean(normalizePixKey(pix.key));
  } catch {
    pixKeyValid = false;
  }

  return (
    <>
      <h1 className="font-display text-2xl font-semibold">Configurações</h1>

      <section className="paper-card p-4">
        <h2 className="font-display text-lg font-semibold">Reserva de presentes</h2>
        <SettingsForm reservationMinutes={minutes} />
      </section>

      <section className="paper-card p-4">
        <h2 className="font-display text-lg font-semibold">Status da configuração</h2>
        <p className="text-sm text-ink-soft">Valores definidos nas variáveis de ambiente (Vercel → Settings → Environment Variables).</p>
        <ul className="divide-y divide-line">
          <Row
            ok={Boolean(pix) && pixKeyValid}
            label="Pix"
            detail={pix ? `${pixKeyValid ? "Chave" : "Chave em formato inválido"} ${maskKey(pix.key)} • ${pix.receiverName} • ${pix.receiverCity}` : "PIX_KEY, PIX_RECEIVER_NAME e PIX_RECEIVER_CITY não configurados — convidados não verão QR Code."}
          />
          <Row ok={Boolean(getAdminCredentials())} label="Credenciais do admin" />
          <Row ok={Boolean(getAppUrl())} label="URL pública (NEXT_PUBLIC_APP_URL)" detail={getAppUrl() ?? "Não definida (usada nos links de compartilhamento)."} />
        </ul>
      </section>

      <section className="paper-card p-4 text-sm">
        <h2 className="font-display text-lg font-semibold">Dados do convite</h2>
        <p className="text-ink-soft">Definidos em docs/event-config.json.</p>
        <p className="mt-2">
          {EVENT.displayDate} ({EVENT.displayWeekday}) às {EVENT.displayTime}
          <br />
          {EVENT.venue} — {EVENT.address}
        </p>
      </section>
    </>
  );
}
