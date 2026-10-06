import type { CSSProperties } from "react";
import type { ASSET_REGISTRY } from "./asset-registry.generated";

type Edge = "left" | "right" | "top" | "bottom";

/**
 * Alguns assets foram recortados da prancha original com cortes retos (ex.: a juba do leão
 * cortada nas laterais). Um leve esmaecimento via CSS mask nessas bordas evita o aspecto de
 * "caixa" sem modificar o arquivo.
 */
const FADES: Partial<Record<keyof typeof ASSET_REGISTRY, Edge[]>> = {
  "/assets/mascots/monkey.png": ["right"],
};

const SIZE = "14%";

export function assetFadeStyle(src: keyof typeof ASSET_REGISTRY): CSSProperties | undefined {
  const edges = FADES[src];
  if (!edges?.length) return undefined;
  const has = (e: Edge) => edges.includes(e);
  const horizontal = `linear-gradient(to right, ${has("left") ? "transparent" : "#000"} 0, #000 ${has("left") ? SIZE : "0"}, #000 calc(100% - ${has("right") ? SIZE : "0px"}), ${has("right") ? "transparent" : "#000"} 100%)`;
  const vertical = `linear-gradient(to bottom, ${has("top") ? "transparent" : "#000"} 0, #000 ${has("top") ? SIZE : "0"}, #000 calc(100% - ${has("bottom") ? SIZE : "0px"}), ${has("bottom") ? "transparent" : "#000"} 100%)`;
  const image = `${horizontal}, ${vertical}`;
  return {
    maskImage: image,
    WebkitMaskImage: image,
    maskComposite: "intersect",
    WebkitMaskComposite: "source-in",
  };
}
