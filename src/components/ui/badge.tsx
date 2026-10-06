import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "success" | "warning" | "danger" | "neutral" | "info";

const tones: Record<Tone, string> = {
  success: "bg-success/12 text-forest-dark ring-success/30",
  warning: "bg-warning/25 text-wood-dark ring-warning/50",
  danger: "bg-danger/12 text-[#a8352a] ring-danger/30",
  neutral: "bg-ink/8 text-ink-soft ring-ink/15",
  info: "bg-sky text-[#1d5a6b] ring-[#9fd2df]",
};

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
