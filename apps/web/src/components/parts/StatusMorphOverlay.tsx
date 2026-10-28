"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { CircleCheck, Cog } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { PartResolutionMode } from "@/lib/types";

interface Props {
  mode: PartResolutionMode;
  mechanicFirstName: string;
  onDone: () => void;
}

/**
 * Micro‑animación estilo motion‑graphics:
 * “Pausado por Repuesto” → engranaje que gira + onda expansiva → “En Reparación Activa”.
 * Solo transform/opacity para mantener 60 fps.
 */
export function StatusMorphOverlay({ mode, mechanicFirstName, onDone }: Props) {
  const reduce = useReducedMotion();
  const [step, setStep] = useState(reduce ? 2 : 0);

  useEffect(() => {
    const timers = reduce
      ? [window.setTimeout(onDone, 1600)]
      : [
          window.setTimeout(() => setStep(1), 1000),
          window.setTimeout(() => setStep(2), 1900),
          window.setTimeout(onDone, 3600),
        ];
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [reduce, onDone]);

  return (
    <motion.div
      role="status"
      aria-live="polite"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-6 overflow-hidden rounded-[inherit] bg-obsidian/95 px-6 text-center backdrop-blur-md"
    >
      {/* Ondas */}
      {!reduce &&
        [0, 0.35, 0.7].map((d) => (
          <motion.span
            key={d}
            aria-hidden
            className="absolute left-1/2 top-[38%] h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
            style={{ borderColor: step >= 1 ? "#FFD60A" : "#F59E0B" }}
            initial={{ scale: 0.3, opacity: 0.9 }}
            animate={{ scale: 3.2, opacity: 0 }}
            transition={{ duration: 1.8, delay: d, repeat: 1, ease: "easeOut" }}
          />
        ))}

      {/* Engranaje */}
      <div className="relative grid h-24 w-24 place-items-center">
        <motion.div
          aria-hidden
          className="absolute inset-0 rounded-full"
          animate={{ background: step >= 2 ? "rgba(16,185,129,0.18)" : "rgba(245,158,11,0.18)" }}
        />
        {step < 2 ? (
          <motion.div
            animate={{ rotate: reduce ? 0 : 540, color: step >= 1 ? "#FFD60A" : "#F59E0B" }}
            transition={{ rotate: { duration: 1.9, ease: [0.5, 0, 0.2, 1] }, color: { duration: 0.4 } }}
          >
            <Cog className="h-14 w-14" strokeWidth={1.6} aria-hidden />
          </motion.div>
        ) : (
          <motion.div
            initial={{ scale: 0.3, rotate: -90, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 14 }}
            className="text-st-ready"
          >
            <CircleCheck className="h-16 w-16" strokeWidth={1.8} aria-hidden />
          </motion.div>
        )}
      </div>

      {/* Transición de estado */}
      <div className="flex w-full max-w-sm items-center gap-2">
        <motion.div animate={{ opacity: step >= 1 ? 0.35 : 1, scale: step >= 1 ? 0.92 : 1 }} className="origin-right">
          <StatusBadge status="esperando_repuesto" useAlt size="sm" />
        </motion.div>
        <div className="relative h-0.5 flex-1 overflow-hidden rounded-full bg-white/15">
          <motion.span
            className="absolute inset-0 origin-left bg-gradient-to-r from-amber to-racing"
            initial={{ scaleX: reduce ? 1 : 0 }}
            animate={{ scaleX: step >= 1 || reduce ? 1 : 0.15 }}
            transition={{ duration: 0.9, ease: "easeInOut" }}
          />
        </div>
        <motion.div
          initial={{ opacity: 0.3, scale: 0.92 }}
          animate={{ opacity: step >= 1 ? 1 : 0.3, scale: step >= 1 ? 1.04 : 0.92 }}
          className="origin-left"
        >
          <StatusBadge status="reparacion" size="sm" />
        </motion.div>
      </div>

      <div className="min-h-[3.5rem]">
        {step >= 2 ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <p className="font-title text-titanium text-xl">Reparación reanudada</p>
            <p className="mt-1 text-sm text-ink-muted">
              {mode === "client"
                ? `${mechanicFirstName} te espera con el repuesto en el taller.`
                : `Chambi Motors compra el repuesto. ${mechanicFirstName} retoma el trabajo.`}
            </p>
          </motion.div>
        ) : (
          <p className="font-mono text-xs tracking-widest text-ink-muted">ACTUALIZANDO ESTADO…</p>
        )}
      </div>
    </motion.div>
  );
}
