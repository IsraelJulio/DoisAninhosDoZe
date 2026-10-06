import { ASSET_REGISTRY } from "@/lib/asset-registry.generated";
import type { AssetPath } from "@/components/asset-image";

export const GIFT_PLACEHOLDER: AssetPath = "/assets/placeholders/gift-placeholder.png";

export type ResolvedGiftImage = { kind: "asset"; src: AssetPath } | { kind: "remote"; src: string };

/**
 * Ponto único de resolução da imagem do presente. Hoje: URL externa (importada/colada no admin)
 * ou um asset local. Para migrar para storage próprio no futuro (ex.: Vercel Blob/S3), basta
 * tratar o novo formato aqui — as telas não mudam.
 */
export function resolveGiftImage(imageUrl: string | null | undefined): ResolvedGiftImage {
  if (!imageUrl) return { kind: "asset", src: GIFT_PLACEHOLDER };
  if (imageUrl in ASSET_REGISTRY) return { kind: "asset", src: imageUrl as AssetPath };
  try {
    const url = new URL(imageUrl);
    if (url.protocol === "https:" || url.protocol === "http:") return { kind: "remote", src: url.toString() };
  } catch {
    // URL inválida → placeholder
  }
  return { kind: "asset", src: GIFT_PLACEHOLDER };
}
