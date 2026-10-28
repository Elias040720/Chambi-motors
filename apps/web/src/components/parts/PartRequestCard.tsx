"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Camera,
  ChevronDown,
  Hammer,
  PackageSearch,
  RotateCcw,
  ShieldCheck,
  Store,
  Truck,
  Wrench,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { StatusMorphOverlay } from "./StatusMorphOverlay";
import { VoiceNote } from "./VoiceNote";
import { cx, formatPEN } from "@/lib/utils";
import { useWorkshop, pendingPart } from "@/store/workshop";
import type { PartResolutionMode, Urgency } from "@/lib/types";

const URGENCY: Record<Urgency, { label: string; level: number; color: string }> = {
  alta: { label: "Urgencia alta", level: 3, color: "#EF4444" },
  media: { label: "Urgencia media", level: 2, color: "#F59E0B" },
  baja: { label: "Urgencia baja", level: 1, color: "#38BDF8" },
};

function UrgencyMeter({ urgency }: { urgency: Urgency }) {
  const u = URGENCY[urgency];
  return (
    <div className="flex items-center gap-2" role="img" aria-label={u.label}>
      <div className="flex items-end gap-[3px]" aria-hidden>
        {[1, 2, 3].map((n) => (
          <span
            key={n}
            className="w-1.5 rounded-sm transition-colors"
            style={{
              height: 6 + n * 4,
              background: n <= u.level ? u.color : "rgba(255,255,255,0.15)",
              boxShadow: n <= u.level ? `0 0 8px ${u.color}88` : undefined,
            }}
          />
        ))}
      </div>
      <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: u.color }}>
        {u.label}
      </span>
    </div>
  );
}

