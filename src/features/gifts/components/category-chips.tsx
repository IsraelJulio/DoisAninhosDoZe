import Link from "next/link";
import { cn } from "@/lib/cn";

/** Filtro por categoria via links (funciona sem JavaScript). Categorias vêm do banco. */
export function CategoryChips({ categories, active }: { categories: string[]; active?: string }) {
  const chip = (selected: boolean) =>
    cn(
      "inline-flex min-h-9 shrink-0 items-center rounded-full px-4 text-sm font-bold transition",
      selected ? "bg-forest text-white shadow-[0_3px_0_var(--color-forest-dark)]" : "bg-paper text-ink ring-1 ring-line hover:ring-sand",
    );
  return (
    <nav aria-label="Categorias" data-scroll-x className="-mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
      <ul className="flex w-max gap-2">
        <li>
          <Link href="/presentes" className={chip(!active)} aria-current={!active ? "page" : undefined}>
            Todos
          </Link>
        </li>
        {categories.map((category) => (
          <li key={category}>
            <Link
              href={`/presentes?categoria=${encodeURIComponent(category)}`}
              className={chip(active === category)}
              aria-current={active === category ? "page" : undefined}
            >
              {category}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
