"use client";

import { ArrowRight } from "lucide-react";
import { useActionState } from "react";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";
import { initialActionState } from "@/lib/action-state";
import { startCheckoutAction } from "@/features/orders/actions";

export function CheckoutButton({ disabled }: { disabled?: boolean }) {
  const [state, formAction] = useActionState(startCheckoutAction, initialActionState);
  return (
    <form action={formAction} className="flex flex-col gap-2">
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <SubmitButton size="lg" block disabled={disabled} pendingLabel="Reservando presentes...">
        Ir para pagamento
        <ArrowRight className="size-5" aria-hidden />
      </SubmitButton>
    </form>
  );
}
