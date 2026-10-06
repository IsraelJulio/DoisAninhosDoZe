"use client";

import { useRef, useState, useTransition, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import type { ActionState } from "@/lib/action-state";

/**
 * Botão que abre um modal de confirmação (<dialog> nativo: foco preso e ESC funcionam)
 * antes de executar uma Server Action administrativa.
 */
export function ConfirmActionButton({
  label,
  title,
  description,
  confirmLabel,
  action,
  variant = "primary",
  size = "sm",
}: {
  label: ReactNode;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  action: () => Promise<ActionState>;
  variant?: "primary" | "danger" | "secondary" | "ghost";
  size?: "sm" | "md";
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionState>();

  return (
    <>
      <Button variant={variant} size={size} onClick={() => dialogRef.current?.showModal()} disabled={pending}>
        {label}
      </Button>
      {result?.error && <Notice tone="error">{result.error}</Notice>}
      {result?.message && <Notice tone="success">{result.message}</Notice>}
      <dialog
        ref={dialogRef}
        className="m-auto w-[min(92vw,420px)] rounded-[var(--radius-card)] bg-paper p-0 text-ink shadow-[var(--shadow-card)] backdrop:bg-ink/50"
        aria-labelledby="confirm-title"
      >
        <div className="flex flex-col gap-4 p-5">
          <h2 id="confirm-title" className="font-display text-xl font-semibold">
            {title}
          </h2>
          <div className="text-sm text-ink-soft">{description}</div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => dialogRef.current?.close()} disabled={pending}>
              Voltar
            </Button>
            <Button
              variant={variant === "danger" ? "danger" : "primary"}
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const r = await action();
                  setResult(r);
                  dialogRef.current?.close();
                })
              }
            >
              {pending ? "Aguarde..." : confirmLabel}
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}
