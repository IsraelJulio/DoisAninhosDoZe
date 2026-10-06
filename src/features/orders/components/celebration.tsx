"use client";

import { LazyMotion, MotionConfig, domAnimation, m } from "framer-motion";
import type { ReactNode } from "react";

/** Entrada comemorativa (escala + leve "pulo") para a confirmação do presente. */
export function Celebration({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <m.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: [0.85, 1.04, 1], opacity: 1 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          {children}
        </m.div>
      </MotionConfig>
    </LazyMotion>
  );
}
