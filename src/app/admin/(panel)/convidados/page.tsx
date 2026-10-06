import { requireAdmin } from "@/server/session/admin-session";
import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { inputClasses } from "@/components/ui/field";
import { listGuestsForAdmin, type GuestFilter } from "@/features/admin/admin-queries";
import { getRsvpTotals } from "@/features/rsvp/rsvp-service";
import { cn } from "@/lib/cn";
import { maskBrazilianPhone } from "@/lib/phone";
import { getDb } from "@/server/db";

export const metadata: Metadata = { title: "Convidados" };

const FILTERS: { value: GuestFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "yes", label: "Confirmados" },
  { value: "no", label: "Não irão" },
  { value: "pending", label: "Sem resposta" },
];

const dateTime = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });

export default async function AdminGuestsPage({ searchParams }: PageProps<"/admin/convidados">) {
  await requireAdmin(); // defesa em profundidade: não depender só do layout/proxy
  const params = await searchParams;
  const filter = (FILTERS.find((f) => f.value === params.filtro)?.value ?? "all") as GuestFilter;
  const search = typeof params.q === "string" ? params.q.slice(0, 80) : "";
  const db = getDb();
  const [guests, totals] = await Promise.all([listGuestsForAdmin(db, { filter, search }), getRsvpTotals(db)]);
  const href = (f: GuestFilter) => `/admin/convidados?filtro=${f}${search ? `&q=${encodeURIComponent(search)}` : ""}`;

  return (
    <>
      <h1 className="font-display text-2xl font-semibold">Convidados</h1>

      <div className="grid grid-cols-3 gap-3">
        <div className="paper-card p-3 text-center">
          <p className="text-xs font-bold text-ink-soft">Total adultos</p>
          <p className="font-display text-3xl font-semibold" data-testid="guests-total-adults">{totals.adults}</p>
        </div>
        <div className="paper-card p-3 text-center ring-2 ring-orange/50">
          <p className="text-xs font-bold text-ink-soft">Total crianças</p>
          <p className="font-display text-3xl font-semibold" data-testid="guests-total-children">{totals.children}</p>
        </div>
        <div className="paper-card p-3 text-center">
          <p className="text-xs font-bold text-ink-soft">Pessoas</p>
          <p className="font-display text-3xl font-semibold">{totals.totalPeople}</p>
        </div>
      </div>

      <form className="flex gap-2" role="search">
        <input type="hidden" name="filtro" value={filter} />
        <label htmlFor="q" className="sr-only">Pesquisar por nome</label>
        <input id="q" name="q" defaultValue={search} placeholder="Pesquisar por nome" className={inputClasses} />
        <button type="submit" className="grid size-12 shrink-0 place-items-center rounded-2xl bg-forest text-white" aria-label="Pesquisar">
          <Search className="size-5" aria-hidden />
        </button>
      </form>

      <nav aria-label="Filtros" className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={href(f.value)}
            aria-current={filter === f.value ? "page" : undefined}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-bold",
              filter === f.value ? "bg-forest text-white" : "bg-paper ring-1 ring-line",
            )}
          >
            {f.label}
          </Link>
        ))}
      </nav>

      {guests.length === 0 ? (
        <p className="paper-card p-6 text-center text-ink-soft">Nenhum convidado encontrado.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {guests.map((g) => (
            <li key={g.id} className="paper-card flex flex-col gap-1.5 p-3.5" data-testid="admin-guest">
              <div className="flex flex-wrap items-center gap-2">
                <p className="min-w-0 flex-1 truncate font-bold">{g.name ?? "Sem nome"}</p>
                {g.rsvp ? (
                  g.rsvp.attending ? <Badge tone="success">Confirmado</Badge> : <Badge tone="danger">Não irá</Badge>
                ) : (
                  <Badge>Sem resposta</Badge>
                )}
              </div>
              <p className="text-sm text-ink-soft">
                {maskBrazilianPhone(g.phone)}
                {g.rsvp && ` • confirmado em ${dateTime.format(g.rsvp.updatedAt)}`}
              </p>
              {g.rsvp?.attending && (
                <p className="text-sm font-semibold">
                  {g.rsvp.adults} {g.rsvp.adults === 1 ? "adulto" : "adultos"} • {g.rsvp.children}{" "}
                  {g.rsvp.children === 1 ? "criança" : "crianças"}
                </p>
              )}
              {g.rsvp?.message && <p className="rounded-xl bg-sand/30 px-3 py-2 text-sm italic">“{g.rsvp.message}”</p>}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
