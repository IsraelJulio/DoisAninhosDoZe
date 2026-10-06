"use client";

import { ArrowRight, Lock } from "lucide-react";
import { useActionState, useState } from "react";
import { inputClasses } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";
import { initialActionState } from "@/lib/action-state";
import { cn } from "@/lib/cn";
import { maskPhoneInput } from "@/lib/phone";
import { identifyGuestAction } from "../actions";

export function PhoneForm({ next }: { next: string }) {
  const [state, formAction] = useActionState(identifyGuestAction, initialActionState);
  const [phone, setPhone] = useState("");
  const error = state.fieldErrors?.phone;

  return (
    <form action={formAction} className="flex flex-col gap-3" noValidate>
      <input type="hidden" name="next" value={next} />
      <label htmlFor="phone" className="sr-only">
        Número de celular com DDD
      </label>
      <div
        className={cn(
          "flex min-h-14 items-center overflow-hidden rounded-2xl border-2 bg-white transition focus-within:border-forest focus-within:ring-4 focus-within:ring-forest/15",
          error ? "border-danger" : "border-line",
        )}
      >
        <span className="flex h-full items-center gap-1.5 border-r-2 border-line px-3 font-bold text-ink" aria-hidden>
          <span className="rounded bg-forest px-1 text-[0.65rem] font-extrabold leading-4 text-warning">BR</span>
          +55
        </span>
        <input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="(31) 91234-5678"
          value={phone}
          onChange={(e) => setPhone(maskPhoneInput(e.target.value))}
          className={cn(inputClasses, "min-h-13 rounded-none border-0 text-lg focus:ring-0")}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? "phone-error" : "phone-privacy"}
          required
        />
      </div>
      {error && (
        <p id="phone-error" role="alert" className="text-sm font-semibold text-[#b03a2e]">
          {error}
        </p>
      )}
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <SubmitButton size="lg" block pendingLabel="Entrando...">
        Continuar
        <ArrowRight className="size-5" aria-hidden />
      </SubmitButton>
      <p id="phone-privacy" className="flex items-start gap-2 px-1 text-xs text-ink-soft">
        <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
        Seus dados são usados apenas para este evento. Não pedimos senha nem código: o número só serve para
        reconhecer você quando voltar pelo link.
      </p>
    </form>
  );
}
