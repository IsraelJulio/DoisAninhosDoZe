import { AssetImage } from "@/components/asset-image";
import { cn } from "@/lib/cn";
import { GIFT_PLACEHOLDER, resolveGiftImage } from "../gift-image";
import { RemoteGiftImage } from "./remote-gift-image";

/** Imagem do presente dentro de uma moldura quadrada clara. */
export function GiftImage({
  imageUrl,
  alt,
  size,
  className,
  priority,
}: {
  imageUrl: string | null;
  alt: string;
  /** largura aproximada exibida (px) */
  size: number;
  className?: string;
  priority?: boolean;
}) {
  const image = resolveGiftImage(imageUrl);
  return (
    <div className={cn("relative grid aspect-square place-items-center overflow-hidden rounded-2xl bg-white", className)}>
      {image.kind === "asset" ? (
        <AssetImage
          src={image.src}
          alt={image.src === GIFT_PLACEHOLDER ? "" : alt}
          displayWidth={Math.min(150, Math.round(size * 0.72))}
          priority={priority}
        />
      ) : (
        <RemoteGiftImage src={image.src} alt={alt} priority={priority} />
      )}
    </div>
  );
}
