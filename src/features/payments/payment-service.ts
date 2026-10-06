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
export async function confirmOrderPayment(db: Db, orderId: string, now = new Date()) {
  await db.$transaction(async (tx) => {
    const changed = await tx.order.updateMany({
      where: {
        id: orderId,
        OR: [
          { status: "AWAITING_PAYMENT_CONFIRMATION" },
          { status: "RESERVED", reservationExpiresAt: { gt: now } },
        ],
      },
      data: { status: "PURCHASED", confirmedAt: now },
    });
    if (changed.count !== 1) {
      throw new DomainError("CANNOT_CONFIRM", "Este pedido não está mais aguardando pagamento.");
    }
    await tx.payment.update({ where: { orderId }, data: { status: "CONFIRMED", confirmedAt: now } });
    await tx.adminAuditLog.create({
      data: { action: "PAYMENT_CONFIRMED", entityType: "Order", entityId: orderId },
    });
  });
}

/** Admin rejeita/cancela: os itens voltam a ficar disponíveis imediatamente. */
export async function cancelOrderByAdmin(db: Db, orderId: string, now = new Date()) {
  await db.$transaction(async (tx) => {
    const changed = await tx.order.updateMany({
      where: { id: orderId, status: { in: ["RESERVED", "AWAITING_PAYMENT_CONFIRMATION"] } },
      data: { status: "CANCELLED", cancelledAt: now },
    });
    if (changed.count !== 1) throw new DomainError("CANNOT_CANCEL", "Este pedido não pode mais ser cancelado.");
    await tx.payment.updateMany({ where: { orderId }, data: { status: "CANCELLED" } });
    await tx.adminAuditLog.create({ data: { action: "ORDER_CANCELLED", entityType: "Order", entityId: orderId } });
  });
}
