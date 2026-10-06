import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "info" | "warning" | "error" | "success";

const styles: Record<Tone, { box: string; Icon: typeof Info }> = {
  info: { box: "bg-sky/70 text-[#1d4f5c] border-[#9fd2df]", Icon: Info },
  warning: { box: "bg-warning/20 text-wood-dark border-warning/50", Icon: AlertTriangle },
  error: { box: "bg-danger/10 text-[#9c3126] border-danger/40", Icon: XCircle },
  success: { box: "bg-success/10 text-forest-dark border-success/40", Icon: CheckCircle2 },
};

export function Notice({ tone = "info", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  const { box, Icon } = styles[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("flex items-start gap-2.5 rounded-2xl border px-3.5 py-3 text-sm font-semibold", box, className)}
    >
      <Icon className="mt-0.5 size-4.5 shrink-0" aria-hidden />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
