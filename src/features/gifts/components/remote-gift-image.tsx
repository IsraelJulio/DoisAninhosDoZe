"use client";

import { Gift } from "lucide-react";
import { useState } from "react";

/**
 * Imagens de produto vêm de domínios arbitrários (Shopee, Amazon...), então não passam pelo
 * otimizador do next/image (que exigiria liberar cada domínio). <img> com lazy loading,
 * sem referrer, e fallback se a URL externa quebrar.
 */
export function RemoteGiftImage({ src, alt, priority }: { src: string; alt: string; priority?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span className="grid size-full place-items-center bg-sand/40 text-wood" role="img" aria-label={alt}>
        <Gift className="size-1/3" aria-hidden />
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- domínio externo arbitrário (ver comentário acima)
    <img
      src={src}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="size-full object-contain p-2"
    />
  );
}
