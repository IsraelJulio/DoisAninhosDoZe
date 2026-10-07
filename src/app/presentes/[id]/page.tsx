import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Globe, Package } from "lucide-react";
import { AssetImage } from "@/components/asset-image";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { CartLink } from "@/features/cart/components/cart-link";
import { getCartItemCount } from "@/features/cart/cart-service";
import { AddToCartForm } from "@/features/gifts/components/add-to-cart-form";
import { GiftImage } from "@/features/gifts/components/gift-image";
import { GiftStatusBadge } from "@/features/gifts/components/gift-status-badge";
import { getPublicGift } from "@/features/gifts/gift-queries";
import { getCurrentGuest } from "@/features/guests/current-guest";
import { formatBRL } from "@/lib/money";
import { getDb } from "@/server/db";

export async function generateMetadata({ params }: PageProps<"/presentes/[id]">): Promise<Metadata> {
  const { id } = await params;
  const gift = await getPublicGift(getDb(), id);
  return { title: gift?.title ?? "Presente" };
}

// Detalhe do presente — referência: mockups/06-gift-detail.png
export default async function GiftDetailPage({ params }: PageProps<"/presentes/[id]">) {
  const { id } = await params;
  const db = getDb();
  const guest = await getCurrentGuest();
  const gift = await getPublicGift(db, id, new Date(), guest?.id);
  if (!gift) notFound();
  const cartCount = guest ? await getCartItemCount(db, guest.id) : 0;
  const available = gift.status === "AVAILABLE";

  return (
    <PageShell background="gifts" overlay="strong">
      <PageHeader title="Detalhe do Presente" backHref="/presentes" action={<CartLink count={cartCount} />} />

      <div className="flex flex-1 flex-col gap-4 px-4 pb-8 pt-1">
        <div className="paper-card p-3">
          <GiftImage imageUrl={gift.imageUrl} alt={gift.title} size={360} priority />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <GiftStatusBadge status={gift.status} />
            <Badge tone="info">{gift.category}</Badge>
          </div>
          <h1 className="font-display text-2xl font-semibold leading-tight">{gift.title}</h1>
          {gift.description && <p className="whitespace-pre-line leading-snug text-ink-soft">{gift.description}</p>}
        </div>

        <div className="paper-card px-4 py-3">
          <p className="font-display text-3xl font-semibold text-forest-dark">{formatBRL(gift.priceInCents)}</p>
          <p className="text-xs text-ink-soft">Valor definido pelos pais — é o valor do Pix.</p>
        </div>

        {gift.source && gift.source !== "Manual" && (
          <div className="paper-card flex items-center gap-3 px-4 py-3">
            <Globe className="size-6 shrink-0 text-forest" aria-hidden />
            <p className="text-sm leading-tight">
              <span className="block font-bold">Origem do item</span>
              <span className="text-ink-soft">Escolhido pelos pais a partir de um produto da loja {gift.source}.</span>
            </p>
          </div>
        )}

        <div className="paper-card flex items-center gap-3 bg-sand/30 px-4 py-3">
          <Package className="size-6 shrink-0 text-wood" aria-hidden />
          <p className="flex-1 text-sm leading-tight">
            <span className="block font-bold">Quantidade disponível para você</span>
            <span className="font-display text-lg font-semibold">
              {gift.available} {gift.available === 1 ? "unidade" : "unidades"}
            </span>
          </p>
          {available && <Badge tone="success">Disponível</Badge>}
        </div>

        {available ? (
          <AddToCartForm giftId={gift.id} available={gift.available} />
        ) : (
          <div className="paper-card flex flex-col items-center gap-2 p-5 text-center">
            <AssetImage src="/assets/mascots/lion.png" displayWidth={70} />
            <p className="font-display text-lg font-semibold">
              {gift.status === "PURCHASED"
                ? "Você já deu este presente ao José!"
                : gift.status === "RESERVED"
                  ? "Você já reservou este presente."
                  : "Este presente não está disponível."}
            </p>
            <p className="text-sm text-ink-soft">
              {gift.status === "RESERVED"
                ? "Conclua o pagamento do seu pedido. Se a reserva vencer, ele volta a ficar disponível para você."
                : "Que tal escolher outro item da lista?"}
            </p>
            <ButtonLink href="/presentes" variant="secondary" block>
              Ver outros presentes
            </ButtonLink>
          </div>
        )}
      </div>
    </PageShell>
  );
}
