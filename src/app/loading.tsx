import { AssetImage } from "@/components/asset-image";

export default function Loading() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3" role="status" aria-live="polite">
      <AssetImage src="/assets/mascots/lion.png" displayWidth={96} className="animate-float" />
      <p className="font-display text-lg font-semibold text-wood-dark">Carregando a aventura...</p>
    </div>
  );
}
