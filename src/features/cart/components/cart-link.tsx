import { ShoppingCart } from "lucide-react";
import Link from "next/link";

/** Atalho para o carrinho com contador (usado no cabeçalho das telas de presentes). */
export function CartLink({ count }: { count: number }) {
  return (
    <Link
      href="/carrinho"
      aria-label={count ? `Carrinho com ${count} ${count === 1 ? "item" : "itens"}` : "Carrinho"}
      className="relative grid size-11 shrink-0 place-items-center rounded-full bg-paper text-wood-dark shadow-[var(--shadow-soft)]"
    >
      <ShoppingCart className="size-5.5" aria-hidden />
      {count > 0 && (
        <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-danger px-1 text-xs font-extrabold text-white">
          {count}
        </span>
      )}
    </Link>
  );
}
