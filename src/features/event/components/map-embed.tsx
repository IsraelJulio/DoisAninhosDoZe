"use client";

import { MapPin } from "lucide-react";
import { useState } from "react";
import { AssetImage } from "@/components/asset-image";
import { EVENT } from "@/features/event/event";

/**
 * Mapa real do Google sem API key, carregado só quando o convidado pede
 * (economiza dados e JS de terceiros no carregamento inicial). Nunca usamos mapa fictício.
 */
export function MapEmbed() {
  const [loaded, setLoaded] = useState(false);

  if (loaded) {
    return (
      <div className="paper-card overflow-hidden p-0">
        <iframe
          title={`Mapa: ${EVENT.venue}`}
          src={EVENT.googleMapsEmbedUrl}
          className="block h-64 w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setLoaded(true)}
      className="paper-card flex w-full items-center gap-3 p-4 text-left transition hover:bg-paper"
    >
      <AssetImage src="/assets/illustrations/map-pin-card.png" displayWidth={56} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1 font-display font-semibold">
          <MapPin className="size-4 text-danger" aria-hidden />
          Ver mapa aqui
        </span>
        <span className="block text-sm text-ink-soft">Toque para carregar o mapa do local</span>
      </span>
    </button>
  );
}
