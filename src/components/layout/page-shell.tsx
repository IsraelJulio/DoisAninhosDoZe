import type { ReactNode } from "react";
import { JungleBackground, type JungleBackgroundName } from "@/components/jungle-background";
import { cn } from "@/lib/cn";

/**
 * Coluna mobile-first (alvo 390px). No desktop mantém a experiência de convite:
 * coluna centralizada com no máximo 480px, como um "cartão" sobre o fundo de areia.
 */
export function PageShell({
  background,
  overlay,
  priorityBackground,
  children,
  className,
}: {
  background?: JungleBackgroundName;
  overlay?: "none" | "light" | "medium" | "strong";
  priorityBackground?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="min-h-dvh sm:py-6">
      <main
        className={cn(
          "relative isolate mx-auto flex min-h-dvh w-full max-w-[480px] flex-col overflow-x-clip bg-cream",
          "sm:min-h-[calc(100dvh-3rem)] sm:rounded-[32px] sm:shadow-[0_30px_80px_rgba(75,46,23,0.25)] sm:overflow-hidden",
          className,
        )}
      >
        {background && <JungleBackground name={background} overlay={overlay} priority={priorityBackground} />}
        {children}
      </main>
    </div>
  );
}
