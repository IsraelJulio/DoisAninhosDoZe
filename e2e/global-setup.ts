import "dotenv/config";
import { execSync } from "node:child_process";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { seedDatabase } from "../prisma/seed";

/** Banco E2E limpo: migrations + seed de desenvolvimento. */
export default async function globalSetup() {
  const url = process.env.E2E_DATABASE_URL!;
  if (url === process.env.DATABASE_URL) throw new Error("E2E_DATABASE_URL não pode ser o banco de desenvolvimento");
  const env = { ...process.env, DATABASE_URL: url };
  execSync("npx prisma migrate deploy", { env, stdio: "pipe" });
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  await db.$executeRawUnsafe(
    `TRUNCATE "AdminSession", "AdminLoginAttempt", "AdminAuditLog", "Payment", "OrderItem", "Order", "CartItem", "Cart", "GiftImport", "Gift", "Rsvp", "Guest", "Event" RESTART IDENTITY CASCADE`,
  );
  await seedDatabase(db, true);
  await db.$disconnect();
}
