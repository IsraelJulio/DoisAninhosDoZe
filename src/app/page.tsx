import { ArrowRight, CalendarCheck, ChevronRight, Gift } from "lucide-react";
import { AssetImage } from "@/components/asset-image";
import { CornerLeaves } from "@/components/decor/leaves";
import { PageShell } from "@/components/layout/page-shell";
import { Reveal } from "@/components/motion/reveal";
import { ButtonLink } from "@/components/ui/button";
import { EventSummaryCard } from "@/features/event/components/event-summary-card";
import { EVENT } from "@/features/event/event";

// Home / convite — referência: design/reference/mockups/01-home.png
export default function HomePage() {
  return (
    <PageShell background="home" overlay="none" priorityBackground>
      <h1 className="sr-only">
        Aniversário de {EVENT.age} anos do {EVENT.childName}
      </h1>

      {/* Hero: José sobre a placa "José 2 anos" + amigos da selva */}
      <section className="relative h-[clamp(420px,112vw,440px)]" aria-label={`Foto do ${EVENT.childName} com os bichinhos`}>
        <CornerLeaves corners={["top-left", "top-right"]} size={90} />
        <AssetImage
          src="/assets/mascots/monkey.png"
          displayWidth={78}
          className="absolute left-4 top-3 z-[2] origin-top animate-sway"
        />

        <AssetImage
          src="/assets/jose/jose-hero.webp"
          alt={`${EVENT.childName} sorrindo e apontando, sobre a placa ${EVENT.childName} ${EVENT.age} anos`}
          displayWidth={290}
          priority
          className="absolute bottom-0 left-1/2 z-[5] max-w-[78%] -translate-x-1/2 drop-shadow-[0_10px_18px_rgba(51,37,29,0.25)]"
        />

        <AssetImage
          src="/assets/mascots/lion.png"
          displayWidth={118}
          className="absolute bottom-6 left-[2%] z-[4] animate-float"
          style={{ animationDelay: "0.6s" }}
        />
        <AssetImage
          src="/assets/mascots/giraffe.png"
          displayWidth={112}
          className="absolute bottom-14 right-[1%] z-[3] animate-float"
          style={{ animationDelay: "2s" }}
        />
      </section>

      <section className="relative z-10 flex flex-1 flex-col gap-4 bg-gradient-to-b from-cream/0 via-cream/95 to-cream px-5 pb-8 pt-1">
        <Reveal className="text-center">
          <h2 className="font-display text-[1.65rem] font-semibold leading-tight text-wood-dark">
            Venha viver essa
            <br />
            aventura comigo!
          </h2>
          <p className="mx-auto mt-2 max-w-[22rem] text-[0.98rem] leading-snug text-ink">
            Estou completando {EVENT.age} aninhos e será incrível ter você nessa fase especial!
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          <EventSummaryCard />
        </Reveal>

        <Reveal delay={0.2} className="flex flex-col gap-3 pt-1">
          <ButtonLink href="/presenca" size="lg" block>
            <CalendarCheck className="size-5.5" aria-hidden />
            Confirmar presença
            <ArrowRight className="size-5" aria-hidden />
          </ButtonLink>
          <ButtonLink href="/presentes" variant="secondary" block>
            <Gift className="size-5 text-orange" aria-hidden />
            Ver lista de presentes
            <ChevronRight className="size-4.5" aria-hidden />
          </ButtonLink>
        </Reveal>

        <div className="mt-auto flex items-end justify-between pt-4" aria-hidden>
          <AssetImage src="/assets/decor/grass-cluster.png" displayWidth={90} />
          <AssetImage src="/assets/decor/paw.png" displayWidth={34} className="mb-2 opacity-70" />
          <AssetImage src="/assets/decor/grass-cluster.png" displayWidth={90} className="-scale-x-100" />
        </div>
      </section>
    </PageShell>
  );
}
