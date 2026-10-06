"use client";

import { LazyMotion, MotionConfig, domAnimation, m } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Contador regressivo da reserva. APENAS apresentação: a validade real é sempre calculada no
 * servidor por reservationExpiresAt. Corrigimos a diferença de relógio do aparelho usando o
 * horário do servidor no momento da renderização.
 */
export function ReservationCountdown({
  expiresAt,
  serverNow,
  totalMinutes,
  variant = "ring",
}: {
  expiresAt: string;
  serverNow: string;
  totalMinutes: number;
  variant?: "ring" | "inline";
}) {
  const router = useRouter();
  const expiresMs = new Date(expiresAt).getTime();
  const skew = useRef<number | null>(null);
  const [remaining, setRemaining] = useState(() => Math.max(0, expiresMs - new Date(serverNow).getTime()));
  const refreshed = useRef(false);

  useEffect(() => {
    skew.current ??= new Date(serverNow).getTime() - Date.now();
    const tick = () => {
      const left = Math.max(0, expiresMs - (Date.now() + (skew.current ?? 0)));
      setRemaining(left);
      if (left === 0 && !refreshed.current) {
        refreshed.current = true;
        router.refresh(); // o servidor decide e renderiza o estado "expirado"
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [expiresMs, serverNow, router]);

  const totalSeconds = Math.ceil(remaining / 1000);
  const label = `${String(Math.floor(totalSeconds / 60)).padStart(2, "0")}:${String(totalSeconds % 60).padStart(2, "0")}`;
  const fraction = Math.min(1, remaining / (totalMinutes * 60_000));
  const urgent = remaining < 5 * 60_000;

  if (variant === "inline") {
    return (
      <span className={urgent ? "font-extrabold text-[#b03a2e]" : "font-extrabold"} role="timer" aria-label={`Tempo restante: ${label}`}>
        {label}
      </span>
    );
  }

  const r = 34;
  const circumference = 2 * Math.PI * r;
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <div className="relative grid size-24 shrink-0 place-items-center rounded-full bg-white shadow-[var(--shadow-soft)]" role="timer" aria-label={`Tempo restante da reserva: ${label}`}>
          <svg viewBox="0 0 80 80" className="absolute inset-0 size-full -rotate-90" aria-hidden>
            <circle cx="40" cy="40" r={r} fill="none" stroke="#f3e5cc" strokeWidth="7" />
            <m.circle
              cx="40"
              cy="40"
              r={r}
              fill="none"
              stroke={urgent ? "var(--color-danger)" : "var(--color-orange)"}
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={circumference}
              animate={{ strokeDashoffset: circumference * (1 - fraction) }}
              transition={{ duration: 0.9, ease: "linear" }}
            />
          </svg>
          <span className="font-display text-xl font-semibold tabular-nums" aria-hidden>
            {label}
          </span>
        </div>
      </MotionConfig>
    </LazyMotion>
  );
}
