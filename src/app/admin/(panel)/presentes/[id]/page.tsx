import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GiftForm } from "@/features/admin/components/gift-form";
import { getDb } from "@/server/db";

export const metadata: Metadata = { title: "Editar presente" };

export default async function EditGiftPage({ params }: PageProps<"/admin/presentes/[id]">) {
  const { id } = await params;
  const db = getDb();
  const [gift, categoryRows] = await Promise.all([
    db.gift.findUnique({ where: { id } }),
    db.gift.findMany({ distinct: ["category"], select: { category: true } }),
  ]);
  if (!gift) notFound();

  return (
    <>
      <Link href="/admin/presentes" className="text-sm font-bold text-forest-dark underline underline-offset-2">
        ← Presentes
      </Link>
      <h1 className="font-display text-2xl font-semibold">{gift.title}</h1>
      <p className="text-sm text-ink-soft">
        Alterar o preço não afeta pedidos já reservados ou pagos (eles guardam o valor da época).
      </p>
      <GiftForm
        categories={categoryRows.map((c) => c.category)}
        initial={{
          id: gift.id,
          title: gift.title,
          description: gift.description ?? "",
          price: (gift.priceInCents / 100).toFixed(2).replace(".", ","),
          category: gift.category,
          stockQuantity: gift.stockQuantity,
          imageUrl: gift.imageUrl?.startsWith("/assets/") ? "" : (gift.imageUrl ?? ""),
          sourceUrl: gift.sourceUrl ?? "",
          source: gift.source ?? "",
          active: gift.active,
        }}
      />
    </>
  );
}
