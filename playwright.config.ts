import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";

// E2E contra um build de produção, com banco próprio (E2E_DATABASE_URL — local: `npm run db:local`).
const PORT = 3100;
const E2E_DATABASE_URL = process.env.E2E_DATABASE_URL;
if (!E2E_DATABASE_URL) throw new Error("Defina E2E_DATABASE_URL (veja README).");

export const E2E_ADMIN = { username: "e2e-admin", password: "e2e-admin-password-123" };

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  reporter: [["list"]],
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: `http://localhost:${PORT}`,
    ...devices["Pixel 7"],
    viewport: { width: 390, height: 844 },
    locale: "pt-BR",
    trace: "retain-on-failure",
  },
  projects: [{ name: "mobile-chromium", use: { browserName: "chromium" } }],
  webServer: {
    command: `npm run build && npm run start -- --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    timeout: 300_000,
    reuseExistingServer: false,
    env: {
      DATABASE_URL: E2E_DATABASE_URL,
      ADMIN_USERNAME: E2E_ADMIN.username,
      ADMIN_PASSWORD: E2E_ADMIN.password,
      ADMIN_SESSION_SECRET: "e2e-only-session-secret-0123456789-abcdefghijklmnop",
      // FIXTURE DE TESTE: chave aleatória fictícia (zeros), usada só para validar o BR Code no E2E.
      // Nunca use em produção — a chave real vai apenas nas variáveis de ambiente da Vercel.
      PIX_KEY: "00000000-0000-0000-0000-000000000000",
      PIX_RECEIVER_NAME: "TESTE E2E",
      PIX_RECEIVER_CITY: "SARZEDO",
      PIX_DESCRIPTION_PREFIX: "Teste",
      NEXT_PUBLIC_APP_URL: `http://localhost:${PORT}`,
    },
  },
});
