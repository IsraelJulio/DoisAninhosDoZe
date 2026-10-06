import type { ReactNode } from "react";
import { AssetImage, type AssetPath } from "@/components/asset-image";
import { PageShell } from "@/components/layout/page-shell";
import { WoodSign } from "@/components/ui/wood-sign";

/** Tela cheia para estados (erro, vazio, não encontrado) — nunca deixar tela branca. */
export function StateScreen({
  title,
  description,
  mascot = "/assets/mascots/lion.png",
  children,
}: {
  title: string;
  description?: ReactNode;
  mascot?: AssetPath;
  children?: ReactNode;
}) {
  return (
    <PageShell background="soft" overlay="strong">
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-12 text-center">
        <AssetImage src={mascot} displayWidth={130} className="animate-float" />
        <WoodSign as="h1" className="text-2xl">
          {title}
        </WoodSign>
        {description && <div className="max-w-[22rem] text-ink-soft">{description}</div>}
        {children && <div className="flex w-full max-w-[22rem] flex-col gap-3 pt-2">{children}</div>}
      </div>
    </PageShell>
  );
}
