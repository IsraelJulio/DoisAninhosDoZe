import * as cheerio from "cheerio";
import { parseBRLToCents } from "@/lib/money";

// Extração de metadados de produto a partir de HTML estático (sem executar JavaScript).
// Fontes, em ordem: JSON-LD (schema.org Product) → OpenGraph/meta → microdata → <title>.

export interface ExtractedProduct {
  title?: string;
  priceInCents?: number;
  imageUrl?: string;
  canonicalUrl?: string;
  source: string;
}

const STORES: [RegExp, string][] = [
  [/(^|\.)shopee\.|(^|\.)shp\.ee$/, "Shopee"],
  [/(^|\.)amazon\.|(^|\.)amzn\./, "Amazon"],
  [/(^|\.)mercadoli(vre|bre)\./, "Mercado Livre"],
  [/(^|\.)(magazineluiza|magalu)\./, "Magalu"],
  [/(^|\.)americanas\./, "Americanas"],
  [/(^|\.)aliexpress\./, "AliExpress"],
  [/(^|\.)casasbahia\./, "Casas Bahia"],
  [/(^|\.)ricardoeletro|(^|\.)submarino\./, "Submarino"],
  [/(^|\.)rihappy\./, "Ri Happy"],
  [/(^|\.)pbkids\./, "PBKIDS"],
];

export function detectSource(url: string): string {
  try {
    const host = new URL(url).hostname.toLowerCase();
    for (const [pattern, name] of STORES) if (pattern.test(host)) return name;
    return host.replace(/^www\./, "");
  } catch {
    return "Outro";
  }
}

/** Preço vindo de metadados: "149.90" (padrão schema.org) ou "R$ 149,90". */
export function parsePriceToCents(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return Math.round(value * 100);
  if (typeof value !== "string") return undefined;
  const v = value.trim();
  if (/^\d+(\.\d{1,2})?$/.test(v)) {
    const [i, d = ""] = v.split(".");
    const cents = Number(i) * 100 + Number(d.padEnd(2, "0"));
    return cents > 0 ? cents : undefined;
  }
  const cents = parseBRLToCents(v);
  return cents && cents > 0 ? cents : undefined;
}

export function cleanTitle(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const title = raw
    .replace(/\s+/g, " ")
    .replace(/\s*[|\-–—]\s*(Shopee Brasil|Shopee|Amazon\.com\.br.*|Mercado Livre|Magalu|Americanas).*$/i, "")
    .trim()
    .slice(0, 120)
    .trim();
  return title || undefined;
}

/** Título a partir do caminho da URL da Shopee: /Nome-Do-Produto-i.123.456 → "Nome Do Produto". */
export function titleFromUrl(url: string): string | undefined {
  try {
    const { pathname, hostname } = new URL(url);
    if (!/shopee\./.test(hostname)) return undefined;
    const match = decodeURIComponent(pathname).match(/^\/(.+?)-i\.\d+\.\d+/);
    return match ? cleanTitle(match[1]!.replace(/-/g, " ")) : undefined;
  } catch {
    return undefined;
  }
}

function absoluteHttpUrl(value: string | undefined, base: string): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value.trim(), base);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

type Json = Record<string, unknown>;

function findProductNodes(data: unknown, out: Json[] = []): Json[] {
  if (Array.isArray(data)) data.forEach((d) => findProductNodes(d, out));
  else if (data && typeof data === "object") {
    const node = data as Json;
    const type = node["@type"];
    if (type === "Product" || (Array.isArray(type) && type.includes("Product"))) out.push(node);
    if (node["@graph"]) findProductNodes(node["@graph"], out);
  }
  return out;
}

function firstString(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return firstString(value[0]);
  if (value && typeof value === "object" && "url" in value) return firstString((value as Json).url);
  return undefined;
}

function offerPrice(offers: unknown): number | undefined {
  const list = Array.isArray(offers) ? offers : [offers];
  for (const offer of list) {
    if (!offer || typeof offer !== "object") continue;
    const o = offer as Json;
    const price = parsePriceToCents(o.price ?? o.lowPrice ?? (o.priceSpecification as Json | undefined)?.price);
    if (price) return price;
  }
  return undefined;
}

export function extractProductMetadata(html: string, pageUrl: string): ExtractedProduct {
  const $ = cheerio.load(html);
  const meta = (selector: string) => $(selector).first().attr("content")?.trim() || undefined;

  let title: string | undefined;
  let priceInCents: number | undefined;
  let image: string | undefined;

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const products = findProductNodes(JSON.parse($(el).text()));
      for (const p of products) {
        title ??= typeof p.name === "string" ? p.name : undefined;
        image ??= firstString(p.image);
        priceInCents ??= offerPrice(p.offers);
      }
    } catch {
      // JSON-LD malformado: ignora
    }
  });

  title ??= meta('meta[property="og:title"]') ?? meta('meta[name="twitter:title"]') ?? ($("title").first().text() || undefined);
  image ??=
    meta('meta[property="og:image:secure_url"]') ??
    meta('meta[property="og:image"]') ??
    meta('meta[name="twitter:image"]') ??
    $('link[rel="image_src"]').attr("href");
  priceInCents ??=
    parsePriceToCents(meta('meta[property="product:price:amount"]')) ??
    parsePriceToCents(meta('meta[property="og:price:amount"]')) ??
    parsePriceToCents($('[itemprop="price"]').first().attr("content") ?? $('[itemprop="price"]').first().text());

  const canonical =
    absoluteHttpUrl($('link[rel="canonical"]').attr("href"), pageUrl) ?? absoluteHttpUrl(meta('meta[property="og:url"]'), pageUrl);

  return {
    title: cleanTitle(title) ?? titleFromUrl(canonical ?? pageUrl),
    priceInCents,
    imageUrl: absoluteHttpUrl(image, pageUrl),
    canonicalUrl: canonical ?? pageUrl,
    source: detectSource(canonical ?? pageUrl),
  };
}
