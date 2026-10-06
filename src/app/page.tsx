import { PageShell } from "@/components/layout/page-shell";
import { AssetImage } from "@/components/asset-image";

export default function HomePage() {
  return (
    <PageShell background="home" overlay="light" priorityBackground>
      <div className="flex flex-1 items-center justify-center p-6">
        <AssetImage src="/assets/brand/logo-jose-2-anos.png" alt="José 2 anos" displayWidth={260} priority />
      </div>
    </PageShell>
  );
}
