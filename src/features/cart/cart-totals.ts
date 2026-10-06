import { sumCents } from "@/lib/money";

export interface PricedLine {
  quantity: number;
  unitPriceInCents: number;
}

/** Total do carrinho/pedido. Preços SEMPRE vêm do banco, nunca do navegador. */
export function computeTotals(lines: PricedLine[]): { subtotalInCents: number; totalInCents: number; itemCount: number } {
  for (const line of lines) {
    if (!Number.isInteger(line.quantity) || line.quantity <= 0) throw new Error("Quantidade inválida");
    if (!Number.isInteger(line.unitPriceInCents) || line.unitPriceInCents < 0) throw new Error("Preço inválido");
  }
  const subtotalInCents = sumCents(lines.map((l) => l.quantity * l.unitPriceInCents));
  return {
    subtotalInCents,
    // sem frete/taxas no MVP: total = subtotal (ponto único para evoluir)
    totalInCents: subtotalInCents,
    itemCount: lines.reduce((acc, l) => acc + l.quantity, 0),
  };
}
