import type { Metadata } from "next";
import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { listGiftsForAdmin } from "@/features/admin/admin-queries";
import { GiftRowActions } from "@/features/admin/components/gift-row-actions";
import { GiftImage } from "@/features/gifts/components/gift-image";
import { GiftStatusBadge } from "@/features/gifts/components/gift-status-badge";
import { formatBRL } from "@/lib/money";
import { getDb } from "@/server/db";

export const metadata: Metadata = { title: "Presentes" };

export default async function AdminGiftsPage({ searchParams }: PageProps<"/admin/presentes">) {
  const params = await searchParams;
  const gifts = await listGiftsForAdmin(getDb());

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold">Presentes cadastrados</h1>
        <ButtonLink href="/admin/presentes/novo" size="sm">
          <Plus className="size-4" aria-hidden /> Novo
        </ButtonLink>
      </div>
      {params.salvo && <Notice tone="success">Presente salvo!</Notice>}

      {gifts.length === 0 ? (
        <p className="paper-card p-6 text-center text-ink-soft">Nenhum presente ainda. Comece adicionando um pelo link da loja.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {gifts.map((gift) => (
            <li key={gift.id} className="paper-card flex gap-3 p-3" data-testid="admin-gift">
              <GiftImage imageUrl={gift.imageUrl} alt={gift.title} size={72} className={`w-18 shrink-0 ${gift.active ? "" : "opacity-50"}`} />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="min-w-0 flex-1 font-bold leading-tight">{gift.title}</p>
                  {gift.active ? <GiftStatusBadge status={gift.status} /> : <Badge>Desativado</Badge>}
                </div>
                <p className="text-sm text-ink-soft">
                  <strong className="text-forest-dark">{formatBRL(gift.priceInCents)}</strong> • {gift.category} • estoque {gift.stockQuantity}
                  {gift.holds.reserved > 0 && ` • ${gift.holds.reserved} reservado(s)`}
                  {gift.holds.purchased > 0 && ` • ${gift.holds.purchased} presenteado(s)`}
                  {gift.source && ` • ${gift.source}`}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/admin/presentes/${gift.id}`} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-forest px-3 text-sm font-bold text-white">
                    <Pencil className="size-4" aria-hidden /> Editar
                  </Link>
                  <GiftRowActions giftId={gift.id} active={gift.active} hasOrders={gift.hasOrders} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
