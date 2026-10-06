import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { AssetImage } from "@/components/asset-image";
import { CornerLeaves } from "@/components/decor/leaves";
import { PageShell } from "@/components/layout/page-shell";
import { Reveal } from "@/components/motion/reveal";
import { StepBadge } from "@/components/ui/step-badge";
import { WoodSign } from "@/components/ui/wood-sign";
import { EVENT } from "@/features/event/event";
import { NameForm } from "@/features/guests/components/name-form";
import { PhoneForm } from "@/features/guests/components/phone-form";
import { getCurrentGuest } from "@/features/guests/current-guest";
import { safeNextPath } from "@/lib/safe-redirect";

export const metadata: Metadata = { title: "Identificação" };

// Identificação por celular — referência: mockups/03-phone-identification.png
export default async function EntrarPage({ searchParams }: PageProps<"/entrar">) {
  const params = await searchParams;
  const next = safeNextPath(params.next, "/presenca");
  const nameStep = params.etapa === "nome";
  const guest = nameStep ? await getCurrentGuest() : null;
  if (nameStep && !guest) redirect(`/entrar?next=${encodeURIComponent(next)}`);

  return (
    <PageShell background="soft" overlay="medium">
      <CornerLeaves corners={["top-left", "top-right"]} />
      <div className="relative z-10 flex flex-1 flex-col gap-4 px-5 pb-8 pt-[max(1.5rem,env(safe-area-inset-top))]">
        <div className="text-center">
          <StepBadge step={nameStep ? 2 : 1} total={2} />
        </div>

        {nameStep ? (
          <>
            <Reveal className="flex flex-col items-center gap-2 text-center">
              <WoodSign as="h1" className="text-3xl">
                Vamos lá!
              </WoodSign>
              <p className="text-[0.98rem]">Só mais uma informação para te identificar no evento.</p>
            </Reveal>
            <div className="relative mx-auto my-2">
              <div className="relative size-40 overflow-hidden rounded-full border-[6px] border-wood shadow-[var(--shadow-card)]">
                <Image src="/assets/jose/jose-avatar.webp" alt={EVENT.childName} fill sizes="160px" className="object-cover" priority />
              </div>
              <AssetImage src="/assets/mascots/giraffe.png" displayWidth={84} className="absolute -right-16 bottom-0 animate-float" />
            </div>
            <NameForm next={next} defaultName={guest?.name ?? undefined} />
          </>
        ) : (
          <>
            <Reveal className="flex flex-col items-center gap-2 text-center">
              <WoodSign as="h1" className="text-2xl">
                Qual é o seu
                <br />
                número de celular?
              </WoodSign>
              <p className="max-w-[21rem] text-[0.98rem] leading-snug">
                Vamos usar seu WhatsApp para identificar sua presença no aniversário do {EVENT.childName}.
              </p>
            </Reveal>
            <div className="relative mx-auto flex h-52 w-full max-w-[340px] items-end justify-center">
              <div className="relative h-full w-40 overflow-hidden rounded-t-full border-4 border-paper shadow-[var(--shadow-card)]">
                <Image
                  src="/assets/jose/jose-portrait.webp"
                  alt={`${EVENT.childName} sorrindo`}
                  fill
                  sizes="160px"
                  className="object-cover object-[50%_20%]"
                  priority
                />
              </div>
              <AssetImage src="/assets/mascots/lion.png" displayWidth={96} className="absolute bottom-0 right-2 animate-float" />
              <AssetImage src="/assets/mascots/zebra.png" displayWidth={72} className="absolute bottom-0 left-3" />
            </div>
            <PhoneForm next={next} />
          </>
        )}
      </div>
    </PageShell>
  );
}
