"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { BellRing, Camera, CircleCheck, Flag, TriangleAlert } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SEED_VEHICLES } from "@/lib/data";
import type { TimelineStage } from "@/lib/types";

const V = SEED_VEHICLES[0]!;

/** Copy corto (1 frase) para móvil: máximo 2 líneas bajo la tarjeta. */
export const MOBILE_STAGE_COPY = [
  "Fotos y diagnóstico inicial, al instante.",
  "Si falta una pieza, decides en un toque.",
  "Avance en vivo y mecánico asignado.",
  "Prueba de ruta y control punto por punto.",
  "Aviso automático y resumen sin letra chica.",
] as const;

function PhotoVisual({ src, chip, alert }: { src: string; chip: string; alert?: boolean }) {
  return (
    <div className="relative min-h-[96px] flex-1 overflow-hidden rounded-2xl border border-white/10 bg-zinc-950">
      <Image src={src} alt="" fill sizes="(max-width: 767px) 100vw, 420px" className="object-cover" />
      <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
      <span className="absolute bottom-3 left-3 flex items-center gap-2 rounded-xl bg-black/65 px-3 py-1.5 text-sm font-bold text-white backdrop-blur">
        {alert ? (
          <TriangleAlert className="h-4 w-4 text-amber-400" aria-hidden />
        ) : (
          <Camera className="h-4 w-4 text-amber-400" aria-hidden />
        )}
        {chip}
      </span>
    </div>
  );
}

function BigStat({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="flex min-h-[96px] flex-1 flex-col items-center justify-center gap-1 rounded-2xl border border-white/10 bg-white/[0.04] text-center">
      {children}
      <p className="text-sm font-semibold text-zinc-400">{label}</p>
    </div>
  );
}

function Visual({ stage }: { stage: TimelineStage }) {
  switch (stage.index) {
    case 0:
      return <PhotoVisual src="/images/vehicles/hiace.jpg" chip="12 fotos de ingreso" />;
    case 1:
      return <PhotoVisual src="/images/parts/clutch.jpg" chip="Urgencia alta" alert />;
    case 2:
      return (
        <div className="flex min-h-[96px] flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-5">
          <p className="text-6xl font-black leading-none tabular-nums text-amber-400">62%</p>
          <div className="h-3 w-full overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-[62%] rounded-full bg-gradient-to-r from-racing to-amber" />
          </div>
          <p className="text-sm font-semibold text-zinc-400">{V.mechanic.name} · mecánico asignado</p>
        </div>
      );
    case 3:
      return (
        <BigStat label="Puntos verificados">
          <CircleCheck className="h-10 w-10 text-st-ready" aria-hidden />
          <p className="text-5xl font-black leading-none tabular-nums text-white">18/18</p>
        </BigStat>
      );
    default:
      return (
        <BigStat label="Llamadas hechas">
          <Flag className="h-10 w-10 text-st-ready" aria-hidden />
          <p className="text-5xl font-black leading-none tabular-nums text-white">0</p>
        </BigStat>
      );
  }
}

/**
 * Tarjeta única a ancho completo (solo móvil < 768px). Se transforma en cada
 * etapa del scroll: sin carcasa de teléfono, tipografía a escala real.
 */
export function MobileStageCard({ stage }: { stage: TimelineStage }) {
  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/90 p-5 backdrop-blur-xl">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={stage.id}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="flex h-full min-h-0 flex-col gap-4"
        >
          <div className="flex items-center justify-between gap-3">
            <StatusBadge status={stage.status} useAlt size="md" />
            <span className="font-mono text-sm text-zinc-500">{stage.notification.time}</span>
          </div>

          <Visual stage={stage} />

          <div className="shrink-0">
            <p className="flex items-start gap-2 text-2xl font-bold leading-tight text-white">
              <BellRing className="mt-1 h-5 w-5 shrink-0 text-amber-400" aria-hidden />
              {stage.notification.title}
            </p>
            <p className="mt-1.5 line-clamp-2 text-base leading-relaxed text-zinc-400">
              {stage.notification.body}
            </p>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
