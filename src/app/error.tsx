"use client";

import { RotateCcw } from "lucide-react";
import { StateScreen } from "@/components/state-screen";
import { Button, ButtonLink } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <StateScreen
      title="Ops, algo deu errado"
      description="Um macaquinho mexeu nos fios! Tente novamente em instantes."
      mascot="/assets/mascots/monkey.png"
    >
      <Button onClick={reset} block>
        <RotateCcw className="size-5" aria-hidden />
        Tentar novamente
      </Button>
      <ButtonLink href="/" variant="secondary" block>
        Voltar para o convite
      </ButtonLink>
    </StateScreen>
  );
}
