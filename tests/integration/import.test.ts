import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import { createGift } from "@/features/gifts/gift-admin-service";
import { giftFormSchema } from "@/features/gifts/gift-schema";
import { importGiftFromUrl } from "@/features/gifts/import/import-service";
import { UnsafeUrlError } from "@/features/gifts/import/url-guard";
import { createTestDb, hasTestDb, resetDb } from "./helpers";

describe.skipIf(!hasTestDb)("importador de presentes", () => {
  let db: PrismaClient;
  beforeAll(() => {
    db = createTestDb();
  });
  afterAll(async () => {
    await db?.$disconnect();
  });
  beforeEach(async () => {
    await resetDb(db);
  });

  it("importação completa gera prévia e registro", async () => {
    const html = `<meta property="og:title" content="Leão de Pelúcia"><meta property="og:image" content="https://cdn.x.com/leao.jpg"><meta property="product:price:amount" content="129.90">`;
    const preview = await importGiftFromUrl(db, "https://shopee.com.br/Leao-i.1.2", async (url) => ({ finalUrl: url, status: 200, html }));
    expect(preview).toMatchObject({ status: "SUCCESS", title: "Leão de Pelúcia", priceInCents: 12990, source: "Shopee" });
    const record = await db.giftImport.findUniqueOrThrow({ where: { id: preview.importId } });
    expect(record).toMatchObject({ status: "SUCCESS", extractedPrice: 12990 });
  });

  it("link curto bloqueado pela loja: usa a URL final e pede complemento manual", async () => {
    const preview = await importGiftFromUrl(db, "https://br.shp.ee/abc", async () => ({
      finalUrl: "https://shopee.com.br/Bicicleta-de-Equilibrio-i.99.88",
      status: 403,
      html: null,
    }));
    expect(preview).toMatchObject({ status: "PARTIAL", title: "Bicicleta de Equilibrio", source: "Shopee" });
    expect(preview.message).toBe("Não foi possível obter todas as informações automaticamente.");
  });

  it("falha de rede não impede o cadastro manual", async () => {
    const preview = await importGiftFromUrl(db, "https://loja.exemplo.com/produto", async () => {
      throw new Error("timeout");
    });
    expect(preview.status).toBe("FAILED");
    expect((await db.giftImport.findUniqueOrThrow({ where: { id: preview.importId } })).error).toBe("timeout");

    const gift = await createGift(
      db,
      giftFormSchema.parse({ title: "Cadastro manual", price: "50", category: "Livros", stockQuantity: "1", active: "on", importId: preview.importId, sourceUrl: preview.originalUrl }),
    );
    expect(gift.priceInCents).toBe(5000);
    expect((await db.giftImport.findUniqueOrThrow({ where: { id: preview.importId } })).giftId).toBe(gift.id);
  });

  it("URL interna é recusada antes de buscar", async () => {
    await expect(importGiftFromUrl(db, "http://169.254.169.254/latest", async () => ({ finalUrl: "", status: 200, html: "" }))).rejects.toThrow(
      UnsafeUrlError,
    );
  });
});
