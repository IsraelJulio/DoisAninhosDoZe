import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Entrada suave de cards (fade + 8px) em CSS puro: o conteúdo já vem visível no HTML do
 * servidor e anima sem precisar de JavaScript (importante em 4G lento via WhatsApp).
 * prefers-reduced-motion desliga a animação (ver globals.css).
 * Framer Motion fica reservado para interações (carrinho, contagem, celebração).
 */
export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <div className={cn("animate-fade-up", className)} style={delay ? { animationDelay: `${delay}s` } : undefined}>
      {children}
    </div>
  );
}
