"use client";

import { ArrowRight, User } from "lucide-react";
import { useActionState } from "react";
import { Field, inputClasses } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { initialActionState } from "@/lib/action-state";
import { cn } from "@/lib/cn";
import { saveGuestNameAction } from "../actions";

export function NameForm({ next, defaultName }: { next: string; defaultName?: string }) {
  const [state, formAction] = useActionState(saveGuestNameAction, initialActionState);
  const error = state.fieldErrors?.name;

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="next" value={next} />
      <Field label="Seu nome completo" htmlFor="name" error={error}>
        <div className="relative">
          <User className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-ink-soft" aria-hidden />
          <input
            id="name"
            name="name"
            autoComplete="name"
            placeholder="Ex.: Maria Silva"
            defaultValue={defaultName}
            className={cn(inputClasses, "pl-11")}
            aria-invalid={!!error || undefined}
            aria-describedby={error ? "name-error" : undefined}
            required
          />
        </div>
      </Field>
      <SubmitButton size="lg" block>
        Continuar
        <ArrowRight className="size-5" aria-hidden />
      </SubmitButton>
    </form>
  );
}
