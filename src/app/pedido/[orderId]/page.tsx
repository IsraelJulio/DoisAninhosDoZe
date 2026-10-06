import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { CheckCircle2, Clock, Gift, Home } from "lucide-react";
import type { ReactNode } from "react";
import { AssetImage } from "@/components/asset-image";
import { CornerLeaves } from "@/components/decor/leaves";
import { PageShell } from "@/components/layout/page-shell";
import { StateScreen } from "@/components/state-screen";
import { ButtonLink } from "@/components/ui/button";
import { WoodSign } from "@/components/ui/wood-sign";
import { EVENT } from "@/features/event/event";
import { requireGuest } from "@/features/guests/current-guest";
import { AutoRefresh } from "@/features/orders/components/auto-refresh";
import { Celebration } from "@/features/orders/components/celebration";
import { OrderItemsList } from "@/features/orders/components/order-items-list";
import { getGuestOrder } from "@/features/orders/order-queries";
import { effectiveOrderStatus } from "@/features/orders/order-status";
import { formatBRL } from "@/lib/money";
import { getDb } from "@/server/db";

export const metadata: Metadata = { title: "Acompanhamento do presente" };

function StatusRow({ done, title, description, icon }: { done: boolean; title: string; description: string; icon: ReactNode }) {
  return (
    <li className="paper-card flex items-start gap-3 p-4">
      <span
        className={`grid size-10 shrink-0 place-items-center rounded-full ${done ? "bg-success text-white" : "bg-warning/30 text-wood-dark"}`}
        aria-hidden
      >
        {icon}
      </span>
      <p className="leading-tight">
        <span className={`block font-display text-lg font-semibold ${done ? "text-forest-dark" : "text-wood-dark"}`}>{title}</span>
        <span className="text-sm text-ink-soft">{description}</span>
      </p>
    </li>
  );
}

// Confirmação e acompanhamento — referência: mockups/09-confirmation-tracking.png
export default async function PedidoPage({ params }: PageProps<"/pedido/[orderId]">) {
  const { orderId } = await params;
  const guest = await requireGuest(`/pedido/${orderId}`);
  const order = await getGuestOrder(getDb(), guest.id, orderId);
  if (!order) notFound();

  const status = effectiveOrderStatus(order, new Date());
  if (status === "RESERVED") redirect(`/pagamento/${order.id}`);
  if ((status === "EXPIRED" || status === "CANCELLED") && order.paymentReportedAt && order.payment?.status === "AWAITING_CONFIRMATION") {
    return (
      <StateScreen
        title="Recebemos o seu aviso"
        description={
          <>
            O tempo da reserva tinha acabado e {order.items.length > 1 ? "os presentes foram escolhidos" : "o presente foi escolhido"} por
            outra pessoa antes do aviso de pagamento. Não se preocupe: os pais do {EVENT.childName} vão conferir o Pix e falar com você
            para devolver o valor ou combinar outro presente.
          </>
        }
        mascot="/assets/mascots/giraffe.png"
      >
        <ButtonLink href="/" block>
          Voltar para o convite
        </ButtonLink>
      </StateScreen>
    );
  }
  if (status === "EXPIRED" || status === "CANCELLED") {
    return (
      <StateScreen
        title={status === "EXPIRED" ? "Reserva expirada" : "Pedido cancelado"}
        description={
          status === "CANCELLED"
            ? "Este pedido foi cancelado. Se você já fez o Pix, fale com os pais do José, por favor."
            : "O tempo da reserva acabou. Os presentes voltaram para a lista."
        }
        mascot="/assets/mascots/monkey.png"
      >
        <ButtonLink href="/presentes" block>
          Ver lista de presentes
        </ButtonLink>
      </StateScreen>
    );
  }

  const confirmed = status === "PURCHASED";

  return (
    <PageShell background="payment" overlay={confirmed ? "light" : "strong"}>
      {!confirmed && <AutoRefresh seconds={30} />}
      <CornerLeaves corners={["top-left", "top-right"]} />
      <div className="relative z-10 flex flex-1 flex-col gap-4 px-4 pb-8 pt-[max(1.5rem,env(safe-area-inset-top))]">
        {confirmed ? (
          <>
          <Celebration>
            <div className="relative mx-auto flex h-56 w-full max-w-[340px] items-end justify-center">
              <AssetImage src="/assets/mascots/lion.png" displayWidth={96} className="absolute bottom-0 left-0 animate-float" />
              <div className="h-full w-36 overflow-hidden">
                <AssetImage src="/assets/jose/jose-pointing-cutout.png" alt={EVENT.childName} displayWidth={144} priority />
              </div>
              <AssetImage src="/assets/mascots/giraffe.png" displayWidth={84} className="absolute bottom-0 right-0 animate-float" />
              <AssetImage src="/assets/decor/confetti.png" displayWidth={90} className="absolute right-10 top-0" />
            </div>
          </Celebration>
            <div className="mt-2 flex justify-center">
              <WoodSign as="h1" className="text-3xl">
                Presente confirmado!
              </WoodSign>
            </div>
            <p className="mt-3 text-center leading-snug">
              Uhuu! Muito obrigado por fazer parte do meu aniversário! Seu presente já foi registrado com muito carinho!
            </p>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 text-center">
            <WoodSign as="h1" className="text-2xl">
              Pagamento aguardando confirmação
            </WoodSign>
            <AssetImage src="/assets/illustrations/payment.png" displayWidth={96} />
            <p className="leading-snug">
              Recebemos o seu aviso! Assim que os pais do {EVENT.childName} conferirem o Pix na conta, seu presente será
              confirmado aqui. Obrigado por fazer parte dessa aventura!
            </p>
          </div>
        )}

        <ul className="flex flex-col gap-3" aria-label="Status">
          <StatusRow
            done={confirmed}
            icon={confirmed ? <CheckCircle2 className="size-6" /> : <Clock className="size-6" />}
            title={confirmed ? "Pagamento confirmado" : "Pagamento aguardando confirmação"}
            description={confirmed ? "Seu Pix foi conferido pelos pais do José." : "A confirmação é feita manualmente pelos pais."}
          />
          <StatusRow
            done={confirmed}
            icon={<Gift className="size-6" />}
            title={confirmed ? "Presente confirmado" : "Presente reservado para você"}
            description={confirmed ? "Seu presente já está registrado na lista!" : "Ninguém mais pode escolher estes itens."}
          />
        </ul>

        <section className="flex flex-col gap-2" aria-label="Seu presente">
          <h2 className="font-display text-lg font-semibold">{order.items.length > 1 ? "Seus presentes" : "Seu presente"}</h2>
          <OrderItemsList items={order.items} compact />
          <p className="text-right text-sm text-ink-soft">
            Total: <strong className="text-ink">{formatBRL(order.totalInCents)}</strong>
          </p>
        </section>

        {confirmed && (
          <WoodSign className="mx-auto rotate-[-2deg] text-base">A sua presença e carinho tornam esse dia ainda mais especial!</WoodSign>
        )}

        <ButtonLink href="/" size="lg" block>
          <Home className="size-5" aria-hidden />
          Voltar para o convite
        </ButtonLink>
      </div>
    </PageShell>
  );
}
