import { StateScreen } from "@/components/state-screen";
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <StateScreen
      title="Página não encontrada"
      description="Parece que essa trilha da selva não leva a lugar nenhum."
      mascot="/assets/mascots/elephant.png"
    >
      <ButtonLink href="/" block>
        Voltar para o convite
      </ButtonLink>
    </StateScreen>
  );
}
