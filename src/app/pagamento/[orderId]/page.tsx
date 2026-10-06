import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Clock, Lock } from "lucide-react";
import { AssetImage } from "@/components/asset-image";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { StateScreen } from "@/components/state-screen";
import { ButtonLink } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { requireGuest } from "@/features/guests/current-guest";
import { OrderItemsList } from "@/features/orders/components/order-items-list";
import { OrderTotals } from "@/features/orders/components/order-totals";
import { ReleaseReservationButton } from "@/features/orders/components/release-reservation-button";
import { ReservationCountdown } from "@/features/orders/components/reservation-countdown";
import { getGuestOrder } from "@/features/orders/order-queries";
import { effectiveOrderStatus } from "@/features/orders/order-status";
import { CopyPixButton } from "@/features/payments/components/copy-pix-button";
import { ReportPaymentButton } from "@/features/payments/components/report-payment-button";
import { getOrderPixCharge } from "@/features/payments/payment-service";
import { getPixProvider, type PixCharge } from "@/features/payments/pix/provider";
import { pixQrDataUri } from "@/features/payments/qr";
import { isProduction } from "@/lib/env";
import { formatBRL } from "@/lib/money";
import { getDb } from "@/server/db";

export const metadata: Metadata = { title: "Pagamento via Pix" };

// Pagamento Pix — referência: mockups/08-pix-payment.png
export default async function PagamentoPage({ params }: PageProps<"/pagamento/[orderId]">) {
  const { orderId } = await params;
  const guest = await requireGuest(`/pagamento/${orderId}`);
  const db = getDb();
  const order = await getGuestOrder(db, guest.id, orderId);
  if (!order) notFound();

  const now = new Date();
  const status = effectiveOrderStatus(order, now);
  if (status === "AWAITING_PAYMENT_CONFIRMATION" || status === "PURCHASED") redirect(`/pedido/${order.id}`);

  if (order.paymentReportedAt && (status === "EXPIRED" || status === "CANCELLED")) redirect(`/pedido/${order.id}`);
  if (status === "EXPIRED" || status === "CANCELLED") {
    return (
      <StateScreen
        title={status === "EXPIRED" ? "Reserva expirada" : "Reserva cancelada"}
        description={
          status === "EXPIRED"
            ? "O tempo da reserva acabou antes de o pagamento ser informado, então os presentes voltaram para a lista. Se ainda estiverem disponíveis, é só tentar de novo!"
            : "Esta reserva foi cancelada. Os presentes voltaram para a lista."
        }
        mascot="/assets/mascots/monkey.png"
      >
        {status === "EXPIRED" && (
          <>
            <p className="text-sm text-ink-soft">Já tinha feito o Pix antes do tempo acabar? Avise aqui:</p>
            <ReportPaymentButton orderId={order.id} />
          </>
        )}
        <ReleaseReservationButton orderId={order.id} label="Tentar novamente" variant={status === "EXPIRED" ? "secondary" : "primary"} />
        <ButtonLink href="/presentes" variant="secondary" block>
          Ver lista de presentes
        </ButtonLink>
      </StateScreen>
    );
  }

  let charge: PixCharge;
  try {
    charge = await getOrderPixCharge(db, getPixProvider(), order);
  } catch (error) {
    console.error("Configuração Pix inválida", error);
    charge = {
      configured: false,
      reason: isProduction
        ? "O pagamento via Pix está temporariamente indisponível. Por favor, avise os pais do José."
        : `Configuração Pix inválida: ${(error as Error).message}`,
    };
  }
  const qr = charge.configured ? await pixQrDataUri(charge.payload) : null;
  const totalMinutes = Math.round((order.reservationExpiresAt.getTime() - order.createdAt.getTime()) / 60_000);

  return (
    <PageShell background="payment" overlay="strong">
      <PageHeader title="Pagamento via Pix" backHref="/checkout" mascot="/assets/mascots/toucan.png" />

      <div className="flex flex-1 flex-col gap-4 px-4 pb-8 pt-1">
        <p className="flex items-center justify-center gap-2 rounded-full bg-warning/30 px-4 py-2 text-sm font-semibold">
          <Clock className="size-4" aria-hidden />
          Reserva válida por mais
          <ReservationCountdown
            variant="inline"
            expiresAt={order.reservationExpiresAt.toISOString()}
            serverNow={now.toISOString()}
            totalMinutes={totalMinutes}
          />
        </p>

        {charge.configured && qr ? (
          <section className="paper-card flex flex-col items-center gap-2 p-5 text-center" aria-label="QR Code Pix">
            <p className="text-sm">Escaneie o QR Code no app do seu banco para pagar.</p>
            {/* eslint-disable-next-line @next/next/no-img-element -- SVG gerado no servidor (data URI) */}
            <img src={qr} alt="QR Code do Pix para pagamento" width={232} height={232} className="size-58 max-w-full" data-testid="pix-qr" />
            <p className="text-sm text-ink-soft">Valor total do pedido</p>
            <p className="font-display text-4xl font-semibold text-forest-dark" data-testid="pix-amount">
              {formatBRL(order.totalInCents)}
            </p>
            <p className="text-xs text-ink-soft">Identificador do pedido (txid): {order.pixTxid}</p>
          </section>
        ) : (
          <section className="paper-card flex flex-col items-center gap-3 p-5 text-center">
            <AssetImage src="/assets/illustrations/payment.png" displayWidth={90} />
            {!charge.configured && (
              <Notice tone="warning" className="text-left">
                {charge.reason}
              </Notice>
            )}
            <p className="text-sm text-ink-soft">Valor total do pedido</p>
            <p className="font-display text-4xl font-semibold text-forest-dark" data-testid="pix-amount">
              {formatBRL(order.totalInCents)}
            </p>
          </section>
        )}

        {charge.configured && <CopyPixButton payload={charge.payload} />}

        {(charge.configured || !isProduction) && <ReportPaymentButton orderId={order.id} />}

        <p className="flex items-start gap-2 rounded-2xl bg-paper px-4 py-3 text-sm text-ink-soft">
          <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
          Depois de pagar, toque em “Já fiz o pagamento”. Os pais do José conferem o Pix na conta e confirmam o seu
          presente manualmente — você acompanha tudo por aqui.
        </p>

        <h2 className="font-display text-lg font-semibold">Resumo do seu pedido</h2>
        <OrderItemsList items={order.items} compact />
        <OrderTotals subtotalInCents={order.subtotalInCents} totalInCents={order.totalInCents} />
      </div>
    </PageShell>
  );
}
