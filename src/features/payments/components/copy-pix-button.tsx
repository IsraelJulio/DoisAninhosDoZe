"use client";

import { Check, Copy } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";

/** Copia o PAYLOAD COMPLETO do Pix (Copia e Cola), não apenas a chave. */
export function CopyPixButton({ payload }: { payload: string }) {
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(payload);
    } catch {
      // Fallback para navegadores embutidos (ex.: WebView do WhatsApp) sem Clipboard API
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.select();
      document.execCommand("copy");
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 3000);
  }

  return (
    <div className="flex flex-col gap-2">
      <Button variant="secondary" size="lg" block onClick={copy} data-testid="copy-pix">
        {copied ? <Check className="size-5 text-success" aria-hidden /> : <Copy className="size-5 text-forest" aria-hidden />}
        {copied ? "Código Pix copiado!" : "Copiar código Pix"}
      </Button>
      <span className="sr-only" aria-live="polite">
        {copied ? "Código Pix copiado para a área de transferência" : ""}
      </span>
      <label htmlFor="pix-payload" className="text-xs font-bold text-ink-soft">
        Pix Copia e Cola
      </label>
      <textarea
        id="pix-payload"
        ref={textareaRef}
        readOnly
        value={payload}
        rows={3}
        onFocus={(e) => e.currentTarget.select()}
        className="w-full resize-none break-all rounded-2xl border-2 border-line bg-white p-3 font-mono text-xs text-ink"
        data-testid="pix-payload"
      />
    </div>
  );
}
