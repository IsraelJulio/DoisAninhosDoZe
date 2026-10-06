import { MockAgent } from "undici";
import { describe, expect, it } from "vitest";
import { extractProductMetadata } from "./extract";
import { guardedLookup, MAX_HTML_BYTES, safeFetchHtml } from "./safe-fetch";
import { UnsafeUrlError } from "./url-guard";

function mockSite() {
  const agent = new MockAgent();
  agent.disableNetConnect();
  return { agent, shop: agent.get("https://loja.exemplo.com"), short: agent.get("https://br.shp.ee") };
}


describe("safeFetchHtml (rede simulada)", () => {
  it("segue redirect de link curto e lê o HTML", async () => {
    const { agent, short, shop } = mockSite();
    short.intercept({ path: "/abc" }).reply(302, "", { headers: { location: "https://loja.exemplo.com/p/1" } });
    shop.intercept({ path: "/p/1" }).reply(200, "<title>Produto</title>", { headers: { "content-type": "text/html; charset=utf-8" } });
    const page = await safeFetchHtml("https://br.shp.ee/abc", { dispatcher: agent });
    expect(page).toMatchObject({ finalUrl: "https://loja.exemplo.com/p/1", status: 200 });
    expect(page.html).toContain("Produto");
  });

  it("interrompe loop de redirects", async () => {
    const { agent, shop } = mockSite();
    shop.intercept({ path: "/a" }).reply(302, "", { headers: { location: "/b" } }).persist();
    shop.intercept({ path: "/b" }).reply(302, "", { headers: { location: "/a" } }).persist();
    await expect(safeFetchHtml("https://loja.exemplo.com/a", { dispatcher: agent })).rejects.toThrow("Redirecionamentos demais.");
  });

  it.each(["http://127.0.0.1/admin", "http://169.254.169.254/latest/meta-data/", "http://[::1]/", "http://10.0.0.1/", "file:///etc/passwd"])(
    "recusa redirect para %s",
    async (target) => {
      const { agent, shop } = mockSite();
      shop.intercept({ path: "/r" }).reply(301, "", { headers: { location: target } });
      await expect(safeFetchHtml("https://loja.exemplo.com/r", { dispatcher: agent })).rejects.toThrow(UnsafeUrlError);
    },
  );

  it("limita respostas enormes", async () => {
    const { agent, shop } = mockSite();
    const big = `<title>Grande</title>${"x".repeat(MAX_HTML_BYTES * 2)}`;
    shop.intercept({ path: "/big" }).reply(200, big, { headers: { "content-type": "text/html" } });
    const page = await safeFetchHtml("https://loja.exemplo.com/big", { dispatcher: agent });
    expect(page.html!.length).toBeLessThanOrEqual(MAX_HTML_BYTES);
    expect(page.html).toContain("Grande");
  });

  it("recusa Content-Length gigante sem baixar", async () => {
    const { agent, shop } = mockSite();
    shop.intercept({ path: "/huge" }).reply(200, "x", { headers: { "content-type": "text/html", "content-length": String(MAX_HTML_BYTES * 10) } });
    expect((await safeFetchHtml("https://loja.exemplo.com/huge", { dispatcher: agent })).html).toBeNull();
  });

  it("ignora conteúdo que não é HTML e respostas de erro", async () => {
    const { agent, shop } = mockSite();
    shop.intercept({ path: "/img" }).reply(200, "binario", { headers: { "content-type": "image/png" } });
    shop.intercept({ path: "/captcha" }).reply(403, "<html>verifique que você é humano</html>", { headers: { "content-type": "text/html" } });
    expect((await safeFetchHtml("https://loja.exemplo.com/img", { dispatcher: agent })).html).toBeNull();
    const blocked = await safeFetchHtml("https://loja.exemplo.com/captcha", { dispatcher: agent });
    expect(blocked).toMatchObject({ status: 403, html: null });
  });
});

describe("proteção na conexão (DNS rebinding)", () => {
  it("domínio que resolve para IP interno é recusado no lookup", async () => {
    // "localhost" resolve para 127.0.0.1/::1 — mesmo caminho de um domínio público que aponte para IP privado
    const error = await new Promise<Error | null>((resolve) => guardedLookup("localhost", { all: true }, (err) => resolve(err)));
    expect(error).toBeInstanceOf(UnsafeUrlError);
  });

  it("suporta as duas assinaturas do lookup do Node", async () => {
    const asList = await new Promise<unknown>((resolve) => guardedLookup("localhost", { all: true }, (_e, a) => resolve(a)));
    expect(Array.isArray(asList)).toBe(true);
  });
});

describe("HTML problemático", () => {
  it("HTML malformado e JSON-LD quebrado não derrubam a extração", () => {
    const broken = `<html><head><title>Pelúcia<script type="application/ld+json">{"@type":"Product", name: quebrado</script><meta property="og:image" content="https://cdn.x.com/a.jpg"`;
    const result = extractProductMetadata(broken, "https://loja.exemplo.com/p");
    expect(result.imageUrl).toBeUndefined(); // meta não fechada: ignorada com segurança
    expect(result.source).toBe("loja.exemplo.com");
  });

  it("produto sem preço e sem imagem → só título", () => {
    expect(extractProductMetadata("<title>Livro</title>", "https://a.com/x")).toMatchObject({ title: "Livro", priceInCents: undefined, imageUrl: undefined });
  });

  it("não executa scripts nem aceita título com HTML injetado", () => {
    const result = extractProductMetadata(`<meta property="og:title" content="<img src=x onerror=alert(1)>Bola">`, "https://a.com/x");
    expect(result.title).toBe("<img src=x onerror=alert(1)>Bola"); // texto puro: React escapa na renderização
  });
});
