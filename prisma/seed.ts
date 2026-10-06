// Seed de desenvolvimento. Idempotente (upsert por id fixo).
// Em produção cria apenas o registro do evento — os presentes de exemplo só entram
// em desenvolvimento ou com SEED_EXAMPLE_GIFTS=true.
import "dotenv/config";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
const eventConfig = JSON.parse(readFileSync(new URL("../docs/event-config.json", import.meta.url), "utf8")) as {
  child: { name: string };
  event: { date: string; time: string };
};

const PLACEHOLDER = "/assets/placeholders/gift-placeholder.png";

const exampleGifts = [
  {
    id: "seed-gift-pista",
    title: "Pista de Carrinhos",
    description: "Uma pista cheia de aventura para muitas corridas! Idade sugerida: 2+ anos.",
    priceInCents: 14990,
    category: "Brinquedos",
    stockQuantity: 1,
  },
  {
    id: "seed-gift-livros",
    title: "Livros Infantis (kit 3 unidades)",
    description: "Livros com histórias incríveis para acompanhar o crescimento do José.",
    priceInCents: 8990,
    category: "Livros",
    stockQuantity: 2,
  },
  {
    id: "seed-gift-bicicleta",
    title: "Bicicleta de Equilíbrio",
    description: "Ajuda no desenvolvimento, equilíbrio e muita diversão ao ar livre! Idade sugerida: 2+ anos.",
    priceInCents: 19990,
    category: "Brinquedos",
    stockQuantity: 1,
  },
  {
    id: "seed-gift-leao",
    title: "Leão de Pelúcia",
    description: "Um amigão fofinho para as aventuras na selva.",
    priceInCents: 12990,
    category: "Brinquedos",
    stockQuantity: 1,
  },
  {
    id: "seed-gift-conjunto",
    title: "Conjunto Safari (tam. 2)",
    description: "Camiseta e bermuda com estampa de bichinhos.",
    priceInCents: 7990,
    category: "Roupas",
    stockQuantity: 2,
  },
  {
    id: "seed-gift-zoo",
    title: "Passeio no Zoológico",
    description: "Um dia de aventura em família conhecendo os bichos de verdade.",
    priceInCents: 15000,
    category: "Experiências",
    stockQuantity: 1,
  },
];

export async function seedDatabase(prisma: PrismaClient, seedGifts: boolean) {
  const { child, event } = eventConfig;
  await prisma.event.upsert({
    where: { slug: "jose-2-anos" },
    update: {},
    create: {
      slug: "jose-2-anos",
      childName: child.name,
      eventDate: new Date(`${event.date}T${event.time}:00-03:00`),
      reservationMinutes: 30,
    },
  });

  if (!seedGifts) {
    console.log("Produção: apenas o evento foi criado (presentes de exemplo ignorados).");
    return;
  }

  for (const [index, gift] of exampleGifts.entries()) {
    await prisma.gift.upsert({
      where: { id: gift.id },
      update: {},
      create: { ...gift, imageUrl: PLACEHOLDER, source: "Manual", sortOrder: index },
    });
  }
  console.log(`Seed concluído: evento + ${exampleGifts.length} presentes de exemplo.`);
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não configurada");
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  try {
    await seedDatabase(prisma, process.env.NODE_ENV !== "production" || process.env.SEED_EXAMPLE_GIFTS === "true");
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
