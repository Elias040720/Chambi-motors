"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  Camera,
  CircleCheck,
  Flag,
  MapPin,
  Package,
  TriangleAlert,
  Wrench,
} from "lucide-react";
import Image from "next/image";
import { SEED_VEHICLES } from "@/lib/data";
import { formatPEN } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { TimelineStage } from "@/lib/types";

const V = SEED_VEHICLES[0]!;

const Row = ({ ok, children }: { ok: boolean; children: string }) => (
  <li className="flex items-center gap-2 text-[11.5px]">
    {ok ? (
      <CircleCheck className="h-4 w-4 shrink-0 text-st-ready" aria-hidden />
    ) : (
      <TriangleAlert className="h-4 w-4 shrink-0 text-amber" aria-hidden />
    )}
    <span className={ok ? "text-ink-muted" : "font-semibold text-ink"}>{children}</span>
  </li>
);

const stagger = {
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.12 } },
};
const rise = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

function Reception() {
  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="flex h-full flex-col gap-2.5 px-4">
      <motion.div variants={rise} className="flex items-center justify-between">
        <h4 className="text-[13px] font-bold text-ink">Recepción e inspección</h4>
        <StatusBadge status="diagnostico" size="sm" />
      </motion.div>
      <motion.div variants={rise} className="grid grid-cols-2 gap-1.5">
        {V.photos.map((p) => (
          <div
            key={p.id}
            role="img"
            aria-label={p.caption}
            className="relative h-[74px] overflow-hidden rounded-lg border border-white/10 bg-graphite"
            style={{
              backgroundImage: `url(${p.src})`,
              backgroundSize: `${p.zoom * 100}%`,
              backgroundPosition: p.focus,
            }}
          >
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-1.5 pb-1 pt-4 text-[9px] font-semibold text-ink">
              {p.caption}
            </span>
            <Camera className="absolute right-1 top-1 h-3 w-3 text-white/70" aria-hidden />
          </div>
        ))}
      </motion.div>
      <motion.ul variants={rise} className="space-y-1.5 rounded-xl border border-white/10 bg-white/[0.04] p-2.5">
        <Row ok>Nivel de aceite y refrigerante</Row>
        <Row ok>Luces, frenos y llantas</Row>
        <Row ok={false}>Embrague patina en 3.ª y 4.ª</Row>
      </motion.ul>
      <motion.p variants={rise} className="rounded-xl bg-white/[0.05] p-2.5 text-[11px] leading-snug text-ink-muted">
        <b className="text-ink">Henry:</b> “Recibí la combi con 214 880 km. Ya tomé las fotos y empiezo el
        diagnóstico.”
      </motion.p>
    </motion.div>
  );
}

function Parts() {
  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="flex h-full flex-col gap-2.5 px-4">
      <motion.div variants={rise} className="flex items-center gap-2 rounded-xl border border-amber/50 bg-amber/10 px-3 py-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-amber" />
          <span className="relative h-2.5 w-2.5 rounded-full bg-amber" />
        </span>
        <p className="text-[11.5px] font-bold text-amber">Falta un repuesto · Acción requerida</p>
      </motion.div>
      <motion.div variants={rise} className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.04]">
        <div className="relative h-[110px]">
          <Image src="/images/parts/clutch.jpg" alt="Kit de embrague" fill sizes="260px" className="object-cover" />
          <span className="absolute left-2 top-2 rounded-md bg-red-500/90 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-white">
            Urgencia alta
          </span>
        </div>
        <div className="p-2.5">
          <p className="text-[12.5px] font-bold leading-tight text-ink">Kit de Embrague · 3 piezas</p>
          <p className="mt-1 text-[10.5px] text-ink-muted">“Disco al ras y plato con fisuras.”</p>
        </div>
      </motion.div>
      <motion.button variants={rise} type="button" tabIndex={-1} className="btn-racing rounded-xl py-2.5 text-[12px] font-extrabold">
        Autorizo a Chambi a comprarlo
      </motion.button>
      <motion.button variants={rise} type="button" tabIndex={-1} className="btn-metal rounded-xl py-2.5 text-[12px] font-bold text-ink">
        Yo lo compro y lo llevo
      </motion.button>
    </motion.div>
  );
}

function Repair() {
  const reduce = useReducedMotion();
  const R = 46;
  const C = 2 * Math.PI * R;
  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="flex h-full flex-col items-center gap-3 px-4">
      <motion.div variants={rise} className="flex w-full items-center justify-between">
        <h4 className="text-[13px] font-bold text-ink">Reparación en curso</h4>
        <StatusBadge status="reparacion" size="sm" />
      </motion.div>
      <motion.div variants={rise} className="relative grid h-[140px] w-[140px] place-items-center">
        <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90">
          <circle cx="60" cy="60" r={R} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="9" />
          <motion.circle
            cx="60"
            cy="60"
            r={R}
            fill="none"
            stroke="#FFD60A"
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={C}
            initial={{ strokeDashoffset: reduce ? C * 0.38 : C }}
            animate={{ strokeDashoffset: C * 0.38 }}
            transition={{ duration: 1.3, ease: "easeOut", delay: 0.2 }}
            style={{ filter: "drop-shadow(0 0 6px rgba(255,214,10,0.7))" }}
          />
        </svg>
        <div className="text-center">
          <p className="font-mono text-3xl font-bold text-racing">62%</p>
          <p className="text-[9px] uppercase tracking-widest text-ink-dim">avance</p>
        </div>
      </motion.div>
      <motion.div variants={rise} className="flex w-full items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] p-2.5">
        <span className="font-title grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-racing to-amber-deep text-xs text-obsidian">
          HC
        </span>
        <div className="leading-tight">
          <p className="text-[12px] font-bold text-ink">Henry Chambi</p>
          <p className="text-[10px] text-ink-muted">Mecánico asignado · Transmisión</p>
        </div>
        <Wrench className="ml-auto h-4 w-4 animate-pulse text-racing" aria-hidden />
      </motion.div>
      <motion.ul variants={rise} className="w-full space-y-1.5 text-[11px]">
        <Row ok>Caja desmontada</Row>
        <Row ok>Disco y plato instalados</Row>
        <li className="flex items-center gap-2 text-ink">
          <Wrench className="h-4 w-4 shrink-0 text-racing" aria-hidden />
          <span className="font-semibold">Ajuste y sangrado del embrague</span>
        </li>
      </motion.ul>
    </motion.div>
  );
}

