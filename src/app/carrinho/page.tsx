import type { Metadata } from "next";
import { ArrowRight, Clock, Gift, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { AssetImage } from "@/components/asset-image";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { ButtonLink } from "@/components/ui/button";
import { getCart } from "@/features/cart/cart-service";
import { CartLines } from "@/features/cart/components/cart-lines";
import { CheckoutButton } from "@/features/cart/components/checkout-button";
import { GiftImage } from "@/features/gifts/components/gift-image";
import { requireGuest } from "@/features/guests/current-guest";
import { OrderTotals } from "@/features/orders/components/order-totals";
import { getActiveReservation } from "@/features/orders/order-queries";
import { getReservationMinutes } from "@/features/orders/reservation-settings";
import { getDb } from "@/server/db";

export const metadata: Metadata = { title: "Meu carrinho" };

// Carrinho — referência: mockups/07-cart-reservation.png (esquerda)
export default async function CarrinhoPage() {
  const guest = await requireGuest("/carrinho", { requireName: true });
  const db = getDb();
  const [cart, activeReservation, reservationMinutes] = await Promise.all([
    getCart(db, guest.id),
    getActiveReservation(db, guest.id),
    getReservationMinutes(db),
  ]);
  const blocked = cart.lines.some((l) => l.exceedsAvailability);

  return (
    <PageShell background="gifts" overlay="strong">
      <PageHeader title="Meu Carrinho" icon={<ShoppingCart className="size-5" aria-hidden />} backHref="/presentes" mascot="/assets/mascots/monkey.png" />

      <div className="flex flex-1 flex-col gap-4 px-4 pb-8 pt-1">
        {activeReservation && (
          <Link href="/checkout" className="paper-card flex items-center gap-3 border-warning/60 bg-warning/15 px-4 py-3 text-sm font-bold">
            <Clock className="size-5 shrink-0 text-wood" aria-hidden />
            Você tem presentes reservados aguardando pagamento.
            <ArrowRight className="ml-auto size-4 shrink-0" aria-hidden />
          </Link>
        )}

        {cart.lines.length === 0 ? (
          <div className="paper-card flex flex-col items-center gap-3 px-6 py-10 text-center">
            <AssetImage src="/assets/illustrations/shopping.png" displayWidth={110} />
            <p className="font-display text-xl font-semibold">Seu carrinho está vazio</p>
            <p className="text-sm text-ink-soft">Escolha um presente especial para o José!</p>
            <ButtonLink href="/presentes" block>
              <Gift className="size-5" aria-hidden />
              Ver lista de presentes
            </ButtonLink>
          </div>
        ) : (
          <>
            <CartLines
              lines={cart.lines.map((line) => ({
                giftId: line.giftId,
                title: line.title,
                unitPriceInCents: line.unitPriceInCents,
                quantity: line.quantity,
                available: line.available,
                status: line.status,
                exceedsAvailability: line.exceedsAvailability,
                image: <GiftImage imageUrl={line.imageUrl} alt={line.title} size={80} />,
              }))}
            />
            <Link href="/presentes" className="paper-card flex items-center gap-3 px-4 py-3 font-bold text-ink">
              <Gift className="size-5 text-orange" aria-hidden />
              Adicionar mais presentes
              <ArrowRight className="ml-auto size-4.5" aria-hidden />
            </Link>
            <OrderTotals subtotalInCents={cart.subtotalInCents} totalInCents={cart.totalInCents} />
            <CheckoutButton disabled={blocked} />
            <p className="text-center text-xs text-ink-soft">
              Ao continuar, seus presentes ficam reservados por {reservationMinutes} minutos enquanto você faz o Pix.
            </p>
          </>
        )}
      </div>
    </PageShell>
  );
}
