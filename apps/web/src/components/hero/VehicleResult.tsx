"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight, CalendarClock, ClipboardList, TriangleAlert, UserRound } from "lucide-react";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useSmoothScroll } from "@/components/providers/SmoothScrollProvider";
import { STATUS_META } from "@/lib/status";
import { pendingPart } from "@/store/workshop";
import type { Vehicle } from "@/lib/types";

function Datum({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-ink-dim">
        <Icon className="h-3 w-3" aria-hidden />
        {label}
      </p>
      <p className="mt-1 truncate text-[13px] font-semibold text-ink">{value}</p>
    </div>
  );
}

/** Resultado de la consulta por placa (se mantiene en vivo con el store). */
export function VehicleResult({ vehicle }: { vehicle: Vehicle }) {
  const { scrollTo } = useSmoothScroll();
  const meta = STATUS_META[vehicle.status];
  const part = pendingPart(vehicle);
  const last = vehicle.events[0];

  return (
    <motion.article
      aria-live="polite"
      aria-label={`Estado del vehículo ${vehicle.plate}`}
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="brushed-dark racing-border relative overflow-hidden rounded-2xl p-4 sm:p-5"
    >
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative h-36 w-full shrink-0 overflow-hidden rounded-xl sm:h-auto sm:w-44">
          <Image
            src={vehicle.photo}
            alt={`${vehicle.make} ${vehicle.model} ${vehicle.year}`}
            fill
            sizes="(min-width:640px) 176px, 100vw"
            className="object-cover"
          />
          <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          <span className="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-0.5 font-mono text-xs font-bold tracking-widest text-racing backdrop-blur">
            {vehicle.plate}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="font-title text-xl text-ink sm:text-2xl">
                {vehicle.make} <span className="text-titanium">{vehicle.model}</span>
              </h3>
              <p className="mt-0.5 text-xs text-ink-muted">
                {vehicle.year} · {vehicle.color} · {vehicle.owner}
              </p>
            </div>
            <StatusBadge status={vehicle.status} useAlt size="sm" />
          </div>

          <p className="mt-3 text-[13px] text-ink-muted">{vehicle.service}</p>

          <div className="mt-3 flex items-center gap-3">
            <ProgressBar value={vehicle.progress} color={meta.color} className="flex-1" />
            <span className="w-12 text-right font-mono text-base font-bold tabular-nums" style={{ color: meta.color }}>
              {vehicle.progress}%
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Datum icon={UserRound} label="Mecánico" value={vehicle.mechanic.name} />
        <Datum icon={ClipboardList} label="Orden" value={vehicle.orderCode} />
        <Datum icon={CalendarClock} label="Entrega est." value={vehicle.eta} />
      </div>

      {last && (
        <p className="mt-3 flex items-start gap-2 text-xs text-ink-muted">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-st-ready" aria-hidden />
          <span>
            <span className="font-mono text-ink-dim">{last.time}</span> · {last.title} — {last.detail}
          </span>
        </p>
      )}

      {part && (
        <button
          type="button"
          id="hero-part-action"
          onClick={() => scrollTo("#repuestos")}
          className="group mt-4 flex w-full items-center justify-between gap-3 rounded-xl border border-amber/50 bg-amber/10 px-4 py-3 text-left transition-colors hover:bg-amber/15"
        >
          <span className="flex items-center gap-3">
            <TriangleAlert className="h-5 w-5 shrink-0 text-amber" aria-hidden />
            <span className="text-sm">
              <span className="block font-bold text-amber">Acción requerida</span>
              <span className="text-ink-muted">Aprueba el repuesto: {part.name.split("(")[0]?.trim()}</span>
            </span>
          </span>
          <ArrowRight className="h-5 w-5 shrink-0 text-amber transition-transform group-hover:translate-x-1" aria-hidden />
        </button>
      )}
    </motion.article>
  );
}
