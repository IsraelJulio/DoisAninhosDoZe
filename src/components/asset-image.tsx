import Image from "next/image";
import type { CSSProperties } from "react";
import { assetFadeStyle } from "@/lib/asset-fades";
import { ASSET_REGISTRY } from "@/lib/asset-registry.generated";
import { cn } from "@/lib/cn";

export type AssetPath = keyof typeof ASSET_REGISTRY;

interface AssetImageProps {
  src: AssetPath;
  /** Texto alternativo. Omitir (ou "") para imagens decorativas. */
  alt?: string;
  /** Largura de exibição em px CSS (usada para `sizes` e para o tamanho padrão). */
  displayWidth: number;
  className?: string;
  style?: CSSProperties;
  priority?: boolean;
}

/**
 * Renderiza um asset oficial de public/assets recortado pela caixa útil registrada em
 * asset-registry.generated.ts. Os PNGs do asset pack têm o desenho pequeno no centro de um
 * canvas transparente; o recorte é feito via CSS (o arquivo original NÃO é alterado).
 */
export function AssetImage({ src, alt = "", displayWidth, className, style, priority }: AssetImageProps) {
  const meta = ASSET_REGISTRY[src];
  const [x0, y0, x1, y1] = meta.crop;
  const cropW = x1 - x0;
  const cropH = y1 - y0;
  const decorative = alt === "";
  const scale = meta.width / cropW;
  // a imagem interna é absoluta: o wrapper precisa ser posicionado (relative, salvo se já for absolute)
  const positioned = /(^|\s)(absolute|fixed)(\s|$)/.test(className ?? "");

  return (
    <span
      className={cn(
        "block shrink-0 overflow-hidden",
        !positioned && "relative",
        decorative && "pointer-events-none select-none",
        className,
      )}
      style={{ width: displayWidth, aspectRatio: `${cropW} / ${cropH}`, ...assetFadeStyle(src), ...style }}
      aria-hidden={decorative || undefined}
    >
      <Image
        src={src}
        alt={alt}
        width={meta.width}
        height={meta.height}
        priority={priority}
        sizes={`${Math.ceil(displayWidth * scale)}px`}
        draggable={false}
        style={{
          position: "absolute",
          maxWidth: "none",
          width: `${scale * 100}%`,
          height: "auto",
          left: `${(-x0 / cropW) * 100}%`,
          top: `${(-y0 / cropH) * 100}%`,
        }}
      />
    </span>
  );
}
