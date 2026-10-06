import { GiftImage } from "@/features/gifts/components/gift-image";
import { formatBRL } from "@/lib/money";

interface Item {
  id: string;
  quantity: number;
  unitPriceInCents: number;
  giftTitleSnapshot: string;
  giftImageSnapshot: string | null;
}

/** Itens de um pedido (usa os snapshots gravados no momento da reserva). */
export function OrderItemsList({ items, compact }: { items: Item[]; compact?: boolean }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li key={item.id} className="paper-card flex items-center gap-3 p-2.5">
          <GiftImage
            imageUrl={item.giftImageSnapshot}
            alt={item.giftTitleSnapshot}
            size={compact ? 52 : 64}
            className={compact ? "w-13 shrink-0" : "w-16 shrink-0"}
          />
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-sm font-bold leading-tight">{item.giftTitleSnapshot}</p>
            <p className="font-display font-semibold text-forest-dark">{formatBRL(item.unitPriceInCents)}</p>
          </div>
          <p className="shrink-0 text-sm font-bold text-ink-soft">Qtd: {item.quantity}</p>
        </li>
      ))}
    </ul>
  );
}
