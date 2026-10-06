import type { Db } from "@/server/db";
import { detectSource, extractProductMetadata, titleFromUrl } from "./extract";
import { safeFetchHtml, type FetchedPage } from "./safe-fetch";
import { assertSafeUrl, UnsafeUrlError } from "./url-guard";

export interface ImportPreview {
  importId: string;
  status: "SUCCESS" | "PARTIAL" | "FAILED";
  originalUrl: string;
  resolvedUrl: string;
  title?: string;
  priceInCents?: number;
  imageUrl?: string;
  source: string;
  message?: string;
}

const PARTIAL_MESSAGE = "Não foi possível obter todas as informações automaticamente.";

/**
 * Tenta montar uma prévia do presente a partir de um link de loja. Nunca bloqueia o cadastro:
 * qualquer falha vira um preview parcial/vazio para o admin completar manualmente.
 * O preço importado é só sugestão; o preço salvo no nosso banco é a referência do Pix.
 */
export async function importGiftFromUrl(
  db: Db,
  rawUrl: string,
  fetcher: (url: string) => Promise<FetchedPage> = safeFetchHtml,
): Promise<ImportPreview> {
  const originalUrl = assertSafeUrl(rawUrl).toString(); // URL inválida/interna: erro imediato para o admin

  let result: Omit<ImportPreview, "importId">;
  let error: string | undefined;
  try {
    const page = await fetcher(originalUrl);
    const extracted = page.html
      ? extractProductMetadata(page.html, page.finalUrl)
      : { title: titleFromUrl(page.finalUrl), source: detectSource(page.finalUrl), canonicalUrl: page.finalUrl };
    const found = [extracted.title, "priceInCents" in extracted && extracted.priceInCents, "imageUrl" in extracted && extracted.imageUrl];
    const complete = found.every(Boolean);
    if (!page.html) error = `Resposta HTTP ${page.status}`;
    result = {
      status: complete ? "SUCCESS" : found.some(Boolean) ? "PARTIAL" : "FAILED",
      originalUrl,
      resolvedUrl: extracted.canonicalUrl ?? page.finalUrl,
      title: extracted.title,
      priceInCents: "priceInCents" in extracted ? extracted.priceInCents : undefined,
      imageUrl: "imageUrl" in extracted ? extracted.imageUrl : undefined,
      source: extracted.source,
      message: complete ? undefined : PARTIAL_MESSAGE,
    };
  } catch (e) {
    error = e instanceof UnsafeUrlError ? e.message : e instanceof Error ? e.message.slice(0, 300) : "Erro desconhecido";
    result = {
      status: "FAILED",
      originalUrl,
      resolvedUrl: originalUrl,
      title: titleFromUrl(originalUrl),
      source: detectSource(originalUrl),
      message: PARTIAL_MESSAGE,
    };
  }

  const record = await db.giftImport.create({
    data: {
      originalUrl,
      resolvedUrl: result.resolvedUrl,
      extractedTitle: result.title,
      extractedPrice: result.priceInCents,
      extractedImage: result.imageUrl,
      source: result.source,
      status: result.status,
      error,
    },
  });
  return { importId: record.id, ...result };
}
