"use client";

import { ArrowRight, Baby, Check, MessageCircle, User, Users, X } from "lucide-react";
import { useActionState, useState } from "react";
import { Field, inputClasses } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { Stepper } from "@/components/ui/stepper";
import { SubmitButton } from "@/components/ui/submit-button";
import { initialActionState } from "@/lib/action-state";
import { cn } from "@/lib/cn";
import { saveRsvpAction } from "../actions";
import { RSVP_MAX_PER_GROUP, RSVP_MESSAGE_MAX } from "../rsvp-schema";

interface RsvpFormProps {
  defaults: { name: string; attending: boolean | null; adults: number; children: number; message: string };
}

export function RsvpForm({ defaults }: RsvpFormProps) {
  const [state, formAction] = useActionState(saveRsvpAction, initialActionState);
  const [attending, setAttending] = useState<boolean | null>(defaults.attending);
  const [adults, setAdults] = useState(defaults.adults);
  const [children, setChildren] = useState(defaults.children);
  const [message, setMessage] = useState(defaults.message);
  const errors = state.fieldErrors ?? {};

  const option = (value: boolean) =>
    cn(
      "flex min-h-14 flex-1 items-center justify-center gap-2 rounded-2xl border-2 px-3 font-display font-semibold transition",
      attending === value
        ? value
          ? "border-forest bg-forest text-white shadow-[0_4px_0_var(--color-forest-dark)]"
          : "border-wood bg-wood text-cream shadow-[0_4px_0_var(--color-wood-dark)]"
        : "border-line bg-white text-ink hover:border-sand",
    );

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <Field label="Nome do convidado" htmlFor="name" error={errors.name}>
        <div className="relative">
          <User className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-ink-soft" aria-hidden />
          <input
            id="name"
            name="name"
            autoComplete="name"
            placeholder="Digite seu nome"
            defaultValue={defaults.name}
            className={cn(inputClasses, "pl-11")}
            aria-invalid={!!errors.name || undefined}
            aria-describedby={errors.name ? "name-error" : undefined}
            required
          />
        </div>
      </Field>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-sm font-bold">Você vai participar?</legend>
        <input type="hidden" name="attending" value={attending === null ? "" : attending ? "yes" : "no"} />
        <div className="flex gap-3">
          <button type="button" className={option(true)} aria-pressed={attending === true} onClick={() => setAttending(true)}>
            <Check className="size-5" aria-hidden /> Sim, eu vou!
          </button>
          <button type="button" className={option(false)} aria-pressed={attending === false} onClick={() => setAttending(false)}>
            <X className="size-5" aria-hidden /> Não poderei
          </button>
        </div>
        {errors.attending && (
          <p className="text-sm font-semibold text-[#b03a2e]" role="alert">
            {errors.attending}
          </p>
        )}
      </fieldset>

      {attending !== false && (
        <>
          <CountRow
            label="Quantos adultos?"
            icon={<Users className="size-6 text-ink-soft" aria-hidden />}
            value={adults}
            onChange={setAdults}
            name="adults"
            error={errors.adults}
          />
          <CountRow
            label="Quantas crianças?"
            hint="Contamos as crianças para preparar as lembrancinhas com carinho."
            icon={<Baby className="size-6 text-ink-soft" aria-hidden />}
            value={children}
            onChange={setChildren}
            name="children"
            error={errors.children}
          />
        </>
      )}
      {attending === false && (
        <>
          <input type="hidden" name="adults" value={0} />
          <input type="hidden" name="children" value={0} />
        </>
      )}

      <Field
        label={
          <>
            Deixe um recado para o José <span className="font-normal text-ink-soft">(opcional)</span>
          </>
        }
        htmlFor="message"
        error={errors.message}
      >
        <div className="relative">
          <MessageCircle className="pointer-events-none absolute left-3.5 top-3.5 size-5 text-ink-soft" aria-hidden />
          <textarea
            id="message"
            name="message"
            rows={3}
            maxLength={RSVP_MESSAGE_MAX}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Escreva uma mensagem carinhosa... (ex.: Parabéns, José!)"
            className={cn(inputClasses, "min-h-24 resize-none py-3 pl-11")}
          />
          <span className="pointer-events-none absolute bottom-2 right-3 text-xs text-ink-soft" aria-hidden>
            {message.length}/{RSVP_MESSAGE_MAX}
          </span>
        </div>
      </Field>

      {state.error && <Notice tone="error">{state.error}</Notice>}

      <SubmitButton size="lg" block>
        Enviar confirmação
        <ArrowRight className="size-5" aria-hidden />
      </SubmitButton>
    </form>
  );
}

function CountRow({
  label,
  hint,
  icon,
  value,
  onChange,
  name,
  error,
}: {
  label: string;
  hint?: string;
  icon: React.ReactNode;
  value: number;
  onChange: (n: number) => void;
  name: string;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-sm font-bold" id={`${name}-label`}>
        {label}
      </p>
      <div className="flex items-center justify-between rounded-2xl border-2 border-line bg-white px-3 py-2">
        {icon}
        <Stepper label={label.replace("?", "")} value={value} onChange={onChange} name={name} max={RSVP_MAX_PER_GROUP} />
      </div>
      {error ? (
        <p className="text-sm font-semibold text-[#b03a2e]" role="alert">
          {error}
        </p>
      ) : (
        hint && <p className="text-xs text-ink-soft">{hint}</p>
      )}
    </div>
  );
}
