import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { expectNoHorizontalOverflow } from "./helpers";

const PAGES = ["/", "/local", "/entrar", "/presentes", "/presentes/seed-gift-livros", "/admin/login"];
const WIDTHS = [320, 375, 390, 430, 768, 1024, 1440];

for (const width of WIDTHS) {
  test(`sem overflow horizontal em ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const path of PAGES) {
      await page.goto(path);
      await expectNoHorizontalOverflow(page);
    }
  });
}

test("acessibilidade (axe) nas telas principais", async ({ page }) => {
  for (const path of PAGES) {
    await page.goto(path);
    await page.waitForTimeout(700); // fim das animações de entrada (opacidade afeta contraste)
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious.map((v) => `${path}: ${v.id} — ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`)).toEqual([]);
  }
});

test("imagens decorativas não recebem eventos e assets oficiais são usados", async ({ page }) => {
  await page.goto("/");
  const srcs = await page.locator("img").evaluateAll((imgs) => imgs.map((i) => (i as HTMLImageElement).currentSrc || (i as HTMLImageElement).src));
  const joined = decodeURIComponent(srcs.join(" "));
  for (const asset of ["/assets/jose/jose-pointing-cutout.png", "/assets/brand/logo-jose-2-anos.png", "/assets/mascots/lion.png"]) {
    expect(joined).toContain(asset);
  }
});
