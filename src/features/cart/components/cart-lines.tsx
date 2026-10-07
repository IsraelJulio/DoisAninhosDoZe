"use client";

import { AnimatePresence, LazyMotion, MotionConfig, domAnimation, m } from "framer-motion";
import { Trash2 } from "lucide-react";
import { useState, useTransition, type ReactNode } from "react";
import { Stepper } from "@/components/ui/stepper";
import type { GiftStatus } from "@/features/gifts/gift-availability";
import { formatBRL } from "@/lib/money";
import { removeFromCartAction, updateCartQuantityAction } from "../actions";
import { MAX_QUANTITY_PER_ITEM } from "../cart-constants";

export interface CartLineView {
  giftId: string;
  title: string;
  unitPriceInCents: number;
  quantity: number;
  available: number;
  status: GiftStatus;
  exceedsAvailability: boolean;
  image: ReactNode;
}

/** Itens do carrinho com ajuste de quantidade (servidor recalcula tudo a cada mudança). */
export function CartLines({ lines }: { lines: CartLineView[] }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <ul className="flex flex-col gap-3">
          <AnimatePresence initial={false}>
            {lines.map((line) => (
              <CartLineItem key={line.giftId} line={line} />
            ))}
          </AnimatePresence>
        </ul>
      </MotionConfig>
    </LazyMotion>
  );
}

function CartLineItem({ line }: { line: CartLineView }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  const update = (quantity: number) =>
    startTransition(async () => {
      const result = await updateCartQuantityAction(line.giftId, quantity);
      setError(result.error);
    });
  const remove = () =>
    startTransition(async () => {
      const result = await removeFromCartAction(line.giftId);
      setError(result.error);
    });

  return (
    <m.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: pending ? 0.6 : 1, y: 0 }}
      exit={{ opacity: 0, x: -40, transition: { duration: 0.2 } }}
      className="paper-card flex gap-3 p-3"
      data-testid="cart-line"
    >
      <div className="w-20 shrink-0">{line.image}</div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-start gap-2">
          <p className="line-clamp-2 flex-1 text-sm font-bold leading-tight">{line.title}</p>
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            className="grid size-9 shrink-0 place-items-center rounded-full text-danger hover:bg-danger/10"
            aria-label={`Remover ${line.title}`}
          >
            <Trash2 className="size-4.5" aria-hidden />
          </button>
        </div>
        <p className="font-display font-semibold text-forest-dark">{formatBRL(line.unitPriceInCents)}</p>
        <Stepper
          label={`Quantidade de ${line.title}`}
          value={line.quantity}
          onChange={update}
          min={1}
          max={Math.min(MAX_QUANTITY_PER_ITEM, Math.max(line.quantity, line.available))}
          size="sm"
          disabled={pending}
        />
        {line.exceedsAvailability && (
          <p className="text-xs font-bold text-[#b03a2e]" role="alert">
            {line.available === 0
              ? line.status === "INACTIVE"
                ? "Este presente não está mais disponível. Remova-o para continuar."
                : "Você já reservou ou presenteou este item. Remova-o para continuar."
              : `Cada convidado pode dar até ${line.available === 1 ? "1 unidade" : `${line.available} unidades`}. Ajuste a quantidade.`}
          </p>
        )}
        {error && (
          <p className="text-xs font-bold text-[#b03a2e]" role="alert">
            {error}
          </p>
        )}
      </div>
    </m.li>
  );
}
