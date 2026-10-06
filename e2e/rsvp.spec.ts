import { expect, test } from "@playwright/test";
import { identify, uniquePhone } from "./helpers";

test("Home → identificar convidado → confirmar presença → editar", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Venha viver essa aventura comigo/ })).toBeVisible();
  await expect(page.getByText("28 de novembro")).toBeVisible();
  await expect(page.getByText("Condomínio Portal Riacho da Mata").first()).toBeVisible();

  await page.getByRole("link", { name: "Confirmar presença" }).click();
  await page.waitForURL(/\/entrar/);
  await identify(page, uniquePhone());

  await page.waitForURL(/\/presenca$/);
  await page.getByLabel("Nome do convidado").fill("Ana Convidada");
  await page.getByRole("button", { name: "Sim, eu vou!" }).click();
  await page.getByRole("button", { name: "Aumentar quantos adultos" }).click(); // 2 adultos
  await page.getByRole("button", { name: "Aumentar quantas crianças" }).click();
  await page.getByRole("button", { name: "Aumentar quantas crianças" }).click();
  await page.getByRole("button", { name: "Aumentar quantas crianças" }).click();
  await page.getByRole("button", { name: "Diminuir quantas crianças" }).click(); // 2 crianças
  await page.getByLabel(/Deixe um recado/).fill("Parabéns, José!");
  await page.getByRole("button", { name: "Enviar confirmação" }).click();

  await expect(page.getByRole("heading", { name: "Presença confirmada!" })).toBeVisible();
  await expect(page.getByTestId("rsvp-counts")).toContainText("2 adultos");
  await expect(page.getByTestId("rsvp-counts")).toContainText("2 crianças");

  // voltar depois e editar
  await page.getByRole("link", { name: "Editar minha confirmação" }).click();
  await expect(page.getByLabel("Nome do convidado")).toHaveValue("Ana Convidada");
  await page.getByRole("button", { name: "Diminuir quantas crianças" }).click();
  await page.getByRole("button", { name: "Enviar confirmação" }).click();
  await expect(page.getByTestId("rsvp-counts")).toContainText("1 criança");
});

test("stepper não permite números negativos", async ({ page }) => {
  await page.goto("/entrar?next=/presenca");
  await identify(page, uniquePhone());
  await page.waitForURL(/\/presenca$/);
  await expect(page.getByRole("button", { name: "Diminuir quantas crianças" })).toBeDisabled();
});
