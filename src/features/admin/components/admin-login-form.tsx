"use client";

import { LogIn } from "lucide-react";
import { useActionState, useState } from "react";
import { Field, inputClasses } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";
import { initialActionState } from "@/lib/action-state";
import { adminLoginAction } from "../actions";

export function AdminLoginForm() {
  const [state, formAction] = useActionState(adminLoginAction, initialActionState);
  const [username, setUsername] = useState(""); // controlado: o React reseta campos após a action
  return (
    <form action={formAction} className="paper-card flex flex-col gap-4 p-5">
      <Field label="Usuário" htmlFor="username">
        <input id="username" name="username" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} className={inputClasses} required />
      </Field>
      <Field label="Senha" htmlFor="password">
        <input id="password" name="password" type="password" autoComplete="current-password" className={inputClasses} required />
      </Field>
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <SubmitButton size="lg" block pendingLabel="Entrando...">
        <LogIn className="size-5" aria-hidden />
        Entrar
      </SubmitButton>
    </form>
  );
}
