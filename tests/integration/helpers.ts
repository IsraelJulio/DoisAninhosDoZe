import { execSync } from "node:child_process";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Testes de integração rodam contra um PostgreSQL REAL (TEST_DATABASE_URL), porque o que
 * queremos provar — travas de linha e transações concorrentes — não pode ser simulado.
 * Local: `npm run db:local` cria o banco jose_test.
 */
export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
export const hasTestDb = Boolean(TEST_DATABASE_URL);

let migrated = false;

export function createTestDb(): PrismaClient {
  if (!TEST_DATABASE_URL) throw new Error("TEST_DATABASE_URL não configurada");
  if (TEST_DATABASE_URL === process.env.DATABASE_URL) {
    throw new Error("TEST_DATABASE_URL não pode ser o mesmo banco de DATABASE_URL (os testes apagam dados)");
  }
  if (!migrated) {
    execSync("npx prisma migrate deploy", {
      env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
      stdio: "pipe",
    });
    migrated = true;
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: TEST_DATABASE_URL, max: 10 }) });
}

export async function resetDb(db: PrismaClient) {
  await db.$executeRawUnsafe(
    `TRUNCATE "AdminAuditLog", "Payment", "OrderItem", "Order", "CartItem", "Cart", "GiftImport", "Gift", "Rsvp", "Guest", "Event" RESTART IDENTITY CASCADE`,
  );
}

let phoneSeq = 0;
export async function createGuest(db: PrismaClient, name = "Convidado") {
  phoneSeq += 1;
  return db.guest.create({ data: { phone: `+55319${String(10000000 + phoneSeq).slice(-8)}`, name } });
}

export async function createGift(db: PrismaClient, data: { title?: string; priceInCents?: number; stockQuantity?: number } = {}) {
  return db.gift.create({
    data: { title: data.title ?? "Presente", priceInCents: data.priceInCents ?? 10000, stockQuantity: data.stockQuantity ?? 1 },
  });
}

export async function putInCart(db: PrismaClient, guestId: string, giftId: string, quantity = 1) {
  const cart = await db.cart.upsert({ where: { guestId }, update: {}, create: { guestId } });
  await db.cartItem.upsert({
    where: { cartId_giftId: { cartId: cart.id, giftId } },
    update: { quantity },
    create: { cartId: cart.id, giftId, quantity },
  });
}
