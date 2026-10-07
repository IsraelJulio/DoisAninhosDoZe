import Link from "next/link";
import { formatBRL } from "@/lib/money";
import type { GiftView } from "../gift-queries";
import { GiftImage } from "./gift-image";
import { GiftStatusBadge } from "./gift-status-badge";
import { QuickGiftButton } from "./add-to-cart-form";

export function GiftCard({ gift, priority }: { gift: GiftView; priority?: boolean }) {
  const available = gift.status === "AVAILABLE";
  return (
    <li className="paper-card flex flex-col gap-2 p-2.5" data-testid="gift-card">
      <Link href={`/presentes/${gift.id}`} className="group flex flex-col gap-2 rounded-2xl">
        <GiftImage
          imageUrl={gift.imageUrl}
          alt={gift.title}
          size={170}
          priority={priority}
          className={available ? "" : "opacity-60 grayscale-[35%]"}
        />
        <div className="flex flex-col gap-1 px-0.5">
          <h2 className="line-clamp-2 min-h-[2.5rem] text-[0.95rem] font-bold leading-tight group-hover:underline">
            {gift.title}
          </h2>
          <p className="font-display text-lg font-semibold text-forest-dark">{formatBRL(gift.priceInCents)}</p>
          <div className="flex flex-wrap items-center gap-1.5">
            <GiftStatusBadge status={gift.status} />
            <span className="text-xs text-ink-soft">{gift.category}</span>
          </div>
        </div>
      </Link>
      <div className="mt-auto">
        {available ? (
          <QuickGiftButton giftId={gift.id} title={gift.title} />
        ) : (
          <p
            className="flex min-h-10 items-center justify-center rounded-[var(--radius-button)] bg-ink/8 text-sm font-bold text-ink-soft"
            aria-label={`${gift.title}: indisponível`}
          >
            {gift.status === "PURCHASED" ? "Você já presenteou" : gift.status === "RESERVED" ? "Já está no seu pedido" : "Indisponível"}
          </p>
        )}
      </div>
    </li>
  );
}
