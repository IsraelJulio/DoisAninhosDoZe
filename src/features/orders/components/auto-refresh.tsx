"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Atualiza a página periodicamente (ex.: aguardando o admin confirmar o Pix). */
export function AutoRefresh({ seconds = 30 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => window.clearInterval(id);
  }, [router, seconds]);
  return null;
}
