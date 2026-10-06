import { DomainError } from "@/lib/domain-error";
import type { Db } from "@/server/db";
import type { PixCharge, PixProvider } from "./pix/provider";

/**
 * Gera (ou reaproveita) o Pix Copia e Cola do pedido. O payload depende só do valor do pedido
 * (calculado no servidor), do txid do pedido e da configuração do recebedor; fica salvo no
 * Payment para que o admin veja exatamente o que foi exibido ao convidado.
 */
export async function getOrderPixCharge(
  db: Db,
  provider: PixProvider,
  order: { id: string; totalInCents: number; pixTxid: string; payment: { pixPayload: string | null } | null },
): Promise<PixCharge> {
  const charge = provider.createCharge({ amountInCents: order.totalInCents, txid: order.pixTxid, description: "Presente" });
  if (charge.configured && order.payment && order.payment.pixPayload !== charge.payload) {
    await db.payment.update({ where: { orderId: order.id }, data: { pixPayload: charge.payload } });
  }
  return charge;
}

/**
 * Admin confirma que encontrou o Pix na conta. Aceita pedidos aguardando confirmação e também
 * reservas ainda ativas (caso o convidado tenha pago sem clicar em "Já fiz o pagamento").
 */
export async function confirmOrderPayment(
  db: Db,
  orderId: string,
  now = new Date(),
): Promise<"CONFIRMED" | "ALREADY_CONFIRMED"> {
  return db.$transaction(async (tx) => {
    // UPDATE condicional = compare-and-set: duas confirmações simultâneas → só uma muda o pedido
    const changed = await tx.order.updateMany({
      where: {
        id: orderId,
        OR: [{ status: "AWAITING_PAYMENT_CONFIRMATION" }, { status: "RESERVED", reservationExpiresAt: { gt: now } }],
      },
      data: { status: "PURCHASED", confirmedAt: now },
    });
    if (changed.count !== 1) {
      const order = await tx.order.findUnique({ where: { id: orderId }, select: { status: true } });
      if (order?.status === "PURCHASED") return "ALREADY_CONFIRMED"; // idempotente
      throw new DomainError("CANNOT_CONFIRM", "Este pedido não está mais aguardando pagamento.");
    }
    await tx.payment.update({ where: { orderId }, data: { status: "CONFIRMED", confirmedAt: now } });
    await tx.adminAuditLog.create({ data: { action: "PAYMENT_CONFIRMED", entityType: "Order", entityId: orderId } });
    return "CONFIRMED";
  });
}

/** Admin rejeita/cancela: os itens voltam a ficar disponíveis imediatamente. Idempotente. */
export async function cancelOrderByAdmin(
  db: Db,
  orderId: string,
  now = new Date(),
): Promise<"CANCELLED" | "ALREADY_CANCELLED"> {
  return db.$transaction(async (tx) => {
    const changed = await tx.order.updateMany({
      where: { id: orderId, status: { in: ["RESERVED", "AWAITING_PAYMENT_CONFIRMATION"] } },
      data: { status: "CANCELLED", cancelledAt: now },
    });
    if (changed.count !== 1) {
      const order = await tx.order.findUnique({ where: { id: orderId }, select: { status: true } });
      if (order?.status === "CANCELLED" || order?.status === "EXPIRED") return "ALREADY_CANCELLED";
      throw new DomainError("CANNOT_CANCEL", "Este pedido não pode mais ser cancelado.");
    }
    await tx.payment.updateMany({ where: { orderId }, data: { status: "CANCELLED" } });
    await tx.adminAuditLog.create({ data: { action: "ORDER_CANCELLED", entityType: "Order", entityId: orderId } });
    return "CANCELLED";
  });
}

/**
 * Pix informado depois que a reserva expirou e o presente foi para outra pessoa (ou num pedido
 * cancelado). Não há o que confirmar sem vender em dobro: o admin resolve por fora (devolve o
 * valor ou combina outro presente) e marca como resolvido aqui.
 */
export async function resolveLatePaymentReport(db: Db, orderId: string, now = new Date()) {
  return db.$transaction(async (tx) => {
    const changed = await tx.payment.updateMany({
      where: { orderId, status: "AWAITING_CONFIRMATION", order: { status: { in: ["EXPIRED", "CANCELLED"] } } },
      data: { status: "CANCELLED" },
    });
    if (changed.count) {
      await tx.adminAuditLog.create({
        data: { action: "LATE_PAYMENT_RESOLVED", entityType: "Order", entityId: orderId, metadata: { at: now.toISOString() } },
      });
    }
  });
}
