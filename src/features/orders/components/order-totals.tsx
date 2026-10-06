import { formatBRL } from "@/lib/money";

export function OrderTotals({ subtotalInCents, totalInCents }: { subtotalInCents: number; totalInCents: number }) {
  return (
    <dl className="paper-card divide-y divide-line px-4">
      <div className="flex items-center justify-between py-3 text-sm">
        <dt className="text-ink-soft">Subtotal</dt>
        <dd className="font-semibold">{formatBRL(subtotalInCents)}</dd>
      </div>
      <div className="flex items-center justify-between py-3">
        <dt className="font-display text-xl font-semibold">Total</dt>
        <dd className="font-display text-2xl font-semibold text-forest-dark" data-testid="order-total">
          {formatBRL(totalInCents)}
        </dd>
      </div>
    </dl>
  );
}
