import type { Metadata } from "next";
import Link from "next/link";
import { Gift, PackageCheck } from "lucide-react";
import { AssetImage } from "@/components/asset-image";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { Reveal } from "@/components/motion/reveal";
import { CartLink } from "@/features/cart/components/cart-link";
import { getCartItemCount } from "@/features/cart/cart-service";
import { EVENT } from "@/features/event/event";
import { CategoryChips } from "@/features/gifts/components/category-chips";
import { GiftCard } from "@/features/gifts/components/gift-card";
import { listGiftCategories, listPublicGifts } from "@/features/gifts/gift-queries";
import { getCurrentGuest } from "@/features/guests/current-guest";
import { getLatestTrackableOrder } from "@/features/orders/order-queries";
import { getDb } from "@/server/db";

export const metadata: Metadata = { title: "Lista de presentes" };

// Lista de presentes — referência: mockups/05-gift-list.png
export default async function PresentesPage({ searchParams }: PageProps<"/presentes">) {
  const params = await searchParams;
  const category = typeof params.categoria === "string" ? params.categoria : undefined;
  const db = getDb();
  const guest = await getCurrentGuest();
  const [gifts, categories, cartCount, trackable] = await Promise.all([
    listPublicGifts(db, new Date(), category, guest?.id),
    listGiftCategories(db),
    guest ? getCartItemCount(db, guest.id) : 0,
    guest ? getLatestTrackableOrder(db, guest.id) : null,
  ]);

  return (
    <PageShell background="gifts" overlay="strong">
      <PageHeader
        title="Lista de Presentes"
        icon={<Gift className="size-5" aria-hidden />}
        backHref="/"
        action={<CartLink count={cartCount} />}
      />

      <div className="flex flex-1 flex-col gap-4 px-4 pb-10 pt-1">
        <Reveal>
          <p className="text-center text-[0.98rem] leading-snug">
            Você pode presentear o {EVENT.childName} escolhendo um item da nossa lista.
            <span className="block text-sm text-ink-soft">O pagamento é feito via Pix, direto para os pais.</span>
          </p>
        </Reveal>

        {trackable && (
          <Link
            href={`/pedido/${trackable.id}`}
            className="paper-card flex items-center gap-3 px-4 py-3 text-sm font-bold text-forest-dark"
          >
            <PackageCheck className="size-5 shrink-0" aria-hidden />
            Acompanhar meu presente
            <span className="ml-auto text-ink-soft">→</span>
          </Link>
        )}

        {categories.length > 1 && <CategoryChips categories={categories} active={category} />}

        {gifts.length === 0 ? (
          <div className="paper-card flex flex-col items-center gap-3 px-6 py-10 text-center">
            <AssetImage src="/assets/illustrations/gift-stack.png" displayWidth={110} />
            <p className="font-display text-lg font-semibold">
              {category ? "Nenhum presente nesta categoria." : "A lista de presentes está sendo preparada."}
            </p>
            <p className="text-sm text-ink-soft">Volte daqui a pouquinho!</p>
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-3">
            {gifts.map((gift, index) => (
              <GiftCard key={gift.id} gift={gift} priority={index < 2} />
            ))}
          </ul>
        )}

        <p className="mt-2 flex items-center justify-center gap-2 text-center text-xs text-ink-soft">
          <AssetImage src="/assets/decor/paw.png" displayWidth={18} />
          Todos os itens foram carinhosamente escolhidos pelos papais.
        </p>
      </div>
    </PageShell>
  );
}
