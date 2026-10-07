import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import { listOrdersForAdmin } from "@/features/admin/admin-queries";
import { getCart } from "@/features/cart/cart-service";
import { getPublicGift } from "@/features/gifts/gift-queries";
import {
  createReservationFromCart,
  releaseReservationToCart,
  reportPayment,
} from "@/features/orders/reservation-service";
import { cancelOrderByAdmin, confirmOrderPayment, resolveLatePaymentReport } from "@/features/payments/payment-service";
import { updateGift } from "@/features/gifts/gift-admin-service";
import { giftFormSchema } from "@/features/gifts/gift-schema";
import { createGift, createGuest, createTestDb, hasTestDb, putInCart, resetDb } from "./helpers";

// Cenários encontrados na auditoria de produção (cada teste reproduz um problema real).

const T0 = new Date("2026-11-01T12:00:00Z");
const at = (m: number) => new Date(T0.getTime() + m * 60_000);

describe.skipIf(!hasTestDb)("auditoria: reservas", () => {
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

  it("clique duplo / duas abas do MESMO convidado criam uma única reserva", async () => {
    for (let round = 0; round < 8; round++) {
      await resetDb(db);
      const gift = await createGift(db, { stockQuantity: 2 });
      const guest = await createGuest(db);
      await putInCart(db, guest.id, gift.id, 1);

      const results = await Promise.allSettled([
        createReservationFromCart(db, guest.id, { now: T0 }),
        createReservationFromCart(db, guest.id, { now: T0 }),
      ]);
      expect(results.map((r) => r.status)).toEqual(["fulfilled", "fulfilled"]);
      const active = await db.order.findMany({ where: { guestId: guest.id, status: "RESERVED" } });
      expect(active).toHaveLength(1);
      expect((await getPublicGift(db, gift.id, T0, guest.id))?.status).toBe("RESERVED");
    }
  });

  it("refresh/segundo envio com carrinho vazio devolve a reserva ativa (idempotente)", async () => {
    const gift = await createGift(db);
    const guest = await createGuest(db);
    await putInCart(db, guest.id, gift.id);
    const first = await createReservationFromCart(db, guest.id, { now: T0 });
    const again = await createReservationFromCart(db, guest.id, { now: at(1) });
    expect(again.id).toBe(first.id);
  });

  it("pagamento informado logo após expirar: reativa se o presente continua livre", async () => {
    const gift = await createGift(db);
    const guest = await createGuest(db);
    await putInCart(db, guest.id, gift.id);
    const order = await createReservationFromCart(db, guest.id, { now: T0 });

    const result = await reportPayment(db, guest.id, order.id, at(31));
    expect(result).toBe("AWAITING");
    const updated = await db.order.findUniqueOrThrow({ where: { id: order.id }, include: { payment: true } });
    expect(updated.status).toBe("AWAITING_PAYMENT_CONFIRMATION");
    expect(updated.payment?.status).toBe("AWAITING_CONFIRMATION");
  });

  it("pagamento informado após expirar e o convidado já reservou o presente de novo: fica registrado para o admin", async () => {
    const gift = await createGift(db, { stockQuantity: 1 });
    const ana = await createGuest(db, "Ana");
    await putInCart(db, ana.id, gift.id);
    const late = await createReservationFromCart(db, ana.id, { now: T0 });
    await putInCart(db, ana.id, gift.id);
    await createReservationFromCart(db, ana.id, { now: at(31) }); // nova reserva da Ana com o mesmo presente

    const result = await reportPayment(db, ana.id, late.id, at(32));
    expect(result).toBe("LATE_UNAVAILABLE");
    const updated = await db.order.findUniqueOrThrow({ where: { id: late.id }, include: { payment: true } });
    expect(updated.status).toBe("EXPIRED");
    expect(updated.paymentReportedAt).toBeTruthy();
    expect(updated.payment?.status).toBe("AWAITING_CONFIRMATION");
    // a nova reserva continua valendo (sem duplicar o presente da Ana)
    expect((await getPublicGift(db, gift.id, at(32), ana.id))?.status).toBe("RESERVED");

    // admin vê na aba de pendentes e consegue resolver
    const pending = await listOrdersForAdmin(db, "pending", at(33));
    expect(pending.map((o) => o.id)).toContain(late.id);
    await resolveLatePaymentReport(db, late.id, at(40));
    expect((await listOrdersForAdmin(db, "pending", at(41))).map((o) => o.id)).not.toContain(late.id);
  });

  it("confirmação duplicada pelo admin é idempotente", async () => {
    const gift = await createGift(db);
    const guest = await createGuest(db);
    await putInCart(db, guest.id, gift.id);
    const order = await createReservationFromCart(db, guest.id, { now: T0 });
    await reportPayment(db, guest.id, order.id, at(1));
    await confirmOrderPayment(db, order.id, at(2));
    await expect(confirmOrderPayment(db, order.id, at(3))).resolves.toBe("ALREADY_CONFIRMED");
    expect(await db.adminAuditLog.count({ where: { entityId: order.id, action: "PAYMENT_CONFIRMED" } })).toBe(1);
    // mas nunca cancela algo já presenteado
    await expect(cancelOrderByAdmin(db, order.id, at(4))).rejects.toMatchObject({ code: "CANNOT_CANCEL" });
  });

  it("confirmações simultâneas do admin geram uma única confirmação", async () => {
    const gift = await createGift(db);
    const guest = await createGuest(db);
    await putInCart(db, guest.id, gift.id);
    const order = await createReservationFromCart(db, guest.id, { now: T0 });
    await reportPayment(db, guest.id, order.id, at(1));
    const results = await Promise.allSettled([confirmOrderPayment(db, order.id, at(2)), confirmOrderPayment(db, order.id, at(2))]);
    expect(results.every((r) => r.status === "fulfilled")).toBe(true);
    expect(await db.adminAuditLog.count({ where: { entityId: order.id, action: "PAYMENT_CONFIRMED" } })).toBe(1);
  });

  it("cancelamento duplicado é idempotente e não confirma depois", async () => {
    const gift = await createGift(db);
    const guest = await createGuest(db);
    await putInCart(db, guest.id, gift.id);
    const order = await createReservationFromCart(db, guest.id, { now: T0 });
    await reportPayment(db, guest.id, order.id, at(1));
    await cancelOrderByAdmin(db, order.id, at(2));
    await expect(cancelOrderByAdmin(db, order.id, at(3))).resolves.toBe("ALREADY_CANCELLED");
    await expect(confirmOrderPayment(db, order.id, at(4))).rejects.toMatchObject({ code: "CANNOT_CONFIRM" });
    expect((await getPublicGift(db, gift.id, at(4), guest.id))?.available).toBe(1);
  });

  it("'Tentar novamente' em reserva antiga não duplica itens de uma reserva ativa", async () => {
    const a = await createGift(db, { stockQuantity: 3 });
    const b = await createGift(db, { stockQuantity: 3 });
    const guest = await createGuest(db);
    await putInCart(db, guest.id, a.id);
    const first = await createReservationFromCart(db, guest.id, { now: T0 });
    await putInCart(db, guest.id, b.id);
    const second = await createReservationFromCart(db, guest.id, { now: at(1) }); // renova: first cancelado

    await releaseReservationToCart(db, guest.id, first.id, at(2)); // aba antiga: "Tentar novamente"
    expect((await getCart(db, guest.id, at(2))).lines).toHaveLength(0);
    const third = await createReservationFromCart(db, guest.id, { now: at(3) });
    expect(third.id).toBe(second.id);
    expect(third.items.find((i) => i.giftId === a.id)?.quantity).toBe(1);
  });

  it("renovação e 'já paguei' simultâneos do mesmo convidado não geram deadlock", async () => {
    for (let round = 0; round < 6; round++) {
      await resetDb(db);
      const a = await createGift(db, { stockQuantity: 5 });
      const b = await createGift(db, { stockQuantity: 5 });
      const guest = await createGuest(db);
      await putInCart(db, guest.id, a.id);
      const order = await createReservationFromCart(db, guest.id, { now: T0 });
      await putInCart(db, guest.id, b.id);
      const results = await Promise.allSettled([
        createReservationFromCart(db, guest.id, { now: at(31) }),
        reportPayment(db, guest.id, order.id, at(31)),
      ]);
      for (const r of results) {
        if (r.status === "rejected") expect(String(r.reason)).not.toMatch(/deadlock|40P01/i);
      }
    }
  });

  it("vários convidados dão o mesmo presente sob carga mista, uma vez cada", async () => {
    const gift = await createGift(db, { stockQuantity: 2 });
    const guests = await Promise.all(Array.from({ length: 5 }, () => createGuest(db)));
    for (const g of guests) await putInCart(db, g.id, gift.id);
    const results = await Promise.allSettled(guests.map((g) => createReservationFromCart(db, g.id, { now: T0 })));
    const orders = results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
    await Promise.all(orders.map((o) => reportPayment(db, o.guestId, o.id, at(1))));
    await Promise.all(orders.map((o) => confirmOrderPayment(db, o.id, at(2))));
    const purchased = await db.orderItem.aggregate({
      where: { giftId: gift.id, order: { status: "PURCHASED" } },
      _sum: { quantity: true },
    });
    expect(purchased._sum.quantity).toBe(5);
    // pagamento sempre igual ao total do pedido
    const mismatched = await db.$queryRaw<{ n: number }[]>`
      SELECT count(*)::int AS n FROM "Payment" p JOIN "Order" o ON o.id = p."orderId" WHERE p."amountInCents" <> o."totalInCents"`;
    expect(mismatched[0]!.n).toBe(0);
  });

  it("admin pode reduzir o máximo por convidado mesmo com reservas existentes", async () => {
    const gift = await createGift(db, { stockQuantity: 2 });
    const guest = await createGuest(db);
    await putInCart(db, guest.id, gift.id, 2);
    await createReservationFromCart(db, guest.id, { now: new Date() });
    const input = giftFormSchema.parse({ title: "Pista", price: "10", category: "Brinquedos", stockQuantity: "1", active: "on" });
    await expect(updateGift(db, gift.id, input)).resolves.toBeTruthy();
  });

  it("editar presente inexistente é erro tratado (não 500)", async () => {
    const input = giftFormSchema.parse({ title: "Xis", price: "10", category: "Livros", stockQuantity: "1", active: "on" });
    await expect(updateGift(db, "nao-existe", input)).rejects.toMatchObject({ code: "GIFT_NOT_FOUND" });
  });
});
