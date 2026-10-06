import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ArrowRight, Clock, Lock } from "lucide-react";
import { AssetImage } from "@/components/asset-image";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { ButtonLink } from "@/components/ui/button";
import { WoodSign } from "@/components/ui/wood-sign";
import { EVENT } from "@/features/event/event";
import { requireGuest } from "@/features/guests/current-guest";
import { OrderItemsList } from "@/features/orders/components/order-items-list";
import { OrderTotals } from "@/features/orders/components/order-totals";
import { ReleaseReservationButton } from "@/features/orders/components/release-reservation-button";
import { ReservationCountdown } from "@/features/orders/components/reservation-countdown";
import { getActiveReservation } from "@/features/orders/order-queries";
import { getDb } from "@/server/db";

export const metadata: Metadata = { title: "Presentes reservados" };

// Reserva temporária — referência: mockups/07-cart-reservation.png (direita)
export default async function CheckoutPage() {
  const guest = await requireGuest("/checkout", { requireName: true });
  const now = new Date();
  const order = await getActiveReservation(getDb(), guest.id, now);
  if (!order) redirect("/carrinho");
  const totalMinutes = Math.round((order.reservationExpiresAt.getTime() - order.createdAt.getTime()) / 60_000);

  return (
    <PageShell background="gifts" overlay="strong">
      <PageHeader title="Presentes Reservados" icon={<Clock className="size-5" aria-hidden />} backHref="/carrinho" />

      <div className="flex flex-1 flex-col gap-4 px-4 pb-8 pt-1">
        <div className="relative flex h-44 items-end gap-2">
          <div className="h-full w-28 shrink-0 overflow-hidden">
            <AssetImage src="/assets/jose/jose-pointing-cutout.png" alt={EVENT.childName} displayWidth={112} priority />
          </div>
          <WoodSign className="mb-8 min-w-0 flex-1 rotate-[-3deg] text-[0.95rem]">
            Estamos segurando seus presentes por um tempinho!
          </WoodSign>
        </div>

        <section className="flex items-center gap-3 rounded-[var(--radius-card)] bg-warning/35 p-4 shadow-[var(--shadow-soft)]">
          <Clock className="size-9 shrink-0 text-wood-dark" aria-hidden />
          <p className="flex-1 leading-tight">
            <span className="block text-sm font-bold">Itens reservados por</span>
            <span className="font-display text-2xl font-semibold">{totalMinutes} minutos</span>
          </p>
          <ReservationCountdown expiresAt={order.reservationExpiresAt.toISOString()} serverNow={now.toISOString()} totalMinutes={totalMinutes} />
        </section>

        <p className="flex items-start gap-2 rounded-2xl bg-paper px-4 py-3 text-sm text-ink-soft">
          <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
          Se o pagamento não for informado dentro desse prazo, os itens voltam a ficar disponíveis para outros convidados.
        </p>

        <h2 className="font-display text-lg font-semibold">Seus itens reservados:</h2>
        <OrderItemsList items={order.items} compact />
        <OrderTotals subtotalInCents={order.subtotalInCents} totalInCents={order.totalInCents} />

        <ButtonLink href={`/pagamento/${order.id}`} size="lg" block>
          Ir para pagamento via Pix
          <ArrowRight className="size-5" aria-hidden />
        </ButtonLink>
        <ReleaseReservationButton orderId={order.id} label="Voltar ao carrinho e editar" />
      </div>
    </PageShell>
  );
}
