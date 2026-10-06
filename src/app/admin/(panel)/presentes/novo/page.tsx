import { requireAdmin } from "@/server/session/admin-session";
import type { Metadata } from "next";
import Link from "next/link";
import { GiftForm } from "@/features/admin/components/gift-form";
import { getDb } from "@/server/db";

export const metadata: Metadata = { title: "Novo presente" };

export default async function NewGiftPage() {
  await requireAdmin(); // defesa em profundidade: não depender só do layout/proxy
  const categories = (await getDb().gift.findMany({ distinct: ["category"], select: { category: true } })).map((c) => c.category);
  return (
    <>
      <Link href="/admin/presentes" className="text-sm font-bold text-forest-dark underline underline-offset-2">
        ← Presentes
      </Link>
      <h1 className="font-display text-2xl font-semibold">Adicionar presente</h1>
      <GiftForm categories={categories} allowImport />
    </>
  );
}
