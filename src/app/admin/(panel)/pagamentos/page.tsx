import type { Metadata } from "next";
import Link from "next/link";
import { Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { countOrdersByTab, listOrdersForAdmin, type PaymentTab } from "@/features/admin/admin-queries";
import { cancelOrderAction, confirmPaymentAction } from "@/features/admin/actions";
import { ConfirmActionButton } from "@/features/admin/components/confirm-action-button";
import { ORDER_STATUS_LABEL } from "@/features/orders/order-status";
import { cn } from "@/lib/cn";
import { formatBRL } from "@/lib/money";
import { formatBrazilianPhone } from "@/lib/phone";
import { getDb } from "@/server/db";

export const metadata: Metadata = { title: "Pagamentos" };

const TABS: { value: PaymentTab; label: string }[] = [
  { value: "pending", label: "Pendentes" },
  { value: "reserved", label: "Reservas em andamento" },
  { value: "confirmed", label: "Confirmados" },
  { value: "cancelled", label: "Cancelados" },
];

const dateTime = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });

export default async function AdminPaymentsPage({ searchParams }: PageProps<"/admin/pagamentos">) {
  const params = await searchParams;
  const tab = (TABS.find((t) => t.value === params.aba)?.value ?? "pending") as PaymentTab;
  const db = getDb();
  const [orders, counts] = await Promise.all([listOrdersForAdmin(db, tab), countOrdersByTab(db)]);

  return (
    <>
      <h1 className="font-display text-2xl font-semibold">Pagamentos</h1>
      <p className="text-sm text-ink-soft">
        Confira o Pix no extrato da sua conta (valor e txid) antes de confirmar. A confirmação marca os presentes como
        presenteados.
      </p>

      <nav aria-label="Abas de pagamentos" className="-mx-4 overflow-x-auto px-4">
        <ul className="flex w-max gap-2">
          {TABS.map((t) => (
            <li key={t.value}>
              <Link
                href={`/admin/pagamentos?aba=${t.value}`}
                aria-current={tab === t.value ? "page" : undefined}
                className={cn("inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-bold", tab === t.value ? "bg-forest text-white" : "bg-paper ring-1 ring-line")}
              >
                {t.label}
                <span className={cn("rounded-full px-1.5 text-xs", tab === t.value ? "bg-white/25" : "bg-ink/10")}>{counts[t.value]}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {orders.length === 0 ? (
        <p className="paper-card p-6 text-center text-ink-soft">Nada por aqui.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {orders.map((order) => (
            <li key={order.id} className="paper-card flex flex-col gap-2 p-4" data-testid="admin-order">
              <div className="flex flex-wrap items-center gap-2">
                <p className="min-w-0 flex-1 font-bold">{order.guest.name ?? "Sem nome"}</p>
                <Badge tone={order.status === "PURCHASED" ? "success" : order.status === "AWAITING_PAYMENT_CONFIRMATION" ? "warning" : order.status === "RESERVED" ? "info" : "neutral"}>
                  {ORDER_STATUS_LABEL[order.status]}
                </Badge>
              </div>
              <p className="text-sm text-ink-soft">
                <a href={`tel:${order.guest.phone}`} className="underline underline-offset-2">{formatBrazilianPhone(order.guest.phone)}</a>
                {" • "}
                {dateTime.format(order.paymentReportedAt ?? order.createdAt)}
              </p>
              <ul className="text-sm">
                {order.items.map((item) => (
                  <li key={item.id}>
                    {item.quantity}× {item.giftTitleSnapshot} — {formatBRL(item.unitPriceInCents)}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap items-end justify-between gap-2">
                <p className="font-display text-2xl font-semibold text-forest-dark">{formatBRL(order.totalInCents)}</p>
                <p className="font-mono text-xs text-ink-soft">txid: {order.pixTxid}</p>
              </div>
              {(order.status === "AWAITING_PAYMENT_CONFIRMATION" || order.status === "RESERVED") && (
                <div className="flex flex-wrap gap-2 pt-1">
                  <ConfirmActionButton
                    label={<><Check className="size-4" aria-hidden /> Confirmar Pix</>}
                    title="Confirmar pagamento"
                    description={
                      <>
                        <strong>Tem certeza que encontrou este pagamento em sua conta?</strong>
                        <br />
                        {formatBRL(order.totalInCents)} — txid {order.pixTxid}
                      </>
                    }
                    confirmLabel="Sim, encontrei o Pix"
                    action={confirmPaymentAction.bind(null, order.id)}
                  />
                  <ConfirmActionButton
                    variant="danger"
                    label={<><X className="size-4" aria-hidden /> Cancelar pedido</>}
                    title="Cancelar pedido"
                    description="Os presentes voltam a ficar disponíveis para outros convidados. Use se o Pix não foi encontrado."
                    confirmLabel="Cancelar pedido"
                    action={cancelOrderAction.bind(null, order.id)}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
