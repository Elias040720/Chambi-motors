"use client";

import { useEffect } from "react";
import {
  animate,
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import { BellRing, CircleCheck, Gauge } from "lucide-react";
import { Logo } from "@/components/ui/Logo";

/**
 * Emblema con iluminación metálica reactiva:
 *  - Escritorio: sigue el cursor (tilt 3D + brillo especular).
 *  - Móvil: usa el giroscopio si está disponible; si no, un balanceo suave.
 *  - prefers-reduced-motion: estático.
 */
export function LogoStage() {
  const reduce = useReducedMotion();
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const sx = useSpring(px, { stiffness: 110, damping: 16, mass: 0.6 });
  const sy = useSpring(py, { stiffness: 110, damping: 16, mass: 0.6 });

  const rotateY = useTransform(sx, [0, 1], [-15, 15]);
  const rotateX = useTransform(sy, [0, 1], [12, -12]);
  const gx = useTransform(sx, [0, 1], [0, 100]);
  const gy = useTransform(sy, [0, 1], [0, 100]);

  const sheen = useMotionTemplate`radial-gradient(circle at ${gx}% ${gy}%, rgba(255,255,255,0.6), rgba(255,255,255,0) 40%)`;
  const halo = useMotionTemplate`radial-gradient(circle at ${gx}% ${gy}%, rgba(255,214,10,0.28), rgba(245,158,11,0.08) 38%, transparent 62%)`;

  useEffect(() => {
    if (reduce) return;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const cleanups: Array<() => void> = [];

    if (!coarse) {
      const onMove = (e: PointerEvent) => {
        px.set(e.clientX / window.innerWidth);
        py.set(e.clientY / window.innerHeight);
      };
      window.addEventListener("pointermove", onMove, { passive: true });
      cleanups.push(() => window.removeEventListener("pointermove", onMove));
    } else {
      let gotOrientation = false;
      const onOrient = (e: DeviceOrientationEvent) => {
        if (e.gamma == null || e.beta == null) return;
        gotOrientation = true;
        px.set(Math.min(1, Math.max(0, 0.5 + e.gamma / 70)));
        py.set(Math.min(1, Math.max(0, 0.5 + (e.beta - 50) / 70)));
      };
      window.addEventListener("deviceorientation", onOrient, { passive: true });
      cleanups.push(() => window.removeEventListener("deviceorientation", onOrient));

      const fallback = window.setTimeout(() => {
        if (gotOrientation) return;
        const a = animate(px, [0.2, 0.8, 0.2], { duration: 9, repeat: Infinity, ease: "easeInOut" });
        const b = animate(py, [0.35, 0.65, 0.35], { duration: 7, repeat: Infinity, ease: "easeInOut" });
        cleanups.push(() => {
          a.stop();
          b.stop();
        });
      }, 1200);
      cleanups.push(() => window.clearTimeout(fallback));
    }
    return () => cleanups.forEach((fn) => fn());
  }, [reduce, px, py]);

  return (
    <div
      className="relative mx-auto w-full max-w-[300px] sm:max-w-[460px] lg:max-w-[560px]"
      style={{ perspective: 1100 }}
    >
      {/* Halo reactivo */}
      <motion.div
        aria-hidden
        className="absolute -inset-[18%] rounded-full blur-2xl"
        style={{ background: halo }}
      />

      {/* Anillos tipo tablero */}
      <div aria-hidden className="pointer-events-none absolute inset-[-10%] grid place-items-center">
        <svg viewBox="0 0 400 400" className="h-full w-full animate-spin-slow opacity-80">
          <defs>
            <linearGradient id="ring-racing" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#FFD60A" />
              <stop offset="0.6" stopColor="#F59E0B" />
              <stop offset="1" stopColor="#D97706" stopOpacity="0" />
            </linearGradient>
          </defs>
          <circle cx="200" cy="200" r="188" fill="none" stroke="rgba(148,163,184,0.22)" strokeWidth="1" strokeDasharray="2 9" />
          <path d="M200 12 A188 188 0 0 1 388 200" fill="none" stroke="url(#ring-racing)" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
        <svg viewBox="0 0 400 400" className="absolute h-[88%] w-[88%] animate-spin-slower opacity-70">
          <circle cx="200" cy="200" r="190" fill="none" stroke="rgba(148,163,184,0.35)" strokeWidth="6" strokeDasharray="1 11.4" />
          <path d="M20 200 A180 180 0 0 1 200 20" fill="none" stroke="rgba(226,232,240,0.55)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>

      <motion.div
        style={reduce ? undefined : { rotateX, rotateY, transformStyle: "preserve-3d" }}
        className="relative"
      >
        <div className="animate-float relative">
          <Logo variant="emblem" priority sizes="(min-width:1024px) 560px, 80vw" className="relative w-full" />
          <motion.div
            aria-hidden
            className="logo-fade pointer-events-none absolute inset-0 mix-blend-overlay"
            style={{ background: sheen }}
          />
        </div>

        {/* HUD flotante con profundidad */}
        <div
          className="glass absolute -left-1 top-[6%] hidden items-center gap-2.5 rounded-xl px-3 py-2 sm:flex"
          style={{ transform: "translateZ(70px)" }}
        >
          <Gauge className="h-4 w-4 text-racing" aria-hidden />
          <div className="leading-tight">
            <p className="font-mono text-[11px] font-semibold text-ink">OT-2481 · 62%</p>
            <p className="text-[10px] text-ink-muted">Reparación activa</p>
          </div>
        </div>
        <div
          className="glass absolute -right-2 top-[44%] hidden items-center gap-2.5 rounded-xl px-3 py-2 sm:flex"
          style={{ transform: "translateZ(90px)" }}
        >
          <BellRing className="h-4 w-4 text-amber" aria-hidden />
          <div className="leading-tight">
            <p className="text-[11px] font-semibold text-ink">Aviso enviado</p>
            <p className="font-mono text-[10px] text-ink-muted">en 0,8 s</p>
          </div>
        </div>
        <div
          className="glass absolute bottom-[4%] left-[8%] hidden items-center gap-2.5 rounded-xl px-3 py-2 sm:flex"
          style={{ transform: "translateZ(55px)" }}
        >
          <CircleCheck className="h-4 w-4 text-st-ready" aria-hidden />
          <p className="text-[11px] font-semibold text-ink">Repuesto aprobado</p>
        </div>
      </motion.div>
    </div>
  );
}
