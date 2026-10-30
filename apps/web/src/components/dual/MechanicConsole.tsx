"use client";

import { motion } from "framer-motion";
import {
  CircleCheck,
  ClipboardCheck,
  Flag,
  Lock,
  PackagePlus,
  Wrench,
  Wifi,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { CSSProperties } from "react";
import { cx } from "@/lib/utils";
import { STATUS_META } from "@/lib/status";
import { pendingPart, useWorkshop } from "@/store/workshop";
import type { VehicleStatus } from "@/lib/types";

interface BigButton {
  id: string;
  label: string;
  hint: string;
  icon: LucideIcon;
  color: string;
  /** Estado al que corresponde (para marcar el actual) */
  status: VehicleStatus;
  blockedByPart?: boolean;
}

const BUTTONS: BigButton[] = [
  { id: "review", label: "Iniciar Revisión", hint: "Empezar diagnóstico", icon: ClipboardCheck, color: "#38BDF8", status: "diagnostico" },
  { id: "part", label: "Pedir Repuesto", hint: "1 toque", icon: PackagePlus, color: "#F59E0B", status: "esperando_repuesto" },
  { id: "repair", label: "En Reparación", hint: "Estoy trabajando", icon: Wrench, color: "#FFD60A", status: "reparacion", blockedByPart: true },
  { id: "done", label: "¡Auto Listo!", hint: "Avisar al cliente", icon: Flag, color: "#10B981", status: "listo", blockedByPart: true },
];

/** Panel del mecánico: botones gigantes, alto contraste, cero texto que escribir. */
export function MechanicConsole() {
  const { active, startReview, requestPart, startRepair, finish } = useWorkshop();
  const blocked = !!pendingPart(active);
  const meta = STATUS_META[active.status];

  const actions: Record<string, () => void> = {
    review: startReview,
    part: requestPart,
    repair: startRepair,
    done: finish,
  };

  return (
    <div className="flex h-full flex-col bg-obsidian">
      {/* Franja de seguridad industrial */}
      <div
        aria-hidden
        className="h-2.5 shrink-0"
        style={{
          background:
            "repeating-linear-gradient(-45deg, #FFD60A 0 12px, #0B0C0E 12px 24px)",
        }}
      />
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="leading-tight">
          <p className="font-label text-[10px] text-ink-dim">Panel del taller</p>
          <p className="text-sm font-bold text-ink">{active.mechanic.name}</p>
        </div>
        <div className="text-right leading-tight">
          <p className="font-mono text-base font-bold tracking-widest text-racing">{active.plate}</p>
          <p className="text-[11px] text-ink-muted">{active.model}</p>
        </div>
      </div>

      <div
        className="mx-4 mb-3 flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold"
        style={{ borderColor: `${meta.color}55`, background: `${meta.color}14`, color: meta.color } as CSSProperties}
      >
        <span className="h-2 w-2 rounded-full" style={{ background: meta.color }} />
        Estado actual: {active.status === "esperando_repuesto" ? meta.alt : meta.label}
      </div>

      <div className="grid flex-1 grid-cols-2 gap-3 px-4 pb-3 max-md:gap-4 max-md:px-5 max-md:pb-5">
        {BUTTONS.map((b) => {
          const current = active.status === b.status;
          const disabled = !!b.blockedByPart && blocked;
          const Icon = b.icon;
          return (
            <motion.button
              key={b.id}
              type="button"
              id={`mech-btn-${b.id}`}
              onClick={actions[b.id]}
              disabled={disabled}
              whileTap={disabled ? undefined : { scale: 0.95 }}
              whileHover={disabled ? undefined : { y: -2 }}
              aria-pressed={current}
              className={cx(
                "relative flex min-h-[112px] flex-col items-start justify-between overflow-hidden rounded-2xl p-3.5 text-left text-obsidian transition-[filter,box-shadow] duration-300 max-md:min-h-[132px] max-md:rounded-3xl max-md:p-4",
                disabled ? "cursor-not-allowed opacity-35 saturate-50" : "hover:brightness-110",
                current && "ring-4 ring-white ring-offset-2 ring-offset-obsidian",
              )}
              style={{
                background: `linear-gradient(150deg, ${b.color}, color-mix(in srgb, ${b.color} 72%, #000))`,
                boxShadow: current ? `0 0 34px -4px ${b.color}` : `0 12px 28px -14px ${b.color}`,
              }}
            >
              <span className="flex w-full items-start justify-between">
                <Icon className="h-9 w-9 max-md:h-11 max-md:w-11" strokeWidth={2.3} aria-hidden />
                {disabled ? (
                  <Lock className="h-4 w-4" aria-hidden />
                ) : current ? (
                  <span className="flex items-center gap-1 rounded-md bg-obsidian px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-white">
                    <CircleCheck className="h-3 w-3" aria-hidden /> Actual
                  </span>
                ) : null}
              </span>
              <span>
                <span className="font-title block text-[15px] leading-tight sm:text-base max-md:text-base">{b.label}</span>
                <span className="mt-0.5 block text-[11px] font-bold opacity-80 max-md:text-xs">{b.hint}</span>
              </span>
            </motion.button>
          );
        })}
      </div>

      <div className="mx-4 mb-4 min-h-[2.5rem] text-[11px] leading-snug text-ink-muted max-md:mx-5 max-md:text-sm">
        {blocked ? (
          <p className="flex items-start gap-2 text-amber">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            Esperando que el cliente decida el repuesto. Se reanuda automáticamente.
          </p>
        ) : (
          <p className="flex items-center gap-2">
            <Wifi className="h-3.5 w-3.5 text-st-ready" aria-hidden />
            Conectado · cada toque llega al cliente en menos de 2 s.
          </p>
        )}
      </div>
    </div>
  );
}
