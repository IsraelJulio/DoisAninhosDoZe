import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const baseURL = process.env.BASE_URL ?? "http://localhost:3100";
const output = path.resolve("artifacts/final-review");
await mkdir(output, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "pt-BR" });
const page = await context.newPage();

async function shot(name) {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(output, name), animations: "disabled" });
  console.log(`${name}: ${await page.title()} (${page.url()})`);
}

await page.goto(`${baseURL}/`);
await shot("home-mobile.png");
await page.goto(`${baseURL}/local`);
await shot("local-mobile.png");

await page.goto(`${baseURL}/entrar?next=/presenca`);
const phone = `(31) 9${String(Date.now()).slice(-8)}`;
await page.getByLabel("Número de celular com DDD").fill(phone);
const identificationTransition = page.waitForURL(/etapa=nome|\/presenca/);
await page.getByRole("button", { name: "Continuar" }).click();
await identificationTransition;
if (page.url().includes("etapa=nome")) {
  await page.getByLabel("Seu nome completo").fill("Revisão Visual");
  const nameTransition = page.waitForURL(/\/presenca/);
  await page.getByRole("button", { name: "Continuar" }).click();
  await nameTransition;
}
await shot("rsvp-mobile.png");

await page.goto(`${baseURL}/entrar?etapa=nome&next=/presentes`);
await page.getByLabel("Seu nome completo").fill("Revisão Visual");
const giftsTransition = page.waitForURL(/\/presentes$/);
await page.getByRole("button", { name: "Continuar" }).click();
await giftsTransition;
await shot("gifts-mobile.png");
const available = page.getByTestId("gift-card").filter({ hasText: "Disponível" }).first();
await available.getByRole("link").first().click();
await page.getByRole("button", { name: "Adicionar ao carrinho" }).click();
await page.getByText("Adicionado ao carrinho!").waitFor();
await page.goto(`${baseURL}/carrinho`);
await shot("cart-mobile.png");
await page.getByRole("button", { name: "Ir para pagamento" }).click();
await page.waitForLoadState("networkidle");
await page.getByRole("link", { name: /Ir para pagamento via Pix/ }).click();
await page.waitForLoadState("networkidle");
await shot("pix-mobile.png");
const orderUrl = page.url();
await page.getByRole("button", { name: "Já fiz o pagamento" }).click();
await page.waitForLoadState("networkidle");

const adminContext = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "pt-BR" });
const admin = await adminContext.newPage();
await admin.goto(`${baseURL}/admin/login`);
await admin.getByLabel("Usuário").fill(process.env.ADMIN_USERNAME ?? "e2e-admin");
await admin.getByLabel("Senha").fill(process.env.ADMIN_PASSWORD ?? "e2e-admin-password-123");
await admin.getByRole("button", { name: "Entrar" }).click();
await admin.waitForURL(/\/admin$/);
await admin.screenshot({ path: path.join(output, "admin-mobile.png"), animations: "disabled" });
await admin.goto(`${baseURL}/admin/pagamentos`);
const order = admin.getByTestId("admin-order").filter({ hasText: "Revisão Visual" });
await order.getByRole("button", { name: "Confirmar Pix" }).click();
await admin.getByRole("button", { name: "Sim, encontrei o Pix" }).click();
await adminContext.close();

await page.goto(orderUrl.replace("/pagamento/", "/pedido/"));
await page.getByRole("heading", { name: "Presente confirmado!" }).waitFor();
await shot("success-mobile.png");

await browser.close();
