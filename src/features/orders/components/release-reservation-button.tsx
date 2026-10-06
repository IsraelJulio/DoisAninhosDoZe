"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { releaseReservationAction } from "../actions";

/** "Voltar ao carrinho" / "Tentar novamente": desfaz a reserva e devolve os itens ao carrinho. */
export function ReleaseReservationButton({
  orderId,
  label,
  variant = "ghost",
}: {
  orderId: string;
  label: string;
  variant?: "ghost" | "secondary" | "primary";
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  return (
    <div className="flex flex-col gap-1">
      <Button
        variant={variant}
        block
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await releaseReservationAction(orderId);
            setError(result?.error);
          })
        }
      >
        {pending ? "Aguarde..." : label}
      </Button>
      {error && (
        <p className="text-center text-sm font-semibold text-[#b03a2e]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
