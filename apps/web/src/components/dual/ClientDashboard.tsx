"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import {
  BellRing,
  CircleCheck,
  Info,
  TriangleAlert,
  Wrench,
  ArrowRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useSmoothScroll } from "@/components/providers/SmoothScrollProvider";
import { STATUS_META } from "@/lib/status";
import { stageIndexOf } from "@/lib/utils";
import { pendingPart, useWorkshop } from "@/store/workshop";
import type { EventTone } from "@/lib/types";

const TONE: Record<EventTone, { icon: LucideIcon; color: string }> = {
  info: { icon: Info, color: "#38BDF8" },
  alert: { icon: TriangleAlert, color: "#F59E0B" },
  progress: { icon: Wrench, color: "#FFD60A" },
  success: { icon: CircleCheck, color: "#10B981" },
};

/** Dashboard limpio del cliente: progreso, fotos y notificaciones en vivo. */
export function ClientDashboard() {
  const { active } = useWorkshop();
  const { scrollTo } = useSmoothScroll();
  const meta = STATUS_META[active.status];
  const part = pendingPart(active);
  const stage = stageIndexOf(active);

  return (
    <div className="flex h-full flex-col gap-3 bg-obsidian p-4 max-md:gap-5 max-md:bg-transparent max-md:p-5">
      <div className="flex items-center gap-3">
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-white/10">
          <Image src={active.photo} alt="" fill sizes="48px" className="object-cover" />
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-sm font-bold text-ink max-md:text-lg">
            {active.make} {active.model}
          </p>
          <p className="font-mono text-[11px] tracking-widest text-ink-muted">
            {active.plate} · {active.orderCode}
          </p>
        </div>
        <BellRing className="h-5 w-5 shrink-0 text-racing" aria-hidden />
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 max-md:rounded-3xl max-md:p-5">
        <div className="flex items-end justify-between">
          <StatusBadge status={active.status} useAlt size="sm" />
          <motion.span
            key={active.progress}
            initial={{ opacity: 0.4, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-mono text-3xl font-bold leading-none tabular-nums max-md:text-6xl max-md:font-black"
            style={{ color: meta.color }}
          >
            {active.progress}
            <span className="text-lg max-md:text-3xl">%</span>
          </motion.span>
        </div>
        <ProgressBar value={active.progress} color={meta.color} className="mt-3 max-md:mt-4" height="h-2 max-md:h-3.5" />
        <div className="mt-3 flex items-center gap-1" aria-label={`Etapa ${stage + 1} de 5`}>
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="h-1 flex-1 rounded-full transition-colors duration-500"
              style={{ background: i <= stage ? meta.color : "rgba(255,255,255,0.12)" }}
            />
          ))}
        </div>
        <p className="mt-2 text-[11px] text-ink-muted max-md:mt-3 max-md:text-sm">
          {active.mechanic.name} · Entrega estimada: <b className="text-ink">{active.eta}</b>
        </p>
      </div>

      <AnimatePresence initial={false}>
        {part && (
          <motion.button
            key="part-banner"
            type="button"
            id="client-part-banner"
            onClick={() => scrollTo("#repuestos")}
            initial={{ opacity: 0, height: 0, marginTop: -12 }}
            animate={{ opacity: 1, height: "auto", marginTop: 0 }}
            exit={{ opacity: 0, height: 0, marginTop: -12 }}
            className="group flex w-full items-center gap-2.5 overflow-hidden rounded-xl border border-amber/55 bg-amber/10 px-3 py-2.5 text-left"
          >
            <TriangleAlert className="h-5 w-5 shrink-0 animate-pulse text-amber" aria-hidden />
            <span className="min-w-0 flex-1 text-[11.5px] leading-tight max-md:text-sm">
              <b className="block text-amber">Repuesto pendiente</b>
              <span className="block truncate text-ink-muted">{part.name.split("(")[0]?.trim()}</span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-amber transition-transform group-hover:translate-x-1" aria-hidden />
          </motion.button>
        )}
      </AnimatePresence>

      <div>
        <p className="font-label mb-1.5 text-[10px] text-ink-dim max-md:mb-3 max-md:text-xs">Historial de fotos</p>
        <div className="grid grid-cols-4 gap-1.5 max-md:-mx-5 max-md:flex max-md:gap-3 max-md:overflow-x-auto max-md:px-5 max-md:pb-1 scrollbar-none">
          {active.photos.map((p) => (
            <div
              key={p.id}
              role="img"
              aria-label={`${p.caption} · ${p.time}`}
              className="relative aspect-square overflow-hidden rounded-lg border border-white/10 bg-graphite max-md:aspect-auto max-md:h-24 max-md:w-32 max-md:shrink-0 max-md:rounded-2xl"
              style={{
                backgroundImage: `url(${p.src})`,
                backgroundSize: `${p.zoom * 100}%`,
                backgroundPosition: p.focus,
              }}
            >
              <span className="absolute inset-x-0 bottom-0 bg-black/70 py-0.5 text-center font-mono text-[8px] text-ink-muted">
                {p.time}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <p className="font-label mb-1.5 text-[10px] text-ink-dim max-md:mb-3 max-md:text-xs">Notificaciones</p>
        <ul className="space-y-1.5">
          <AnimatePresence initial={false} mode="popLayout">
            {active.events.slice(0, 3).map((e, i) => {
              const t = TONE[e.tone];
              return (
                <motion.li
                  key={e.id}
                  layout
                  initial={{ opacity: 0, x: 30, scale: 0.96 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 340, damping: 30 }}
                  className={`flex items-start gap-2.5 rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2 max-md:gap-3 max-md:rounded-2xl max-md:px-4 max-md:py-3 ${i >= 2 ? "max-md:hidden" : ""}`}
                >
                  <t.icon className="mt-0.5 h-4 w-4 shrink-0" style={{ color: t.color }} aria-hidden />
                  <div className="min-w-0 flex-1 leading-tight">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-[12px] font-bold text-ink max-md:text-base">{e.title}</p>
                      <span className="font-mono text-[10px] text-ink-dim">{e.time}</span>
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-[11px] text-ink-muted max-md:line-clamp-2 max-md:text-sm">{e.detail}</p>
                  </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      </div>
    </div>
  );
}
