import type { Db } from "@/server/db";
import type { GiftFormInput } from "./gift-schema";

function toData(input: GiftFormInput) {
  return {
    title: input.title,
    description: input.description ?? null,
    priceInCents: input.price,
    category: input.category,
    stockQuantity: input.stockQuantity,
    imageUrl: input.imageUrl ?? null,
    sourceUrl: input.sourceUrl ?? null,
    source: input.source ?? (input.sourceUrl ? null : "Manual"),
    active: input.active,
  };
}

export async function createGift(db: Db, input: GiftFormInput) {
  const last = await db.gift.aggregate({ _max: { sortOrder: true } });
  const gift = await db.gift.create({ data: { ...toData(input), sortOrder: (last._max.sortOrder ?? 0) + 1 } });
  if (input.importId) {
    await db.giftImport.updateMany({ where: { id: input.importId, giftId: null }, data: { giftId: gift.id } });
  }
  await db.adminAuditLog.create({ data: { action: "GIFT_CREATED", entityType: "Gift", entityId: gift.id } });
  return gift;
}

/** O preço salvo aqui é a referência do Pix; nunca é atualizado automaticamente pela loja. */
export async function updateGift(db: Db, id: string, input: GiftFormInput) {
  const gift = await db.gift.update({ where: { id }, data: toData(input) });
  await db.adminAuditLog.create({
    data: { action: "GIFT_UPDATED", entityType: "Gift", entityId: id, metadata: { priceInCents: input.price } },
  });
  return gift;
}

export async function setGiftActive(db: Db, id: string, active: boolean) {
  await db.gift.update({ where: { id }, data: { active } });
  await db.adminAuditLog.create({ data: { action: active ? "GIFT_ACTIVATED" : "GIFT_DEACTIVATED", entityType: "Gift", entityId: id } });
}

/** Exclusão física só sem pedidos relacionados; caso contrário, desativa (active=false). */
export async function deleteOrDeactivateGift(db: Db, id: string): Promise<"deleted" | "deactivated"> {
  const used = await db.orderItem.count({ where: { giftId: id } });
  if (used > 0) {
    await setGiftActive(db, id, false);
    return "deactivated";
  }
  await db.gift.delete({ where: { id } });
  await db.adminAuditLog.create({ data: { action: "GIFT_DELETED", entityType: "Gift", entityId: id } });
  return "deleted";
}
