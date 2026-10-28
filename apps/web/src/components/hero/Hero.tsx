"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform, type Variants } from "framer-motion";
import { ChevronsDown } from "lucide-react";
import { LogoStage } from "./LogoStage";
import { PlateSearch } from "./PlateSearch";
import { SparkField } from "./SparkField";
import { useSmoothScroll } from "@/components/providers/SmoothScrollProvider";

const LINE_1 = ["Tu", "auto", "en", "manos", "expertas."];
const LINE_2: Array<{ w: string; hot?: boolean }> = [
  { w: "Su" },
  { w: "avance" },
  { w: "en" },
  { w: "tu" },
  { w: "pantalla," },
  { w: "sin", hot: true },
  { w: "una", hot: true },
  { w: "sola", hot: true },
  { w: "llamada.", hot: true },
];
const LINE_2_MOBILE: Array<{ w: string; hot?: boolean }> = [
  { w: "Su" },
  { w: "avance" },
  { w: "en", hot: true },
  { w: "vivo.", hot: true },
];

const wordVariants: Variants = {
  hidden: { y: "115%", rotate: 4, opacity: 0 },
  show: (i: number) => ({
    y: "0%",
    rotate: 0,
    opacity: 1,
    transition: { delay: 0.25 + i * 0.07, duration: 0.8, ease: [0.22, 1, 0.36, 1] },
  }),
};

function Word({ children, index, className }: { children: string; index: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <span className="mr-[0.1em] inline-block overflow-hidden pb-[0.14em] pr-[0.12em] -mb-[0.14em] align-bottom">
      <motion.span
        custom={index}
        variants={wordVariants}
        initial={reduce ? "show" : "hidden"}
        animate="show"
        className={`inline-block will-change-transform ${className ?? ""}`}
      >
        {children}
      </motion.span>
    </span>
  );
}

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollTo } = useSmoothScroll();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const stageY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -90]);
  const bgY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 120]);

  return (
    <section
      id="inicio"
      ref={ref}
      aria-labelledby="hero-title"
      className="relative isolate w-full max-w-full overflow-hidden bg-carbon pt-28 pb-20 sm:pt-32 lg:min-h-[100svh] lg:pb-24 max-md:pt-24 max-md:pb-16"
    >
      {/* Capas de fondo */}
      <motion.div aria-hidden style={{ y: bgY }} className="pointer-events-none absolute inset-0 -z-10">
        <div className="grid-bg absolute inset-0" />
        <div className="absolute -right-40 -top-40 h-[620px] w-[620px] rounded-full bg-amber/10 blur-[120px]" />
        <div className="absolute -left-48 bottom-0 h-[520px] w-[520px] rounded-full bg-racing/[0.06] blur-[120px]" />
        {/* Trazos de velocidad */}
        <svg className="absolute inset-0 h-full w-full opacity-[0.16]" preserveAspectRatio="none" viewBox="0 0 1200 800">
          <g stroke="url(#speed)" strokeWidth="1.4" fill="none">
            <path d="M-50 640 L760 120" />
            <path d="M-50 700 L900 130" strokeOpacity=".6" />
            <path d="M300 840 L1250 210" strokeOpacity=".5" />
            <path d="M520 840 L1250 330" strokeOpacity=".35" />
          </g>
          <defs>
            <linearGradient id="speed" x1="0" x2="1">
              <stop offset="0" stopColor="#FFD60A" stopOpacity="0" />
              <stop offset=".5" stopColor="#FFD60A" />
              <stop offset="1" stopColor="#F59E0B" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </motion.div>
      <SparkField className="pointer-events-none absolute inset-0 -z-10 h-full w-full" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-b from-transparent to-carbon" aria-hidden />

      <div className="relative mx-auto grid w-full max-w-7xl items-center gap-10 px-5 sm:px-8 lg:grid-cols-12 lg:gap-6 max-md:grid-cols-[minmax(0,1fr)] max-md:gap-0">
        {/* Visual principal (oculto en móvil: el logo ya vive en el Header) */}
        <motion.div style={{ y: stageY }} className="order-first lg:order-last lg:col-span-5 max-md:hidden">
          <LogoStage />
        </motion.div>

        {/* Texto + widget */}
        <div className="min-w-0 lg:col-span-7">
          <motion.p
            initial={reduce ? false : { opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
            className="font-label mb-5 inline-flex items-center gap-3 text-xs text-amber sm:text-[13px]"
          >
            <span className="font-mono text-racing">01</span>
            <span className="h-px w-10 bg-gradient-to-r from-racing to-transparent" aria-hidden />
            <span className="max-md:hidden">Precisión mecánica, estado en tiempo real</span>
            <span className="md:hidden">Seguimiento en vivo</span>
          </motion.p>

          <h1 id="hero-title" className="font-title text-balance text-ink">
            <span className="block text-[2.15rem] leading-[1.05] sm:text-5xl xl:text-[3.6rem] max-md:text-4xl">
              {LINE_1.map((w, i) => (
                <Word key={w + i} index={i} className="text-titanium">
                  {w}
                </Word>
              ))}
            </span>
            <span className="mt-3 block text-[1.2rem] leading-[1.25] text-ink-muted sm:text-[1.65rem] xl:text-[1.9rem] max-md:hidden">
              {LINE_2.map((x, i) => (
                <Word key={x.w + i} index={LINE_1.length + i} className={x.hot ? "text-racing" : ""}>
                  {x.w}
                </Word>
              ))}
            </span>
            <span className="mt-2 block text-3xl leading-tight text-ink-muted md:hidden">
              {LINE_2_MOBILE.map((x, i) => (
                <Word key={x.w + i} index={LINE_1.length + i} className={x.hot ? "text-racing" : ""}>
                  {x.w}
                </Word>
              ))}
            </span>
          </h1>

          <motion.p
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.7 }}
            className="mt-6 max-w-xl text-pretty text-base text-ink-muted sm:text-lg max-md:mt-5 max-md:leading-relaxed max-md:text-zinc-400"
          >
            <span className="max-md:hidden">
              Recibe cada avance, foto y solicitud de repuesto directo en tu celular. Ingresa tu placa y
              mira cómo funciona, en vivo.
            </span>
            <span className="md:hidden">Ingresa tu placa y mira cómo funciona, en vivo.</span>
          </motion.p>

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.35, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="mt-8"
          >
            <PlateSearch />
          </motion.div>
        </div>
      </div>

      <motion.button
        type="button"
        id="hero-scroll-cue"
        onClick={() => scrollTo("#como-funciona")}
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.2 }}
        className="font-label absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-1 text-[10px] text-ink-dim transition-colors hover:text-racing lg:flex"
        aria-label="Desliza para ver cómo funciona"
      >
        Desliza
        <ChevronsDown className="h-4 w-4 animate-bounce" aria-hidden />
      </motion.button>
    </section>
  );
}
