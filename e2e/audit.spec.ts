import { expect, test, type Page } from "@playwright/test";
import { E2E_ADMIN } from "../playwright.config";
import { expectNoHorizontalOverflow, uniquePhone } from "./helpers";

const DEVICES = [
  { width: 320, height: 568 },
  { width: 360, height: 800 },
  { width: 375, height: 812 },
  { width: 390, height: 844 },
  { width: 393, height: 852 },
  { width: 430, height: 932 },
];

/** Nada cortado na lateral: todo elemento visível cabe na largura da tela. */
async function expectNothingClippedHorizontally(page: Page) {
  const offenders = await page.evaluate(() => {
    const vw = window.innerWidth;
    return [...document.querySelectorAll("main button, main a, main input, main textarea, main img[alt]:not([alt=''])")]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        if (el.closest("[data-scroll-x]")) return false; // faixas de rolagem horizontal intencionais (chips/abas)
        return r.width > 0 && (r.left < -1 || r.right > vw + 1);
      })
      .map((el) => el.outerHTML.slice(0, 80));
  });
  expect(offenders).toEqual([]);
}

test("convidado volta pelo link depois de fechar o navegador e é reconhecido", async ({ browser }) => {
  const first = await browser.newContext();
  const page = await first.newPage();
  await page.goto("/entrar?next=/presenca");
  // colagem típica do WhatsApp, com +55 e caracteres invisíveis
  await page.getByLabel("Número de celular com DDD").fill(`‪+55 31 9${uniquePhone().slice(3, 7)}‑${uniquePhone().slice(-4)}‬`);
  await expect(page.getByLabel("Número de celular com DDD")).toHaveValue(/^\(31\) 9\d{4}-\d{4}$/);
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.waitForURL(/\/presenca$/);
  await page.getByLabel("Nome do convidado").fill("Carla Volta");
  await page.getByRole("button", { name: "Sim, eu vou!" }).click();
  await page.getByRole("button", { name: "Enviar confirmação" }).click();
  await expect(page.getByRole("heading", { name: "Presença confirmada!" })).toBeVisible();
  const cookies = await first.cookies();
  expect(cookies.find((c) => c.name === "jose_guest")).toMatchObject({ httpOnly: true, sameSite: "Lax" });
  expect(cookies.find((c) => c.name === "jose_guest")!.expires).toBeGreaterThan(Date.now() / 1000 + 60 * 60 * 24 * 30);
  const state = await first.storageState();
  await first.close();

  // "abre o navegador de novo" com os cookies persistidos
  const again = await browser.newContext({ storageState: state });
  const page2 = await again.newPage();
  await page2.goto("/presenca");
  await expect(page2).toHaveURL(/\/presenca$/);
  await expect(page2.getByRole("heading", { name: "Presença confirmada!" })).toBeVisible();
  await expect(page2.getByText("Muito obrigado, Carla!")).toBeVisible();
  await again.close();
});

test("telefone inválido mostra erro amigável", async ({ page }) => {
  await page.goto("/entrar");
  await page.getByLabel("Número de celular com DDD").fill("(00) 1234");
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByText(/Confira o número/)).toBeVisible();
});

test("telas autenticadas cabem nos tamanhos reais de celular (checkout, Pix, admin)", async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto("/entrar?next=/presentes");
  await page.getByLabel("Número de celular com DDD").fill(uniquePhone());
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByLabel("Seu nome completo").fill("Dani Telas");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.waitForURL(/\/presentes$/);
  await page.getByTestId("gift-card").filter({ hasText: "Livros Infantis" }).getByRole("button", { name: /Presentear/ }).click();
  await page.waitForURL(/\/carrinho$/);

  for (const size of DEVICES) {
    await page.setViewportSize(size);
    await page.goto("/carrinho");
    await expectNoHorizontalOverflow(page);
    await expectNothingClippedHorizontally(page);
  }
  await page.getByRole("button", { name: "Ir para pagamento" }).click();
  await page.waitForURL(/\/checkout$/);
  await page.getByRole("link", { name: /Ir para pagamento via Pix/ }).click();
  await page.waitForURL(/\/pagamento\//);
  const paymentUrl = page.url();

  for (const size of DEVICES) {
    await page.setViewportSize(size);
    for (const path of ["/checkout", paymentUrl, "/presenca", "/presentes"]) {
      await page.goto(path);
      await expectNoHorizontalOverflow(page);
      await expectNothingClippedHorizontally(page);
    }
    await page.goto(paymentUrl);
    await expect(page.getByTestId("pix-qr"), `QR em ${size.width}px`).toBeVisible();
    const qr = await page.getByTestId("pix-qr").boundingBox();
    expect(qr!.x).toBeGreaterThanOrEqual(0);
    expect(qr!.x + qr!.width).toBeLessThanOrEqual(size.width);
    expect(qr!.width).toBeGreaterThanOrEqual(180); // legível para escanear
  }
  await ctx.close();

  // admin + modal de confirmação no menor celular
  const admin = await browser.newContext({ viewport: { width: 320, height: 568 } });
  const ap = await admin.newPage();
  await ap.goto("/admin/login");
  await ap.getByLabel("Usuário").fill(E2E_ADMIN.username);
  await ap.getByLabel("Senha").fill(E2E_ADMIN.password);
  await ap.getByRole("button", { name: "Entrar" }).click();
  await ap.waitForURL(/\/admin$/);
  for (const path of ["/admin", "/admin/convidados", "/admin/presentes", "/admin/presentes/novo", "/admin/pagamentos?aba=reserved"]) {
    await ap.goto(path);
    await expectNoHorizontalOverflow(ap);
  }
  await ap.getByTestId("admin-order").first().getByRole("button", { name: "Cancelar pedido" }).click();
  const dialog = ap.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const box = await dialog.boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(320);
  await dialog.getByRole("button", { name: "Voltar" }).click();
  await admin.close();
});