function Quality() {
  const reduce = useReducedMotion();
  const checks = ["Frenos y dirección", "Embrague y cambios", "Ruidos en ruta (8,4 km)", "Fugas y niveles"];
  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="flex h-full flex-col gap-2.5 px-4">
      <motion.div variants={rise} className="flex items-center justify-between">
        <h4 className="text-[13px] font-bold text-ink">Control de calidad</h4>
        <span className="font-mono text-[11px] font-bold text-st-ready">18 / 18</span>
      </motion.div>
      <motion.div variants={rise} className="relative h-[120px] overflow-hidden rounded-xl border border-white/10 bg-[#0c1117]">
        <svg viewBox="0 0 240 120" className="absolute inset-0 h-full w-full">
          <g stroke="rgba(148,163,184,0.12)" strokeWidth="1">
            {Array.from({ length: 8 }).map((_, i) => (
              <path key={i} d={`M${i * 34} 0 V120`} />
            ))}
            {Array.from({ length: 5 }).map((_, i) => (
              <path key={i} d={`M0 ${i * 30} H240`} />
            ))}
          </g>
          <motion.path
            d="M20 92 C 50 90, 54 40, 88 46 S 130 96, 160 70 S 196 30, 220 36"
            fill="none"
            stroke="#FFD60A"
            strokeWidth="3"
            strokeLinecap="round"
            style={{ filter: "drop-shadow(0 0 5px rgba(255,214,10,.8))" }}
            initial={{ pathLength: reduce ? 1 : 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.6, ease: "easeInOut", delay: 0.2 }}
          />
          <circle cx="20" cy="92" r="4" fill="#38BDF8" />
        </svg>
        <span className="absolute right-2 top-2 flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[9px] font-bold text-st-ready">
          <Flag className="h-3 w-3" aria-hidden /> Ruta completada
        </span>
        <span className="absolute bottom-2 left-2 flex items-center gap-1 text-[9px] text-ink-muted">
          <MapPin className="h-3 w-3" aria-hidden /> 8,4 km · 22 min
        </span>
      </motion.div>
      <ul className="space-y-1.5 rounded-xl border border-white/10 bg-white/[0.04] p-2.5">
        {checks.map((c, i) => (
          <motion.li
            key={c}
            variants={rise}
            transition={{ delay: reduce ? 0 : 0.5 + i * 0.18 }}
            className="flex items-center gap-2 text-[11.5px] text-ink-muted"
          >
            <CircleCheck className="h-4 w-4 shrink-0 text-st-ready" aria-hidden />
            {c}
          </motion.li>
        ))}
      </ul>
    </motion.div>
  );
}

function Ready() {
  const lines = [
    { l: "Kit de embrague (aprobado)", a: 540 },
    { l: "Mano de obra", a: 380 },
    { l: "Aceite de caja", a: 60 },
  ];
  const total = lines.reduce((s, x) => s + x.a, 0);
  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="flex h-full flex-col items-center gap-2.5 px-4">
      <motion.div
        variants={rise}
        className="relative grid h-[84px] w-[84px] place-items-center rounded-full bg-st-ready/15 ring-1 ring-st-ready/50"
      >
        <span className="absolute inset-0 animate-pulse-ring rounded-full bg-st-ready/30" />
        <CircleCheck className="relative h-11 w-11 text-st-ready" aria-hidden />
      </motion.div>
      <motion.div variants={rise} className="text-center">
        <p className="font-title text-titanium text-lg">¡Tu combi está lista!</p>
        <p className="text-[11px] text-ink-muted">Recógela hoy hasta las 6:00 p. m.</p>
      </motion.div>
      <motion.ul variants={rise} className="w-full space-y-1.5 rounded-xl border border-white/10 bg-white/[0.04] p-2.5">
        {lines.map((x) => (
          <li key={x.l} className="flex items-center justify-between text-[11px] text-ink-muted">
            <span>{x.l}</span>
            <span className="font-mono text-ink">{formatPEN(x.a)}</span>
          </li>
        ))}
        <li className="flex items-center justify-between border-t border-white/10 pt-1.5 text-[12px] font-bold text-ink">
          <span>Total</span>
          <span className="font-mono text-racing">{formatPEN(total)}</span>
        </li>
      </motion.ul>
      <motion.button variants={rise} type="button" tabIndex={-1} className="btn-racing flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[12px] font-extrabold">
        <Package className="h-4 w-4" aria-hidden /> Ver resumen completo
      </motion.button>
    </motion.div>
  );
}

const SCREENS = [Reception, Parts, Repair, Quality, Ready] as const;

export function StageScreen({ stage, direction }: { stage: TimelineStage; direction: 1 | -1 }) {
  const Screen = SCREENS[stage.index] ?? Reception;
  return (
    <motion.div
      key={stage.id}
      initial={{ opacity: 0, x: 28 * direction }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -28 * direction }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="absolute inset-0"
    >
      <Screen />
    </motion.div>
  );
}
