"use client";

import { ArrowRight } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { reportPaymentAction } from "@/features/orders/actions";

export function ReportPaymentButton({ orderId }: { orderId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  return (
    <div className="flex flex-col gap-2">
      <Button
        size="lg"
        block
        disabled={pending}
        aria-busy={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await reportPaymentAction(orderId);
            setError(result?.error);
          })
        }
      >
        {pending ? "Enviando..." : "Já fiz o pagamento"}
        {!pending && <ArrowRight className="size-5" aria-hidden />}
      </Button>
      {error && <Notice tone="error">{error}</Notice>}
    </div>
  );
}
