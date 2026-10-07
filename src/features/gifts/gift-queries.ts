import type { Db } from "@/server/db";
import { computeGiftAvailability, type GiftAvailability, type GiftHolds } from "./gift-availability";
import { getGiftHolds } from "./gift-holds";

export interface GiftView extends GiftAvailability {
  id: string;
  title: string;
  description: string | null;
  priceInCents: number;
  imageUrl: string | null;
  source: string | null;
  category: string;
  stockQuantity: number;
}

const SELECT = {
  id: true,
  title: true,
  description: true,
  priceInCents: true,
  imageUrl: true,
  source: true,
  category: true,
  stockQuantity: true,
  active: true,
} as const;

/**
 * Lista pública: presentes ativos. A disponibilidade é a do convidado da sessão — os que ele já
 * reservou ou presenteou aparecem indisponíveis só para ele. Sem convidado, todos ficam disponíveis.
 */
export async function listPublicGifts(db: Db, now = new Date(), category?: string, guestId?: string): Promise<GiftView[]> {
  const gifts = await db.gift.findMany({
    where: { active: true, ...(category ? { category } : {}) },
    select: SELECT,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  const holds = guestId ? await getGiftHolds(db, now, { giftIds: gifts.map((g) => g.id), guestId }) : new Map<string, GiftHolds>();
  const views = gifts.map(({ active, ...g }) => ({ ...g, ...computeGiftAvailability({ ...g, active }, holds.get(g.id)) }));
  // disponíveis primeiro, os que o convidado já presenteou por último
  const rank = { AVAILABLE: 0, RESERVED: 1, PURCHASED: 2, INACTIVE: 3 } as const;
  return views.sort((a, b) => rank[a.status] - rank[b.status]);
}

export async function listGiftCategories(db: Db): Promise<string[]> {
  const rows = await db.gift.findMany({ where: { active: true }, select: { category: true }, distinct: ["category"] });
  return rows.map((r) => r.category).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

export async function getPublicGift(db: Db, id: string, now = new Date(), guestId?: string): Promise<GiftView | null> {
  const gift = await db.gift.findFirst({ where: { id, active: true }, select: SELECT });
  if (!gift) return null;
  const holds = guestId ? await getGiftHolds(db, now, { giftIds: [id], guestId }) : new Map<string, GiftHolds>();
  const { active, ...rest } = gift;
  return { ...rest, ...computeGiftAvailability({ ...rest, active }, holds.get(id)) };
}
