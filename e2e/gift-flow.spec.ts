import { expect, test } from "@playwright/test";
import { E2E_ADMIN } from "../playwright.config";
import { identify, uniquePhone } from "./helpers";

test("presente → carrinho → reserva → Pix → já paguei → admin confirma → convidado vê confirmado", async ({ browser, page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);

  // Convidado escolhe o presente
  await page.goto("/presentes");
  await expect(page.getByRole("heading", { name: "Lista de Presentes" })).toBeVisible();
  const card = page.getByTestId("gift-card").filter({ hasText: "Bicicleta de Equilíbrio" });
  await expect(card.getByText("Disponível")).toBeVisible();
  await card.getByRole("link").first().click();
  await page.waitForURL(/\/presentes\/seed-gift-bicicleta/);
  await expect(page.getByText("R$ 199,90").first()).toBeVisible();
  await page.getByRole("button", { name: "Adicionar ao carrinho" }).click();

  // identificação no meio do fluxo (telefone + nome) e volta para o presente
  await page.waitForURL(/\/entrar/);
  await identify(page, uniquePhone());
  await page.waitForURL(/etapa=nome/);
  await page.getByLabel("Seu nome completo").fill("Bruno Padrinho");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.waitForURL(/\/presentes\/seed-gift-bicicleta/);
  await page.getByRole("button", { name: "Adicionar ao carrinho" }).click();
  await expect(page.getByText("Adicionado ao carrinho!")).toBeVisible();

  // Carrinho
  await page.getByRole("link", { name: /Carrinho com 1 item/ }).click();
  await expect(page.getByTestId("cart-line")).toHaveCount(1);
  await expect(page.getByTestId("order-total")).toHaveText("R$ 199,90");
  await page.getByRole("button", { name: "Ir para pagamento" }).click();

  // Reserva
  await page.waitForURL(/\/checkout$/);
  await expect(page.getByRole("timer")).toBeVisible();
  await expect(page.getByText("30 minutos")).toBeVisible();
  await page.getByRole("link", { name: /Ir para pagamento via Pix/ }).click();

  // Pix
  await page.waitForURL(/\/pagamento\//);
  const orderUrl = page.url();
  await expect(page.getByTestId("pix-qr")).toBeVisible();
  await expect(page.getByTestId("pix-amount")).toHaveText("R$ 199,90");
  const payload = await page.getByTestId("pix-payload").inputValue();
  expect(payload).toMatch(/^000201010211/);
  expect(payload).toContain("br.gov.bcb.pix");
  expect(payload).toContain("5406199.90");
  expect(payload).toMatch(/6304[0-9A-F]{4}$/);
  await page.getByTestId("copy-pix").click();
  await expect(page.getByText("Código Pix copiado!")).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(payload); // payload completo, não só a chave

  await page.getByRole("button", { name: "Já fiz o pagamento" }).click();
  await page.waitForURL(/\/pedido\//);
  await expect(page.getByRole("heading", { name: "Pagamento aguardando confirmação" })).toBeVisible();
  await expect(page.getByText(/confirmado automaticamente/i)).toHaveCount(0);

  // Reservado só para quem comprou; outras pessoas continuam podendo presentear
  await page.goto("/presentes");
  await expect(page.getByTestId("gift-card").filter({ hasText: "Bicicleta de Equilíbrio" }).getByText("Reservado por você", { exact: true })).toBeVisible();
  const other = await browser.newContext();
  const otherPage = await other.newPage();
  await otherPage.goto("/presentes");
  await expect(otherPage.getByTestId("gift-card").filter({ hasText: "Bicicleta de Equilíbrio" }).getByText("Disponível", { exact: true })).toBeVisible();

  // Admin confirma
  await otherPage.goto("/admin");
  await otherPage.waitForURL(/\/admin\/login/);
  await otherPage.getByLabel("Usuário").fill(E2E_ADMIN.username);
  await otherPage.getByLabel("Senha").fill(E2E_ADMIN.password);
  await otherPage.getByRole("button", { name: "Entrar" }).click();
  await otherPage.waitForURL(/\/admin$/);
  await expect(otherPage.getByTestId("stat-pending-value")).toHaveText("1");
  await otherPage.getByRole("link", { name: /Pagamentos/ }).first().click();
  const order = otherPage.getByTestId("admin-order").filter({ hasText: "Bruno Padrinho" });
  await expect(order).toContainText("R$ 199,90");
  await order.getByRole("button", { name: "Confirmar Pix" }).click();
  await expect(otherPage.getByText("Tem certeza que encontrou este pagamento em sua conta?")).toBeVisible();
  await otherPage.getByRole("button", { name: "Sim, encontrei o Pix" }).click();
  await expect(otherPage.getByText("Pagamento confirmado! O presente foi marcado como presenteado.")).toBeVisible();
  await other.close();

  // Convidado vê o presente confirmado
  await page.goto(orderUrl.replace("/pagamento/", "/pedido/"));
  await expect(page.getByRole("heading", { name: "Presente confirmado!" })).toBeVisible();
  await page.goto("/presentes");
  await expect(page.getByTestId("gift-card").filter({ hasText: "Bicicleta de Equilíbrio" }).getByText("Você presenteou", { exact: true })).toBeVisible();
});

test("admin bloqueado sem login", async ({ page }) => {
  await page.goto("/admin/pagamentos");
  await expect(page).toHaveURL(/\/admin\/login/);
});
