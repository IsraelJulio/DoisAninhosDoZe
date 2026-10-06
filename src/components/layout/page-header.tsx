import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import { AssetImage, type AssetPath } from "@/components/asset-image";
import { WoodSign } from "@/components/ui/wood-sign";

/** Cabeçalho das telas internas: voltar + placa de madeira + mascote opcional. */
export function PageHeader({
  title,
  backHref,
  backLabel = "Voltar",
  icon,
  mascot,
  action,
}: {
  title: string;
  backHref?: string;
  backLabel?: string;
  icon?: ReactNode;
  mascot?: AssetPath;
  action?: ReactNode;
}) {
  return (
    <header className="relative z-10 flex items-center gap-2 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-2">
      {backHref ? (
        <Link
          href={backHref}
          aria-label={backLabel}
          className="grid size-11 shrink-0 place-items-center rounded-full bg-paper text-wood-dark shadow-[var(--shadow-soft)]"
        >
          <ChevronLeft className="size-6" aria-hidden />
        </Link>
      ) : (
        <span className="size-11 shrink-0" aria-hidden />
      )}
      <div className="flex min-w-0 flex-1 justify-center">
        <WoodSign as="h1" className={`max-w-full px-4 ${title.length > 16 ? "text-base" : "text-xl"}`}>
          {icon}
          <span className="truncate">{title}</span>
        </WoodSign>
      </div>
      {action ?? (mascot ? <AssetImage src={mascot} displayWidth={44} className="animate-float" /> : <span className="size-11 shrink-0" aria-hidden />)}
    </header>
  );
}
