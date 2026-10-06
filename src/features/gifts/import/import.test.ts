import { describe, expect, it } from "vitest";
import { cleanTitle, detectSource, extractProductMetadata, parsePriceToCents, titleFromUrl } from "./extract";
import { safeFetchHtml } from "./safe-fetch";
import { assertSafeUrl, isPublicIp, UnsafeUrlError } from "./url-guard";

describe("proteção SSRF", () => {
  it.each([
    "http://localhost/admin",
    "http://127.0.0.1/",
    "http://127.1.2.3/",
    "http://[::1]/",
    "http://10.0.0.5/",
    "http://172.20.1.1/",
    "http://192.168.0.10/",
    "http://169.254.169.254/latest/meta-data/",
    "http://100.64.0.1/",
    "http://0.0.0.0/",
    "http://[fd00::1]/",
    "http://[fe80::1]/",
    "http://[::ffff:127.0.0.1]/",
    "http://[::ffff:a9fe:a9fe]/",
    "http://metadata.google.internal/",
    "http://intranet/",
    "file:///etc/passwd",
    "ftp://example.com/x",
    "javascript:alert(1)",
    "https://user:pass@example.com/",
    "https://example.com:8080/",
    "não é url",
  ])("bloqueia %s", (url) => {
    expect(() => assertSafeUrl(url)).toThrow(UnsafeUrlError);
  });

  it.each(["https://br.shp.ee/abc123", "https://shopee.com.br/produto-i.1.2", "http://example.com/a?b=c"])("aceita %s", (url) => {
    expect(assertSafeUrl(url)).toBeInstanceOf(URL);
  });

  it("classifica IPs", () => {
    expect(isPublicIp("8.8.8.8")).toBe(true);
    expect(isPublicIp("2606:4700:4700::1111")).toBe(true);
    expect(isPublicIp("192.168.1.1")).toBe(false);
    expect(isPublicIp("::ffff:10.0.0.1")).toBe(false);
  });

  it("safeFetchHtml recusa endereço interno antes de qualquer conexão", async () => {
    await expect(safeFetchHtml("http://127.0.0.1:80/")).rejects.toThrow(UnsafeUrlError);
  });
});

describe("extração de metadados", () => {
  it("lê JSON-LD Product", () => {
    const html = `<html><head>
      <script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"Product","name":"Pista de Carrinhos Hot Wheels","image":["https://cdn.loja.com/pista.jpg"],"offers":{"@type":"Offer","price":"149.90","priceCurrency":"BRL"}}]}</script>
      <link rel="canonical" href="https://loja.com/p/pista"></head></html>`;
    expect(extractProductMetadata(html, "https://loja.com/x")).toEqual({
      title: "Pista de Carrinhos Hot Wheels",
      priceInCents: 14990,
      imageUrl: "https://cdn.loja.com/pista.jpg",
      canonicalUrl: "https://loja.com/p/pista",
      source: "loja.com",
    });
  });

  it("cai para OpenGraph e resolve imagem relativa", () => {
    const html = `<head><meta property="og:title" content="Livro Infantil | Shopee Brasil">
      <meta property="og:image" content="/img/livro.png"><meta property="product:price:amount" content="89.9"></head>`;
    expect(extractProductMetadata(html, "https://shopee.com.br/Livro-i.1.2")).toMatchObject({
      title: "Livro Infantil",
      priceInCents: 8990,
      imageUrl: "https://shopee.com.br/img/livro.png",
      source: "Shopee",
    });
  });

  it("não aceita imagem com esquema perigoso", () => {
    const html = `<meta property="og:image" content="javascript:alert(1)"><title>X</title>`;
    expect(extractProductMetadata(html, "https://a.com").imageUrl).toBeUndefined();
  });

  it("HTML sem metadados retorna só o que der", () => {
    expect(extractProductMetadata("<html></html>", "https://shopee.com.br/Bola-Colorida-i.10.20")).toMatchObject({
      title: "Bola Colorida",
      priceInCents: undefined,
      source: "Shopee",
    });
  });

  it("helpers", () => {
    expect(parsePriceToCents("149.90")).toBe(14990);
    expect(parsePriceToCents("R$ 1.234,56")).toBe(123456);
    expect(parsePriceToCents(35.9)).toBe(3590);
    expect(parsePriceToCents("grátis")).toBeUndefined();
    expect(detectSource("https://br.shp.ee/abc")).toBe("Shopee");
    expect(detectSource("https://produto.mercadolivre.com.br/x")).toBe("Mercado Livre");
    expect(cleanTitle("  Pelúcia   Leão - Shopee Brasil ")).toBe("Pelúcia Leão");
    expect(titleFromUrl("https://example.com/a-i.1.2")).toBeUndefined();
  });
});
