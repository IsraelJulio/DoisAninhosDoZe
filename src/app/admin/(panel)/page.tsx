import Link from "next/link";
import { Baby, CheckCircle2, Clock, DollarSign, Gift, Lock, UserCheck, Users, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getDashboard } from "@/features/admin/admin-queries";
import { StatCard } from "@/features/admin/components/stat-card";
import { formatBRL } from "@/lib/money";
import { getDb } from "@/server/db";

const dateTime = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });

export default async function AdminOverviewPage() {
  const d = await getDashboard(getDb());

  return (
    <>
      <h1 className="font-display text-2xl font-semibold">Visão geral da festa</h1>

      <section aria-label="Convidados" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Convidados confirmados" value={d.rsvp.confirmedGuests} hint={`${d.rsvp.declinedGuests} não irão`} icon={<UserCheck className="size-6" />} testId="stat-confirmed" />
        <StatCard label="Total de adultos" value={d.rsvp.adults} hint="confirmados" icon={<Users className="size-6" />} testId="stat-adults" />
        <StatCard label="Total de crianças" value={d.rsvp.children} hint="para as lembrancinhas" icon={<Baby className="size-6" />} tone="highlight" testId="stat-children" />
        <StatCard label="Total de pessoas" value={d.rsvp.totalPeople} hint="adultos + crianças" icon={<UsersRound className="size-6" />} testId="stat-people" />
      </section>

      <section aria-label="Presentes e pagamentos" className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatCard label="Presentes disponíveis" value={d.gifts.available} hint={`de ${d.gifts.total} na lista`} icon={<Gift className="size-6" />} />
        <StatCard label="Reservados" value={d.gifts.reserved} icon={<Lock className="size-6" />} />
        <StatCard label="Presenteados" value={d.gifts.purchased} icon={<CheckCircle2 className="size-6" />} />
        <Link href="/admin/pagamentos" className="contents">
          <StatCard label="Pagamentos pendentes" value={d.pendingPayments} hint="aguardando sua confirmação" icon={<Clock className="size-6" />} tone={d.pendingPayments ? "highlight" : "default"} testId="stat-pending" />
        </Link>
        <StatCard label="Valor confirmado" value={formatBRL(d.confirmedValueInCents)} hint={`${d.confirmedOrders} pedidos`} icon={<DollarSign className="size-6" />} />
      </section>

      <section className="paper-card p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Últimos convidados confirmados</h2>
          <Link href="/admin/convidados" className="text-sm font-bold text-forest-dark underline underline-offset-2">
            Ver todos
          </Link>
        </div>
        {d.recentRsvps.length === 0 ? (
          <p className="py-4 text-center text-sm text-ink-soft">Ninguém confirmou ainda.</p>
        ) : (
          <ul className="divide-y divide-line">
            {d.recentRsvps.map((r) => (
              <li key={r.id} className="flex items-center gap-3 py-2.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-sky font-bold text-[#1d5a6b]" aria-hidden>
                  {(r.guest.name ?? "?").slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{r.guest.name ?? "Sem nome"}</p>
                  <p className="text-xs text-ink-soft">
                    {r.adults} {r.adults === 1 ? "adulto" : "adultos"} • {r.children} {r.children === 1 ? "criança" : "crianças"}
                  </p>
                </div>
                <span className="hidden text-xs text-ink-soft sm:inline">{dateTime.format(r.updatedAt)}</span>
                <Badge tone="success">Confirmado</Badge>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
