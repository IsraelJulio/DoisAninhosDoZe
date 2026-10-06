import "server-only";
import { getPixEnvConfig, isProduction, type PixEnvConfig } from "@/lib/env";
import { buildStaticPixPayload, normalizePixKey } from "./brcode";

/**
 * Abstração de provedor Pix. Hoje: Pix estático gerado pela própria aplicação.
 * No futuro, um provedor com API bancária (Pix dinâmico + webhook) pode implementar
 * a mesma interface sem alterar as telas.
 */
export interface PixChargeRequest {
  amountInCents: number;
  txid: string;
  description?: string;
}

export type PixCharge = { configured: true; payload: string } | { configured: false; reason: string };

export interface PixProvider {
  readonly name: string;
  createCharge(request: PixChargeRequest): PixCharge;
}

export class StaticPixProvider implements PixProvider {
  readonly name = "static";

  constructor(private readonly config: PixEnvConfig) {
    normalizePixKey(config.key); // falha cedo se a chave estiver em formato inválido
  }

  createCharge({ amountInCents, txid, description }: PixChargeRequest): PixCharge {
    const fullDescription = [this.config.descriptionPrefix, description].filter(Boolean).join(" ");
    const payload = buildStaticPixPayload({
      key: this.config.key,
      receiverName: this.config.receiverName,
      receiverCity: this.config.receiverCity,
      amountInCents,
      txid,
      description: fullDescription || undefined,
    });
    return { configured: true, payload };
  }
}

/** Usado quando o Pix não está configurado: nunca gera payload (evita um Pix inválido). */
export class UnconfiguredPixProvider implements PixProvider {
  readonly name = "unconfigured";

  createCharge(): PixCharge {
    return {
      configured: false,
      reason: isProduction
        ? "O pagamento via Pix ainda não está disponível. Por favor, avise os pais do José."
        : "Pix não configurado (defina PIX_KEY, PIX_RECEIVER_NAME e PIX_RECEIVER_CITY). Em desenvolvimento o fluxo continua sem QR Code.",
    };
  }
}

export function getPixProvider(): PixProvider {
  const config = getPixEnvConfig();
  return config ? new StaticPixProvider(config) : new UnconfiguredPixProvider();
}
