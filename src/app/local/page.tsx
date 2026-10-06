import type { Metadata } from "next";
import Image from "next/image";
import { ArrowRight, CalendarCheck, CalendarDays, Clock, Gift, Navigation } from "lucide-react";
import { AssetImage } from "@/components/asset-image";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { Reveal } from "@/components/motion/reveal";
import { ButtonLink } from "@/components/ui/button";
import { WoodSign } from "@/components/ui/wood-sign";
import { EVENT } from "@/features/event/event";
import { MapEmbed } from "@/features/event/components/map-embed";

export const metadata: Metadata = { title: "Detalhes da festa" };

const highlights = [
  { icon: "/assets/decor/confetti.png", text: "Muita diversão para as crianças" },
  { icon: "/assets/illustrations/birthday-cake.png", text: "Parabéns e comidinhas" },
  { icon: "/assets/decor/balloon-green.png", text: "Clima de safari para toda a família" },
  { icon: "/assets/illustrations/gift-stack.png", text: "Surpresas para o José" },
] as const;

// Detalhes do evento e localização — referência: mockups/02-event-location.png
export default function LocalPage() {
  return (
    <PageShell background="soft" overlay="strong">
      <PageHeader title="Detalhes da Festa" backHref="/" />

      <div className="flex flex-col gap-5 px-4 pb-10 pt-2">
        <Reveal>
          <div className="flex items-center gap-3">
            <p className="flex-1 text-[0.98rem] leading-snug">
              Será um dia muito especial e a sua presença vai deixar essa aventura ainda mais completa!
            </p>
            <div className="relative size-24 shrink-0 overflow-hidden rounded-full border-4 border-paper shadow-[var(--shadow-soft)]">
              <Image src="/assets/jose/jose-avatar.webp" alt={EVENT.childName} fill sizes="96px" className="object-cover" />
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.05}>
          <section className="paper-card flex items-center gap-3 p-4" aria-label="Local">
            <AssetImage src="/assets/illustrations/location-sign.png" displayWidth={64} />
            <div className="min-w-0">
              <h2 className="font-display text-lg font-semibold leading-tight">{EVENT.venue}</h2>
              <address className="mt-1 text-sm not-italic text-ink-soft">
                {EVENT.street}
                <br />
                {EVENT.district}
              </address>
            </div>
          </section>
        </Reveal>

        <Reveal delay={0.1}>
          <section className="paper-card grid grid-cols-2 divide-x divide-line p-4" aria-label="Data e horário">
            <div className="flex items-center gap-2 pr-3">
              <CalendarDays className="size-7 shrink-0 text-orange" aria-hidden />
              <p className="leading-tight">
                <span className="block font-display text-lg font-semibold">{EVENT.displayDate}</span>
                <span className="text-sm capitalize text-ink-soft">{EVENT.displayWeekday}</span>
              </p>
            </div>
            <div className="flex items-center gap-2 pl-3">
              <Clock className="size-7 shrink-0 text-orange" aria-hidden />
              <p className="leading-tight">
                <span className="block font-display text-lg font-semibold">{EVENT.displayTime}</span>
                <span className="text-sm text-ink-soft">início da festa</span>
              </p>
            </div>
          </section>
        </Reveal>

        <section className="flex flex-col gap-3" aria-labelledby="como-chegar">
          <div className="flex justify-center">
            <WoodSign as="h2" className="text-lg">
              <span id="como-chegar">Como chegar?</span>
            </WoodSign>
          </div>
          <MapEmbed />
          <ButtonLink href={EVENT.googleMapsUrl} target="_blank" rel="noopener noreferrer" size="lg" block>
            <Navigation className="size-5" aria-hidden />
            Abrir no Google Maps
            <ArrowRight className="size-5" aria-hidden />
          </ButtonLink>
        </section>

        <section className="flex flex-col gap-3" aria-labelledby="o-que-espera">
          <div className="flex justify-center">
            <WoodSign as="h2" className="text-lg">
              <span id="o-que-espera">O que te espera por aqui?</span>
            </WoodSign>
          </div>
          <p className="text-center text-sm text-ink-soft">
            Uma festa safari cheia de diversão e momentos inesquecíveis para toda a família!
          </p>
          <ul className="grid grid-cols-2 gap-3">
            {highlights.map((item) => (
              <li key={item.text} className="paper-card flex items-center gap-2 p-3 text-sm font-semibold">
                <AssetImage src={item.icon} displayWidth={36} />
                {item.text}
              </li>
            ))}
          </ul>
        </section>

        <div className="flex flex-col gap-3 pt-2">
          <ButtonLink href="/presenca" block>
            <CalendarCheck className="size-5" aria-hidden />
            Confirmar presença
          </ButtonLink>
          <ButtonLink href="/presentes" variant="secondary" block>
            <Gift className="size-5 text-orange" aria-hidden />
            Ver lista de presentes
          </ButtonLink>
        </div>

        <div className="relative mt-2 flex items-end justify-center gap-2" aria-hidden>
          <AssetImage src="/assets/mascots/giraffe.png" displayWidth={90} />
          <WoodSign className="mb-6 rotate-[-4deg] text-base">Estamos te esperando!</WoodSign>
        </div>
      </div>
    </PageShell>
  );
}
