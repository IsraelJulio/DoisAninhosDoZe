import { beforeEach, describe, expect, it, vi } from "vitest";

// Server Actions são endpoints públicos: aqui chamamos cada action administrativa diretamente,
// sem passar pela interface e sem cookie de admin. Nenhuma pode tocar o banco.

const dbAccess = vi.fn();
vi.mock("@/server/db", () => ({
  getDb: () =>
    new Proxy(
      {},
      {
        get(_t, prop) {
          dbAccess(prop);
          throw new Error(`acesso ao banco sem autorização: ${String(prop)}`);
        },
      },
    ),
}));

let cookieValue: string | undefined;
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (name === "jose_admin" && cookieValue ? { name, value: cookieValue } : undefined),
    set: vi.fn(),
    delete: vi.fn(),
  }),
  headers: async () => new Headers({ "x-forwarded-for": "203.0.113.9" }),
}));

class RedirectError extends Error {
  constructor(readonly url: string) {
    super(`redirect:${url}`);
  }
}
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new RedirectError(url);
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const actions = await import("./actions");
const { createSignedToken } = await import("@/server/session/signing");

function form(entries: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.set(k, v);
  return fd;
}

const PROTECTED: [string, () => Promise<unknown>][] = [
  ["confirmPaymentAction", () => actions.confirmPaymentAction("order-1")],
  ["cancelOrderAction", () => actions.cancelOrderAction("order-1")],
  ["resolveLatePaymentAction", () => actions.resolveLatePaymentAction("order-1")],
  ["saveGiftAction", () => actions.saveGiftAction({}, form({ title: "Hack", price: "1", category: "X", stockQuantity: "1" }))],
  ["toggleGiftActiveAction", () => actions.toggleGiftActiveAction("gift-1", false)],
  ["deleteGiftAction", () => actions.deleteGiftAction("gift-1")],
  ["importGiftAction", () => actions.importGiftAction("https://example.com")],
  ["saveSettingsAction", () => actions.saveSettingsAction({}, form({ reservationMinutes: "999" }))],
];

describe("actions administrativas sem sessão", () => {
  beforeEach(() => {
    dbAccess.mockClear();
  });

  it.each(PROTECTED)("%s redireciona para o login sem tocar o banco", async (_name, call) => {
    cookieValue = undefined;
    await expect(call()).rejects.toMatchObject({ url: "/admin/login" });
    expect(dbAccess).not.toHaveBeenCalled();
  });

  it.each(PROTECTED)("%s recusa cookie forjado/de convidado", async (_name, call) => {
    cookieValue = createSignedToken({ sub: "admin" }, "guest-session", 3600); // assinado com a chave do convidado
    await expect(call()).rejects.toMatchObject({ url: "/admin/login" });
    cookieValue = "eyJzdWIiOiJhZG1pbiIsImV4cCI6OTk5OTk5OTk5OX0.assinatura-falsa";
    await expect(call()).rejects.toMatchObject({ url: "/admin/login" });
    expect(dbAccess).not.toHaveBeenCalled();
  });

  it("todas as actions exportadas estão cobertas por este teste", () => {
    const exported = Object.keys(actions).filter((k) => typeof (actions as Record<string, unknown>)[k] === "function");
    const publicOnes = ["adminLoginAction", "adminLogoutAction"];
    expect(exported.filter((k) => !publicOnes.includes(k)).sort()).toEqual(PROTECTED.map(([n]) => n).sort());
  });
});
