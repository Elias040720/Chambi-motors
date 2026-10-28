"use client";

import { motion, useReducedMotion } from "framer-motion";
import { BellRing, Hammer, MousePointerClick } from "lucide-react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { VehicleSwitcher } from "@/components/shared/VehicleSwitcher";
import { PartRequestCard } from "./PartRequestCard";

const STEPS = [
  {
    icon: Hammer,
    title: "El mecánico toca “Pedir repuesto”",
    text: "Una sola pulsación, con foto y nota de voz si hace falta. Sin escribir.",
  },
  {
    icon: BellRing,
    title: "Tu celular lo recibe al instante",
    text: "Ves qué pieza es, por qué se necesita y qué tan urgente es.",
  },
  {
    icon: MousePointerClick,
    title: "Decides en un toque",
    text: "Lo compras tú o autorizas a Chambi con cotización clara. El trabajo no se detiene.",
  },
];

export function PartsSection() {
  const reduce = useReducedMotion();
  return (
    <section
      id="repuestos"
      aria-labelledby="parts-title"
      className="relative isolate overflow-clip bg-carbon py-24 sm:py-32 max-md:z-10 max-md:w-full max-md:max-w-full max-md:bg-obsidian max-md:pb-16"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-40 top-1/3 h-[480px] w-[480px] rounded-full bg-amber/[0.07] blur-[120px]" />
        <div className="absolute -right-32 bottom-10 h-[420px] w-[420px] rounded-full bg-racing/[0.05] blur-[120px]" />
        <div className="grid-bg absolute inset-0 opacity-50" />
      </div>

      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-start lg:gap-14 max-md:grid-cols-[minmax(0,1fr)] max-md:gap-8">
          <div className="lg:sticky lg:top-28">
            <SectionHeading
              id="parts-title"
              chapter="03"
              eyebrow="Módulo estrella"
              title={
                <>
                  Alerta y gestión <span className="text-racing">inteligente</span> de repuestos
                </>
              }
              lead={
                <>
                  <span className="max-md:hidden">
                    El momento más lento de cualquier taller es cuando falta una pieza. Aquí es una decisión de 5
                    segundos. Pruébalo tú mismo.
                  </span>
                  <span className="md:hidden">Si falta una pieza, decides en 5 segundos.</span>
                </>
              }
            />

            <ol className="mt-8 space-y-4 max-md:hidden">
              {STEPS.map((s, i) => (
                <motion.li
                  key={s.title}
                  initial={reduce ? false : { opacity: 0, x: -22 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ delay: i * 0.12, duration: 0.6 }}
                  className="flex gap-4"
                >
                  <span className="brushed-dark relative grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-white/10 text-racing">
                    <s.icon className="h-5 w-5" aria-hidden />
                    <span className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-racing font-mono text-[10px] font-bold text-obsidian">
                      {i + 1}
                    </span>
                  </span>
                  <div>
                    <p className="text-[15px] font-bold text-ink">{s.title}</p>
                    <p className="mt-0.5 text-sm text-ink-muted">{s.text}</p>
                  </div>
                </motion.li>
              ))}
            </ol>
          </div>

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-4"
          >
            <VehicleSwitcher id="parts-vehicle" />
            <PartRequestCard />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
