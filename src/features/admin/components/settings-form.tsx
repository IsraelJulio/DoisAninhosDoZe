"use client";

import { useActionState } from "react";
import { Field, inputClasses } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";
import { initialActionState } from "@/lib/action-state";
import { saveSettingsAction } from "../actions";

export function SettingsForm({ reservationMinutes }: { reservationMinutes: number }) {
  const [state, formAction] = useActionState(saveSettingsAction, initialActionState);
  return (
    <form action={formAction} className="mt-2 flex flex-col gap-3">
      <Field label="Tempo da reserva temporária (minutos)" htmlFor="reservationMinutes" hint="Padrão: 30 minutos. Vale para novas reservas.">
        <input id="reservationMinutes" name="reservationMinutes" type="number" inputMode="numeric" min={5} max={180} defaultValue={reservationMinutes} className={inputClasses} />
      </Field>
      {state.error && <Notice tone="error">{state.error}</Notice>}
      {state.ok && <Notice tone="success">{state.message}</Notice>}
      <SubmitButton>Salvar</SubmitButton>
    </form>
  );
}
