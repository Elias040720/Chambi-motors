"use client";

import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Eye, PhoneOff, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { registerGsap } from "@/lib/gsap";

interface CounterProps {
  from: number;
  to: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

/** Contador animado con GSAP al entrar en vista (valor final si hay reduced‑motion). */
function Counter({ from, to, prefix = "", suffix = "", className }: CounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || reduce) return;
    const { gsap, ScrollTrigger } = registerGsap();
    const state = { v: from };
    const render = () => {
      el.textContent = `${prefix}${Math.round(state.v)}${suffix}`;
    };
    render();
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: el,
        start: "top 88%",
        once: true,
        onEnter: () =>
          gsap.to(state, {
            v: to,
            duration: 2.2,
            ease: "power3.out",
            onUpdate: render,
          }),
      });
    }, el);
    return () => ctx.revert();
  }, [from, to, prefix, suffix, reduce]);

  return (
    <span ref={ref} className={className} aria-label={`${prefix}${to}${suffix}`}>
      {prefix}
      {to}
      {suffix}
    </span>
  );
}

interface Stat {
  icon: LucideIcon;
  counter: CounterProps;
  title: string;
  text: string;
  /** Versión de una línea para móvil */
  short: string;
}

const STATS: Stat[] = [
  {
    icon: PhoneOff,
    counter: { from: 36, to: 0 },
    title: "llamadas innecesarias",
    text: "El estado de tu vehículo llega solo. Nadie tiene que preguntar “¿ya está?”.",
    short: "Tu estado llega solo.",
  },
  {
    icon: Eye,
    counter: { from: 0, to: 100, suffix: "%" },
    title: "transparencia en repuestos",
    text: "Cada pieza con foto, precio y decisión tuya. Sin cargos sorpresa.",
    short: "Cada pieza con foto y precio.",
  },
  {
    icon: Zap,
    counter: { from: 14, to: 2, prefix: "< ", suffix: " s" },
    title: "en actualizarse",
    text: "Lo que el mecánico toca en el taller aparece en tu celular casi al instante.",
    short: "Del taller a tu celular.",
  },
];

export function StatsSection() {
  const reduce = useReducedMotion();
  return (
    <section
      id="confianza"
      aria-labelledby="stats-title"
      className="relative isolate overflow-clip bg-carbon py-24 sm:py-28 max-md:z-10 max-md:w-full max-md:max-w-full max-md:bg-obsidian max-md:pb-20"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-racing/50 to-transparent" />
        <div className="absolute left-1/2 top-1/2 h-[400px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber/[0.05] blur-[120px]" />
      </div>
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          align="center"
          id="stats-title"
          chapter="05"
          eyebrow="Confianza"
          title={
            <>
              Números que <span className="text-racing">se sienten</span>
            </>
          }
        />
        <div className="mt-12 grid gap-5 md:grid-cols-3 max-md:mt-8 max-md:grid-cols-[minmax(0,1fr)] max-md:gap-3">
          {STATS.map((s, i) => (
            <motion.article
              key={s.title}
              initial={reduce ? false : { opacity: 0, y: 36 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: i * 0.12, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="brushed-dark racing-border m-surface group relative overflow-hidden rounded-3xl p-7 transition-transform duration-500 hover:-translate-y-1.5 max-md:bg-zinc-900/80 max-md:p-6"
            >
              <span
                aria-hidden
                className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-racing/10 blur-3xl transition-opacity duration-500 group-hover:opacity-100 sm:opacity-60"
              />
              <s.icon className="h-7 w-7 text-racing" aria-hidden />
              <p className="font-title mt-5 text-6xl leading-none tabular-nums sm:text-7xl">
                <Counter {...s.counter} className="text-racing" />
              </p>
              <h3 className="font-label mt-3 text-sm text-titanium-200 max-md:mt-2 max-md:text-lg max-md:font-bold max-md:normal-case max-md:tracking-normal max-md:text-white">{s.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-muted max-md:mt-1 max-md:text-base max-md:text-zinc-400">
                <span className="max-md:hidden">{s.text}</span>
                <span className="md:hidden">{s.short}</span>
              </p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
