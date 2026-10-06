"use client";

import { Eye, EyeOff, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import type { ActionState } from "@/lib/action-state";
import { deleteGiftAction, toggleGiftActiveAction } from "../actions";
import { ConfirmActionButton } from "./confirm-action-button";

export function GiftRowActions({ giftId, active, hasOrders }: { giftId: string; active: boolean; hasOrders: boolean }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionState>();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(async () => setResult(await toggleGiftActiveAction(giftId, !active)))}
        className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-paper px-3 text-sm font-bold ring-1 ring-line"
      >
        {active ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
        {active ? "Desativar" : "Ativar"}
      </button>
      <ConfirmActionButton
        variant="ghost"
        label={<><Trash2 className="size-4 text-danger" aria-hidden /> {hasOrders ? "Remover" : "Excluir"}</>}
        title={hasOrders ? "Remover presente" : "Excluir presente"}
        description={
          hasOrders
            ? "Este presente já tem pedidos, então ele será apenas desativado (o histórico é preservado)."
            : "O presente será excluído definitivamente."
        }
        confirmLabel={hasOrders ? "Desativar" : "Excluir"}
        action={deleteGiftAction.bind(null, giftId)}
      />
      {result?.error && <span className="text-sm text-[#b03a2e]">{result.error}</span>}
    </div>
  );
}