/** Tarjeta interactiva de solicitud de repuesto en tiempo real (Capítulo 3). */
export function PartRequestCard() {
  const { active, resolvePart, requestPart, reset } = useWorkshop();
  const reduce = useReducedMotion();
  const part = active.part;
  const pending = pendingPart(active);
  const firstName = active.mechanic.name.split(" ")[0] ?? active.mechanic.name;

  const [quoteOpen, setQuoteOpen] = useState(false);
  const [playing, setPlaying] = useState<PartResolutionMode | null>(null);

  // Al cambiar de vehículo o de solicitud, se cierra la cotización/overlay.
  useEffect(() => {
    setQuoteOpen(false);
    setPlaying(null);
  }, [active.plate, part?.id]);

  const total = part ? part.quote.reduce((s, l) => s + l.amount, 0) : 0;

  const choose = (mode: PartResolutionMode) => {
    setPlaying(mode);
    resolvePart(mode);
  };

  return (
    <div className="brushed-dark racing-border m-surface relative overflow-hidden rounded-3xl shadow-[0_40px_100px_-40px_rgba(0,0,0,0.95)] max-md:w-full">
      {/* Cabecera */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber/15 text-amber ring-1 ring-amber/30">
            <PackageSearch className="h-5 w-5" aria-hidden />
          </span>
          <div className="leading-tight">
            <p className="font-label text-[11px] text-ink-dim">Solicitud de repuesto</p>
            <p className="font-mono text-sm font-bold tracking-wider text-ink">
              {active.plate} <span className="font-sans font-medium text-ink-muted">· {active.model}</span>
            </p>
          </div>
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={active.status}
            initial={{ opacity: 0, y: -8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.9 }}
            transition={{ duration: 0.25 }}
          >
            <StatusBadge status={active.status} useAlt size="md" />
          </motion.div>
        </AnimatePresence>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {/* ───── Sin solicitud ───── */}
        {!part && (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-4 px-6 py-14 text-center"
          >
            <span className="grid h-16 w-16 place-items-center rounded-full bg-white/5 text-ink-muted">
              <Wrench className="h-7 w-7" aria-hidden />
            </span>
            <div>
              <p className="font-title text-titanium text-lg">Sin repuestos pendientes</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-ink-muted">
                {firstName} está trabajando en tu {active.model}. Simula el momento en que detecta una pieza que falta.
              </p>
            </div>
            <button
              type="button"
              id="part-simulate"
              onClick={requestPart}
              className="btn-racing font-tech inline-flex items-center gap-2 rounded-xl px-6 py-3 text-base font-bold uppercase tracking-widest transition-transform hover:-translate-y-0.5"
            >
              <Hammer className="h-4 w-4" aria-hidden />
              {firstName} pide un repuesto
            </button>
          </motion.div>
        )}

        {/* ───── Solicitud pendiente ───── */}
        {pending && (
          <motion.div
            key={`pending-${pending.id}`}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            className="grid gap-5 p-5 md:grid-cols-[1fr_1.05fr] max-md:grid-cols-[minmax(0,1fr)] max-md:p-6"
          >
            <div>
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-white/10 max-md:aspect-auto max-md:h-52">
                <Image
                  src={pending.image}
                  alt={`Foto referencial: ${pending.name}`}
                  fill
                  sizes="(min-width:768px) 320px, 90vw"
                  className="object-cover"
                />
                <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-lg bg-black/60 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-ink backdrop-blur">
                  <Camera className="h-3 w-3" aria-hidden /> Foto referencial
                </span>
              </div>
              <div className="mt-4">
                <UrgencyMeter urgency={pending.urgency} />
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <h3 className="font-title text-xl leading-tight text-ink sm:text-[1.4rem] max-md:text-2xl">{pending.name}</h3>
                <p className="mt-1.5 text-[13px] text-ink-muted">{pending.spec}</p>
              </div>

              <div className="space-y-2.5 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <div className="flex items-center gap-2.5">
                  <span className="font-title grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-racing to-amber-deep text-[11px] text-obsidian">
                    {active.mechanic.initials}
                  </span>
                  <p className="text-xs font-semibold text-ink">
                    {active.mechanic.name} <span className="font-normal text-ink-muted">· Mecánico</span>
                  </p>
                </div>
                <p className="text-[13px] leading-relaxed text-ink-muted max-md:line-clamp-2 max-md:text-base">“{pending.mechanicNote}”</p>
                <VoiceNote seconds={pending.voiceNoteSeconds} mechanic={firstName} />
              </div>

              <div className="space-y-2.5">
                <button
                  type="button"
                  id="part-option-client"
                  onClick={() => choose("client")}
                  className="group btn-metal flex w-full items-center gap-3 rounded-2xl p-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-racing/60 active:scale-[0.98] max-md:min-h-16"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/8 text-titanium-200 transition-colors group-hover:bg-racing/15 group-hover:text-racing">
                    <Store className="h-5 w-5" aria-hidden />
                  </span>
                  <span>
                    <span className="block text-sm font-bold text-ink max-md:text-base">Yo compro y llevo el repuesto al taller</span>
                    <span className="mt-0.5 block text-xs text-ink-muted">{pending.clientDeadline}</span>
                  </span>
                </button>

                <div
                  className={cx(
                    "overflow-hidden rounded-2xl border transition-colors",
                    quoteOpen ? "border-racing/60 bg-racing/[0.06]" : "border-transparent",
                  )}
                >
                  <button
                    type="button"
                    id="part-option-chambi"
                    aria-expanded={quoteOpen}
                    aria-controls="part-quote"
                    onClick={() => setQuoteOpen((o) => !o)}
                    className={cx(
                      "group flex w-full items-center gap-3 rounded-2xl p-3.5 text-left transition-all active:scale-[0.98] max-md:min-h-16",
                      quoteOpen ? "" : "btn-racing hover:-translate-y-0.5 hover:brightness-110",
                    )}
                  >
                    <span
                      className={cx(
                        "grid h-11 w-11 shrink-0 place-items-center rounded-xl",
                        quoteOpen ? "bg-racing/15 text-racing" : "bg-obsidian/15 text-obsidian",
                      )}
                    >
                      <ShieldCheck className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="flex-1">
                      <span className={cx("block text-sm font-extrabold max-md:text-base", quoteOpen ? "text-ink" : "text-obsidian")}>
                        Autorizo a Chambi Motors a comprarlo
                      </span>
                      <span className={cx("mt-0.5 block text-xs", quoteOpen ? "text-ink-muted" : "text-obsidian/75")}>
                        Cotización transparente · aprueba con 1 clic
                      </span>
                    </span>
                    <ChevronDown
                      className={cx(
                        "h-5 w-5 shrink-0 transition-transform",
                        quoteOpen ? "rotate-180 text-racing" : "text-obsidian",
                      )}
                      aria-hidden
                    />
                  </button>

                  <AnimatePresence initial={false}>
                    {quoteOpen && (
                      <motion.div
                        id="part-quote"
                        initial={reduce ? false : { height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
                        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                      >
                        <div className="px-4 pb-4">
                          <ul className="divide-y divide-white/10 rounded-xl border border-white/10 bg-obsidian/60 text-[13px]">
                            {pending.quote.map((l) => (
                              <li key={l.label} className="flex items-center justify-between px-3 py-2">
                                <span className="text-ink-muted">{l.label}</span>
                                <span className="font-mono text-ink">{formatPEN(l.amount)}</span>
                              </li>
                            ))}
                            <li className="flex items-center justify-between px-3 py-2.5">
                              <span className="font-bold text-ink">Total</span>
                              <span className="font-mono text-lg font-bold text-racing">{formatPEN(total)}</span>
                            </li>
                          </ul>
                          <p className="mt-2 flex items-center gap-1.5 text-[11px] text-ink-muted">
                            <Truck className="h-3.5 w-3.5" aria-hidden /> {pending.chambiEta}. Sin costos ocultos.
                          </p>
                          <button
                            type="button"
                            id="part-approve"
                            onClick={() => choose("chambi")}
                            className="btn-racing font-tech mt-3 w-full rounded-xl py-3 text-base font-bold uppercase tracking-widest transition-all hover:brightness-110 active:scale-[0.98] max-md:h-14 max-md:rounded-2xl max-md:py-0"
                          >
                            Aprobar {formatPEN(total)}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ───── Resuelta ───── */}
        {part?.resolution && (
          <motion.div
            key={`done-${part.id}`}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="p-5"
          >
            <div className="grid gap-5 md:grid-cols-[1fr_1.05fr] md:items-center">
              <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-st-ready/30">
                <Image src={part.image} alt="" fill sizes="(min-width:768px) 320px, 90vw" className="object-cover opacity-70" />
                <span className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                <span className="absolute bottom-3 left-3 rounded-lg bg-st-ready/90 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-obsidian">
                  Resuelto · {part.resolution.time}
                </span>
              </div>
              <div>
                <p className="font-label text-[11px] text-st-ready">Decisión registrada</p>
                <h3 className="font-title mt-1 text-xl text-ink">
                  {part.resolution.mode === "client" ? "Tú traes el repuesto" : "Chambi Motors lo compra"}
                </h3>
                <p className="mt-2 text-sm text-ink-muted">
                  {part.resolution.mode === "client"
                    ? `${firstName} te espera: ${part.clientDeadline.toLowerCase()}`
                    : `${formatPEN(total)} autorizados. ${part.chambiEta}.`}
                </p>
                <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-racing">
                  <Wrench className="h-4 w-4" aria-hidden /> {firstName} ya retomó la reparación ({active.progress}%).
                </p>
                <button
                  type="button"
                  id="part-reset"
                  onClick={reset}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl border border-steel-line/50 px-4 py-2.5 text-sm font-semibold text-ink-muted transition-colors hover:border-racing/60 hover:text-racing"
                >
                  <RotateCcw className="h-4 w-4" aria-hidden /> Reiniciar demo
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {playing && (
          <StatusMorphOverlay
            key="overlay"
            mode={playing}
            mechanicFirstName={firstName}
            onDone={() => setPlaying(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
