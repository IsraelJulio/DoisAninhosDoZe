import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "default",
  testId,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon: ReactNode;
  tone?: "default" | "highlight";
  testId?: string;
}) {
  return (
    <div className={cn("paper-card flex flex-col gap-1 p-4", tone === "highlight" && "ring-2 ring-orange/50")} data-testid={testId}>
      <span className="text-forest" aria-hidden>
        {icon}
      </span>
      <span className="text-sm font-bold leading-tight text-ink-soft">{label}</span>
      <span className="font-display text-3xl font-semibold leading-none" data-testid={testId ? `${testId}-value` : undefined}>
        {value}
      </span>
      {hint && <span className="text-xs text-ink-soft">{hint}</span>}
    </div>
  );
}
