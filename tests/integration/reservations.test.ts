import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import { addToCart, getCart } from "@/features/cart/cart-service";
import { getPublicGift } from "@/features/gifts/gift-queries";
import {
  createReservationFromCart,
  expireStaleReservations,
  releaseReservationToCart,
  reportPayment,
} from "@/features/orders/reservation-service";
import { cancelOrderByAdmin, confirmOrderPayment } from "@/features/payments/payment-service";
import { DomainError } from "@/lib/domain-error";
import { createGift, createGuest, createTestDb, hasTestDb, putInCart, resetDb } from "./helpers";

const minutes = (n: number) => n * 60_000;
const T0 = new Date("2026-11-01T12:00:00Z");
const at = (offsetMinutes: number) => new Date(T0.getTime() + minutes(offsetMinutes));

describe.skipIf(!hasTestDb)("reservas e pedidos (PostgreSQL real)", () => {
  let db: PrismaClient;

  beforeAll(() => {
    db = createTestDb();
  });
  afterAll(async () => {
    await db?.$disconnect();
  });
  beforeEach(async () => {
    await resetDb(db);
  });

  it("duas pessoas tentando reservar o último item ao mesmo tempo: só uma consegue", async () => {
    for (let round = 0; round < 10; round++) {
      await resetDb(db);
      const gift = await createGift(db, { stockQuantity: 1 });
      const [ana, bia] = await Promise.all([createGuest(db, "Ana"), createGuest(db, "Bia")]);
      await putInCart(db, ana.id, gift.id);
      await putInCart(db, bia.id, gift.id);

      const results = await Promise.allSettled([
        createReservationFromCart(db, ana.id, { now: T0 }),
        createReservationFromCart(db, bia.id, { now: T0 }),
      ]);

      const fulfilled = results.filter((r) => r.status === "fulfilled");
      const rejected = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect(rejected[0]!.reason).toBeInstanceOf(DomainError);
      expect((rejected[0]!.reason as DomainError).code).toBe("UNAVAILABLE");
      expect(await db.order.count({ where: { status: "RESERVED" } })).toBe(1);
    }
  });

  it("estoque 3 com 6 compradores simultâneos: exatamente 3 reservas", async () => {
    const gift = await createGift(db, { stockQuantity: 3 });
    const guests = await Promise.all(Array.from({ length: 6 }, (_, i) => createGuest(db, `G${i}`)));
    for (const g of guests) await putInCart(db, g.id, gift.id);

    const results = await Promise.allSettled(guests.map((g) => createReservationFromCart(db, g.id, { now: T0 })));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(3);
    const view = await getPublicGift(db, gift.id, T0);
    expect(view).toMatchObject({ available: 0, status: "RESERVED" });
  });

  it("carrinhos cruzados (A+B vs B+A) não causam deadlock", async () => {
    const a = await createGift(db, { title: "A", stockQuantity: 5 });
    const b = await createGift(db, { title: "B", stockQuantity: 5 });
    const [g1, g2] = await Promise.all([createGuest(db), createGuest(db)]);
    await putInCart(db, g1.id, a.id);
    await putInCart(db, g1.id, b.id);
    await putInCart(db, g2.id, b.id);
    await putInCart(db, g2.id, a.id);
    const results = await Promise.allSettled([
      createReservationFromCart(db, g1.id, { now: T0 }),
      createReservationFromCart(db, g2.id, { now: T0 }),
    ]);
    expect(results.every((r) => r.status === "fulfilled")).toBe(true);
  });

  it("calcula total no servidor com preço do banco e grava snapshot", async () => {
    const pista = await createGift(db, { title: "Pista", priceInCents: 14990, stockQuantity: 2 });
    const livro = await createGift(db, { title: "Livro", priceInCents: 8990, stockQuantity: 2 });
    const guest = await createGuest(db);
    await putInCart(db, guest.id, pista.id, 2);
    await putInCart(db, guest.id, livro.id, 1);

    const order = await createReservationFromCart(db, guest.id, { now: T0 });
    expect(order.totalInCents).toBe(14990 * 2 + 8990);
    expect(order.payment?.amountInCents).toBe(order.totalInCents);
    expect(order.reservationExpiresAt.getTime()).toBe(at(30).getTime());
    expect(order.pixTxid).toMatch(/^JOSE[A-Z0-9]{12}$/);
    expect(order.items.find((i) => i.giftId === pista.id)).toMatchObject({ unitPriceInCents: 14990, giftTitleSnapshot: "Pista" });
    // carrinho é esvaziado
    expect((await getCart(db, guest.id, T0)).lines).toHaveLength(0);

    // alterar o preço depois não muda o pedido
    await db.gift.update({ where: { id: pista.id }, data: { priceInCents: 1 } });
    const reloaded = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(reloaded.totalInCents).toBe(38970);
  });

  it("reserva expirada libera o presente para outra pessoa", async () => {
    const gift = await createGift(db, { stockQuantity: 1 });
    const [ana, bia] = await Promise.all([createGuest(db), createGuest(db)]);
    await putInCart(db, ana.id, gift.id);
    await createReservationFromCart(db, ana.id, { now: T0 });

    await putInCart(db, bia.id, gift.id);
    await expect(createReservationFromCart(db, bia.id, { now: at(29) })).rejects.toMatchObject({ code: "UNAVAILABLE" });
    expect((await getPublicGift(db, gift.id, at(31)))?.status).toBe("AVAILABLE");
    await expect(createReservationFromCart(db, bia.id, { now: at(31) })).resolves.toBeTruthy();
  });

  it("'Já fiz o pagamento' dentro do prazo segura o presente além dos 30 minutos", async () => {
    const gift = await createGift(db, { stockQuantity: 1 });
    const [ana, bia] = await Promise.all([createGuest(db), createGuest(db)]);
    await putInCart(db, ana.id, gift.id);
    const order = await createReservationFromCart(db, ana.id, { now: T0 });
    await reportPayment(db, ana.id, order.id, at(10));

    const updated = await db.order.findUniqueOrThrow({ where: { id: order.id }, include: { payment: true } });
    expect(updated.status).toBe("AWAITING_PAYMENT_CONFIRMATION");
    expect(updated.payment?.status).toBe("AWAITING_CONFIRMATION");

    // muito depois do prazo, continua indisponível e não expira na limpeza
    expect(await expireStaleReservations(db, at(240))).toBe(0);
    await putInCart(db, bia.id, gift.id);
    await expect(createReservationFromCart(db, bia.id, { now: at(240) })).rejects.toMatchObject({ code: "UNAVAILABLE" });
    // idempotente
    await expect(reportPayment(db, ana.id, order.id, at(241))).resolves.toBeUndefined();
  });

  it("'Já fiz o pagamento' após o prazo é recusado pelo servidor", async () => {
    const gift = await createGift(db);
    const guest = await createGuest(db);
    await putInCart(db, guest.id, gift.id);
    const order = await createReservationFromCart(db, guest.id, { now: T0 });
    await expect(reportPayment(db, guest.id, order.id, at(31))).rejects.toMatchObject({ code: "RESERVATION_EXPIRED" });
  });

  it("convidado não consegue informar pagamento de pedido alheio", async () => {
    const gift = await createGift(db);
    const [ana, bia] = await Promise.all([createGuest(db), createGuest(db)]);
    await putInCart(db, ana.id, gift.id);
    const order = await createReservationFromCart(db, ana.id, { now: T0 });
    await expect(reportPayment(db, bia.id, order.id, at(1))).rejects.toMatchObject({ code: "ORDER_NOT_FOUND" });
  });

  it("confirmação manual do admin marca como presenteado", async () => {
    const gift = await createGift(db, { stockQuantity: 1 });
    const guest = await createGuest(db);
    await putInCart(db, guest.id, gift.id);
    const order = await createReservationFromCart(db, guest.id, { now: T0 });
    await reportPayment(db, guest.id, order.id, at(5));
    await confirmOrderPayment(db, order.id, at(60));

    const updated = await db.order.findUniqueOrThrow({ where: { id: order.id }, include: { payment: true } });
    expect(updated.status).toBe("PURCHASED");
    expect(updated.payment).toMatchObject({ status: "CONFIRMED" });
    expect(updated.payment?.confirmedAt).toBeTruthy();
    expect((await getPublicGift(db, gift.id, at(61)))?.status).toBe("PURCHASED");
    expect(await db.adminAuditLog.count({ where: { entityId: order.id, action: "PAYMENT_CONFIRMED" } })).toBe(1);

    // não confirma duas vezes nem cancela depois
    await expect(confirmOrderPayment(db, order.id, at(62))).rejects.toMatchObject({ code: "CANNOT_CONFIRM" });
    await expect(cancelOrderByAdmin(db, order.id, at(62))).rejects.toMatchObject({ code: "CANNOT_CANCEL" });
  });

  it("admin cancela pagamento informado e o presente volta a ficar disponível", async () => {
    const gift = await createGift(db, { stockQuantity: 1 });
    const guest = await createGuest(db);
    await putInCart(db, guest.id, gift.id);
    const order = await createReservationFromCart(db, guest.id, { now: T0 });
    await reportPayment(db, guest.id, order.id, at(5));
    await cancelOrderByAdmin(db, order.id, at(90));

    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("CANCELLED");
    expect((await getPublicGift(db, gift.id, at(91)))?.status).toBe("AVAILABLE");
  });

  it("não confirma reserva expirada sem pagamento informado", async () => {
    const gift = await createGift(db);
    const guest = await createGuest(db);
    await putInCart(db, guest.id, gift.id);
    const order = await createReservationFromCart(db, guest.id, { now: T0 });
    await expect(confirmOrderPayment(db, order.id, at(45))).rejects.toMatchObject({ code: "CANNOT_CONFIRM" });
  });

  it("nova ida ao checkout renova a reserva anterior incluindo itens novos", async () => {
    const a = await createGift(db, { stockQuantity: 1 });
    const b = await createGift(db, { stockQuantity: 1 });
    const guest = await createGuest(db);
    await putInCart(db, guest.id, a.id);
    const first = await createReservationFromCart(db, guest.id, { now: T0 });
    await putInCart(db, guest.id, b.id);
    const second = await createReservationFromCart(db, guest.id, { now: at(10) });

    expect((await db.order.findUniqueOrThrow({ where: { id: first.id } })).status).toBe("CANCELLED");
    expect(second.items.map((i) => i.giftId).sort()).toEqual([a.id, b.id].sort());
    expect(second.reservationExpiresAt.getTime()).toBe(at(40).getTime());
  });

  it("desistir da reserva devolve itens ao carrinho sem duplicar", async () => {
    const gift = await createGift(db, { stockQuantity: 2 });
    const guest = await createGuest(db);
    await putInCart(db, guest.id, gift.id, 2);
    const order = await createReservationFromCart(db, guest.id, { now: T0 });
    await releaseReservationToCart(db, guest.id, order.id, at(5));
    await releaseReservationToCart(db, guest.id, order.id, at(6));

    const cart = await getCart(db, guest.id, at(6));
    expect(cart.lines).toHaveLength(1);
    expect(cart.lines[0]!.quantity).toBe(2);
    expect((await getPublicGift(db, gift.id, at(6)))?.available).toBe(2);
  });

  it("addToCart respeita disponibilidade e carrinho vazio não reserva", async () => {
    const gift = await createGift(db, { stockQuantity: 1 });
    const guest = await createGuest(db);
    await expect(createReservationFromCart(db, guest.id, { now: T0 })).rejects.toMatchObject({ code: "EMPTY_CART" });
    await addToCart(db, guest.id, gift.id, 1, T0);
    await expect(addToCart(db, guest.id, gift.id, 1, T0)).rejects.toMatchObject({ code: "NOT_ENOUGH_STOCK" });
  });
});
