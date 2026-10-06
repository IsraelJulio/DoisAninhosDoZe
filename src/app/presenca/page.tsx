import type { Metadata } from "next";
import { Gift, Home, Pencil } from "lucide-react";
import { AssetImage } from "@/components/asset-image";
import { CornerLeaves } from "@/components/decor/leaves";
import { PageShell } from "@/components/layout/page-shell";
import { Reveal } from "@/components/motion/reveal";
import { ButtonLink } from "@/components/ui/button";
import { WoodSign } from "@/components/ui/wood-sign";
import { EventSummaryCard } from "@/features/event/components/event-summary-card";
import { EVENT } from "@/features/event/event";
import { requireGuest } from "@/features/guests/current-guest";
import { RsvpForm } from "@/features/rsvp/components/rsvp-form";

export const metadata: Metadata = { title: "Confirmar presença" };

// RSVP — referência: mockups/04-rsvp.png
export default async function PresencaPage({ searchParams }: PageProps<"/presenca">) {
  const params = await searchParams;
  const guest = await requireGuest("/presenca");
  const rsvp = guest.rsvp;
  const editing = params.editar === "1";

  if (rsvp && !editing) {
    return (
      <PageShell background="payment" overlay="light">
        <CornerLeaves corners={["top-left", "top-right"]} />
        <div className="relative z-10 flex flex-1 flex-col gap-4 px-5 pb-8 pt-[max(1.5rem,env(safe-area-inset-top))]">
          <Reveal className="flex justify-center">
            <WoodSign as="h1" className="text-3xl">
              {rsvp.attending ? "Presença confirmada!" : "Resposta registrada"}
            </WoodSign>
          </Reveal>

          <div className="relative mx-auto flex h-60 w-full max-w-[340px] items-end justify-center">
            <AssetImage src="/assets/mascots/giraffe.png" displayWidth={110} className="absolute bottom-2 left-0 animate-float" />
            <div className="h-full w-[150px] overflow-hidden">
              <AssetImage
                src="/assets/jose/jose-pointing-cutout.png"
                alt={EVENT.childName}
                displayWidth={150}
                priority
                className="animate-float drop-shadow-[0_10px_18px_rgba(51,37,29,0.25)]"
              />
            </div>
            <AssetImage src="/assets/illustrations/success.png" displayWidth={70} className="absolute right-2 top-4" />
          </div>

          <Reveal delay={0.1} className="paper-card -mt-4 p-5 text-center">
            {rsvp.attending ? (
              <>
                <p className="font-display text-xl font-semibold">Muito obrigado{guest.name ? `, ${guest.name.split(" ")[0]}` : ""}!</p>
                <p className="mt-1">Sua presença no aniversário do {EVENT.childName} está confirmada!</p>
                <p className="mt-3 inline-flex flex-wrap justify-center gap-2 text-sm font-bold" data-testid="rsvp-counts">
                  <span className="rounded-full bg-forest/10 px-3 py-1 text-forest-dark">
                    {rsvp.adults} {rsvp.adults === 1 ? "adulto" : "adultos"}
                  </span>
                  <span className="rounded-full bg-orange/15 px-3 py-1 text-wood-dark">
                    {rsvp.children} {rsvp.children === 1 ? "criança" : "crianças"}
                  </span>
                </p>
                <p className="mt-3 text-ink-soft">Estamos muito felizes em ter você nessa aventura!</p>
              </>
            ) : (
              <>
                <p className="font-display text-xl font-semibold">Que pena que você não poderá ir!</p>
                <p className="mt-1 text-ink-soft">
                  Obrigado por avisar. Se mudar de ideia, é só editar sua resposta.
                </p>
              </>
            )}
          </Reveal>

          {rsvp.attending && <EventSummaryCard />}

          <div className="flex flex-col gap-3">
            <ButtonLink href="/presenca?editar=1" variant="secondary" block>
              <Pencil className="size-4.5" aria-hidden />
              Editar minha confirmação
            </ButtonLink>
            <ButtonLink href="/presentes" block>
              <Gift className="size-5" aria-hidden />
              Ver lista de presentes
            </ButtonLink>
            <ButtonLink href="/" variant="ghost" block>
              <Home className="size-4.5" aria-hidden />
              Voltar para o início
            </ButtonLink>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell background="soft" overlay="medium">
      <CornerLeaves corners={["top-right"]} />
      <div className="relative z-10 flex flex-1 flex-col gap-4 px-5 pb-6 pt-[max(1.75rem,env(safe-area-inset-top))]">
        <Reveal className="flex flex-col items-center gap-2 text-center">
          <WoodSign as="h1" className="text-[1.7rem]">
            {editing ? "Editar presença" : "Confirme sua presença"}
          </WoodSign>
          <p className="max-w-[21rem] text-[0.98rem] leading-snug">
            Sua presença vai deixar o dia do {EVENT.childName} ainda mais especial! Preencha os dados abaixo:
          </p>
        </Reveal>
        <RsvpForm
          defaults={{
            name: guest.name ?? "",
            attending: rsvp ? rsvp.attending : null,
            adults: rsvp?.attending ? rsvp.adults : 1,
            children: rsvp?.attending ? rsvp.children : 0,
            message: rsvp?.message ?? "",
          }}
        />
        <div className="mt-2 flex items-end justify-between" aria-hidden>
          <AssetImage src="/assets/mascots/lion.png" displayWidth={96} className="animate-float" />
          <WoodSign className="mb-4 rotate-[-4deg] text-sm">Contamos com você nessa aventura!</WoodSign>
        </div>
      </div>
    </PageShell>
  );
}
