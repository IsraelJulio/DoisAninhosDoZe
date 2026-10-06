"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/cn";

/** Seletor numérico [-] 2 [+]. Nunca permite valores fora de [min, max]. */
export function Stepper({
  value,
  onChange,
  min = 0,
  max = 20,
  label,
  name,
  size = "md",
  disabled,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label: string;
  name?: string;
  size?: "sm" | "md";
  disabled?: boolean;
}) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const btn = cn(
    "grid place-items-center rounded-full bg-forest/10 text-forest-dark transition hover:bg-forest/20 disabled:opacity-35 disabled:cursor-not-allowed",
    size === "md" ? "size-10" : "size-8",
  );
  return (
    <div className="inline-flex items-center gap-2" role="group" aria-label={label}>
      <button
        type="button"
        className={btn}
        onClick={() => onChange(clamp(value - 1))}
        disabled={disabled || value <= min}
        aria-label={`Diminuir ${label.toLowerCase()}`}
      >
        <Minus className="size-4.5" aria-hidden />
      </button>
      <output
        aria-live="polite"
        aria-label={label}
        className={cn("min-w-8 text-center font-display font-semibold tabular-nums", size === "md" ? "text-xl" : "text-base")}
      >
        {value}
      </output>
      {name && <input type="hidden" name={name} value={value} />}
      <button
        type="button"
        className={btn}
        onClick={() => onChange(clamp(value + 1))}
        disabled={disabled || value >= max}
        aria-label={`Aumentar ${label.toLowerCase()}`}
      >
        <Plus className="size-4.5" aria-hidden />
      </button>
    </div>
  );
}
