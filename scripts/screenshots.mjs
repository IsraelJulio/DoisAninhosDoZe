// Utilitário de desenvolvimento: tira screenshots mobile e verifica overflow horizontal.
//   node scripts/screenshots.mjs <outDir> <width> <path1> [path2...]
// Variáveis: BASE_URL (padrão http://localhost:3000), COOKIE="nome=valor" opcional.
import { chromium } from "@playwright/test";
import path from "node:path";

const [outDir, widthArg, ...paths] = process.argv.slice(2);
const width = Number(widthArg ?? 390);
const base = process.env.BASE_URL ?? "http://localhost:3000";
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width, height: 844 }, deviceScaleFactor: 1 });
if (process.env.COOKIE) {
  for (const pair of process.env.COOKIE.split(";")) {
    const [name, ...rest] = pair.trim().split("=");
    await context.addCookies([{ name, value: rest.join("="), url: base }]);
  }
}
const page = await context.newPage();
for (const p of paths) {
  await page.goto(base + p, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  const file = path.join(outDir, `${width}-${p.replace(/[^a-z0-9]+/gi, "_") || "home"}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log(`${p} @${width}: overflow=${overflow}px -> ${file}`);
}
await browser.close();
