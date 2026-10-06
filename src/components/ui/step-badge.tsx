import { PawPrint } from "lucide-react";

export function StepBadge({ step, total }: { step: number; total: number }) {
  return (
    <p className="mx-auto inline-flex items-center gap-2 rounded-full bg-sand/80 px-4 py-1 text-sm font-bold text-wood-dark shadow-[var(--shadow-soft)]">
      <PawPrint className="size-4" aria-hidden />
      Passo {step} de {total}
      <PawPrint className="size-4" aria-hidden />
    </p>
  );
}
