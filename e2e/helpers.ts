import { expect, type Page } from "@playwright/test";

let counter = Date.now() % 10_000_000;

/** Celular válido e único por teste: (31) 9XXXX-XXXX */
export function uniquePhone(): string {
  counter += 1;
  return `319${String(counter).padStart(8, "0").slice(-8)}`;
}

export async function identify(page: Page, phone: string) {
  await page.getByLabel("Número de celular com DDD").fill(phone);
  await page.getByRole("button", { name: "Continuar" }).click();
}

export async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, "overflow horizontal").toBeLessThanOrEqual(0);
}
