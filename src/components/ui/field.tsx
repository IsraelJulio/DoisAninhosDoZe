import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export const inputClasses =
  "w-full min-h-12 rounded-2xl border-2 border-line bg-white px-4 text-base text-ink placeholder:text-ink-soft/60 outline-none transition focus:border-forest focus:ring-4 focus:ring-forest/15 aria-invalid:border-danger";

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
  className,
}: {
  label: ReactNode;
  htmlFor: string;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-bold text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-sm font-semibold text-[#b03a2e]" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-ink-soft">{hint}</p>
      ) : null}
    </div>
  );
}
