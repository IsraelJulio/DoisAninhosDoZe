"use client";

import { Gift, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { Notice } from "@/components/ui/notice";
import { Stepper } from "@/components/ui/stepper";
import { SubmitButton } from "@/components/ui/submit-button";
import { addToCartAction } from "@/features/cart/actions";
import { initialActionState } from "@/lib/action-state";

/** Botão "Presentear" do card: adiciona 1 unidade e leva ao carrinho. */
export function QuickGiftButton({ giftId, title }: { giftId: string; title: string }) {
  const [state, formAction] = useActionState(addToCartAction, initialActionState);
  return (
    <form action={formAction} className="flex flex-col gap-1.5">
      <input type="hidden" name="giftId" value={giftId} />
      <input type="hidden" name="quantity" value={1} />
      <input type="hidden" name="goToCart" value="1" />
      <SubmitButton size="sm" block pendingLabel="..." aria-label={`Presentear: ${title}`}>
        <Gift className="size-4" aria-hidden />
        Presentear
      </SubmitButton>
      {state.error && <p className="text-xs font-semibold text-[#b03a2e]" role="alert">{state.error}</p>}
    </form>
  );
}

/** Detalhe do presente: seletor de quantidade + adicionar ao carrinho. */
export function AddToCartForm({ giftId, available }: { giftId: string; available: number }) {
  const [state, formAction] = useActionState(addToCartAction, initialActionState);
  const [quantity, setQuantity] = useState(1);
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="giftId" value={giftId} />
      <div className="flex items-end gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-bold">Quantidade</span>
          <div className="rounded-2xl border-2 border-line bg-white px-2 py-1.5">
            <Stepper label="Quantidade" value={quantity} onChange={setQuantity} min={1} max={Math.max(1, available)} name="quantity" size="sm" />
          </div>
        </div>
        <SubmitButton size="lg" className="flex-1" pendingLabel="Adicionando...">
          <ShoppingCart className="size-5" aria-hidden />
          Adicionar ao carrinho
        </SubmitButton>
      </div>
      {state.error && <Notice tone="error">{state.error}</Notice>}
      {state.ok && (
        <Notice tone="success">
          {state.message}{" "}
          <Link href="/carrinho" className="underline underline-offset-2">
            Ver carrinho
          </Link>
        </Notice>
      )}
    </form>
  );
}
