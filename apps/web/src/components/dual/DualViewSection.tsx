"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { HardHat, Terminal, UserRound } from "lucide-react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { VehicleSwitcher } from "@/components/shared/VehicleSwitcher";
import { ClientDashboard } from "./ClientDashboard";
import { MechanicConsole } from "./MechanicConsole";
import { SyncBridge } from "./SyncBridge";
import { cx } from "@/lib/utils";
import { useWorkshop } from "@/store/workshop";

type Mode = "cliente" | "mecanico";

const MODES: Array<{ id: Mode; label: string; icon: typeof UserRound; blurb: string }> = [
  {
    id: "cliente",
    label: "Modo Cliente",
    icon: UserRound,
    blurb: "Todo claro: avance, fotos y avisos de repuestos, sin llamar a nadie.",
  },
  {
    id: "mecanico",
    label: "Modo Mecánico",
    icon: HardHat,
    blurb: "Botones gigantes y cero teclado: pensado para manos con grasa y poco tiempo.",
  },
];

/** Detecta un nuevo evento en el MISMO vehículo (ignora cambios de selección). */
function useSyncPulse(plate: string, tick: number) {
  const prev = useRef({ plate, tick });
  const [pulse, setPulse] = useState(0);
  useEffect(() => {
    if (prev.current.plate === plate && prev.current.tick !== tick) setPulse((p) => p + 1);
    prev.current = { plate, tick };
  }, [plate, tick]);
  return pulse;
}

function Pane({
  order,
  primary,
  label,
  tag,
  pulse,
  children,
}: {
  order: number;
  primary: boolean;
  label: string;
  tag: string;
  pulse: number;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      layout
      transition={{ type: "spring", stiffness: 260, damping: 30 }}
      style={{ order }}
      className={cx(
        "w-full max-w-[400px] shrink-0 lg:w-[380px] max-md:max-w-none",
        !primary && "max-md:hidden",
      )}
    >
      <div className="mb-3 flex items-center justify-between px-1 max-md:hidden">
        <p className="font-label text-[11px] text-ink-muted">{label}</p>
        <span
          className={cx(
            "font-label rounded-full border px-2.5 py-1 text-[10px] transition-colors duration-500",
            primary
              ? "border-racing/50 bg-racing/10 text-racing"
              : "border-steel-line/40 bg-white/[0.03] text-ink-dim",
          )}
        >
          {tag}
        </span>
      </div>
      <div
        className={cx(
          "brushed m-flat relative rounded-[34px] p-2 transition-shadow duration-500",
          primary
            ? "shadow-[0_0_0_1px_rgba(255,214,10,0.55),0_30px_90px_-30px_rgba(255,214,10,0.35)]"
            : "shadow-[0_30px_80px_-40px_rgba(0,0,0,0.9)]",
        )}
      >
        <div className="relative h-[640px] overflow-hidden rounded-[27px] bg-obsidian max-md:h-auto max-md:rounded-3xl max-md:border max-md:border-white/10 max-md:bg-zinc-900/90">
          {children}
          {pulse > 0 && (
            <motion.span
              key={pulse}
              aria-hidden
              initial={{ opacity: 0.9 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 1.1 }}
              className="pointer-events-none absolute inset-0 rounded-[inherit] ring-2 ring-inset ring-racing"
            />
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function DualViewSection() {
  const { active } = useWorkshop();
  const reduce = useReducedMotion();
  const [mode, setMode] = useState<Mode>("mecanico");
  const pulse = useSyncPulse(active.plate, active.syncTick);

  const mechanicFirst = mode === "mecanico";
  const lastEvent = active.events[0];
  const fromMechanic = lastEvent?.source !== "cliente";
  const forward = mechanicFirst ? fromMechanic : !fromMechanic;
  const latency = 24 + ((active.syncTick * 7) % 21);
  const current = MODES.find((m) => m.id === mode)!;

  return (
    <section
      id="taller"
      aria-labelledby="dual-title"
      className="relative isolate overflow-clip bg-obsidian py-24 sm:py-32 max-md:z-10 max-md:w-full max-md:max-w-full max-md:pb-16"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="grid-bg absolute inset-0 opacity-60" />
        <div className="absolute left-1/2 top-1/2 h-[520px] w-[820px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-racing/[0.05] blur-[130px]" />
      </div>

      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          align="center"
          id="dual-title"
          chapter="04"
          eyebrow="Vista dual interactiva"
          title={
            <>
              Tan fácil para <span className="text-racing">Henry</span> como para el cliente
            </>
          }
          lead={
            <>
              <span className="max-md:hidden">
                Cambia de perfil y presiona cualquier botón del taller: el panel del cliente se actualiza al
                instante, igual que con una conexión WebSocket real.
              </span>
              <span className="md:hidden">Toca un botón del taller y el cliente lo ve al instante.</span>
            </>
          }
        />

        {/* Conmutador */}
        <div className="mt-10 flex flex-col items-center gap-4 max-md:mt-8 max-md:items-stretch">
          <LayoutGroup id="mode-toggle">
            <div
              role="radiogroup"
              aria-label="Perfil de la interfaz"
              className="glass relative inline-flex rounded-full p-1.5 max-md:flex max-md:h-14 max-md:w-full"
            >
              {MODES.map((m) => {
                const selected = m.id === mode;
                return (
                  <button
                    key={m.id}
                    type="button"
                    id={`mode-${m.id}`}
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setMode(m.id)}
                    className={cx(
                      "font-tech relative flex items-center gap-2 rounded-full px-5 py-2.5 text-[15px] font-bold uppercase tracking-wider transition-colors sm:px-7 max-md:h-full max-md:flex-1 max-md:justify-center max-md:px-2 max-md:py-0 max-md:text-[13px] max-md:tracking-normal",
                      selected ? "text-obsidian" : "text-ink-muted hover:text-ink",
                    )}
                  >
                    {selected && (
                      <motion.span
                        layoutId="mode-pill"
                        className="btn-racing absolute inset-0 rounded-full"
                        transition={{ type: "spring", stiffness: 380, damping: 32 }}
                      />
                    )}
                    <m.icon className="relative h-4 w-4" aria-hidden />
                    <span className="relative">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </LayoutGroup>

          <AnimatePresence mode="wait">
            <motion.p
              key={mode}
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="max-w-lg text-center text-sm text-ink-muted max-md:mx-auto max-md:text-base max-md:leading-relaxed max-md:text-zinc-400"
            >
              {current.blurb}
            </motion.p>
          </AnimatePresence>

          <VehicleSwitcher id="dual-vehicle" className="justify-center" />
        </div>

        {/* Escenario */}
        <div className="mt-10 flex flex-col items-center gap-2 lg:flex-row lg:items-center lg:justify-center lg:gap-0 max-md:mt-6 max-md:items-stretch">
          <Pane
            order={mechanicFirst ? 0 : 2}
            primary={mechanicFirst}
            label="Taller · Tablet del mecánico"
            tag={mechanicFirst ? "Tú estás aquí" : "Vista en vivo"}
            pulse={pulse}
          >
            <MechanicConsole />
          </Pane>

          <div style={{ order: 1 }} className="lg:self-center max-md:hidden">
            <SyncBridge pulse={pulse} forward={forward} latency={latency} />
          </div>

          <Pane
            order={mechanicFirst ? 2 : 0}
            primary={!mechanicFirst}
            label="Cliente · Su celular"
            tag={mechanicFirst ? "Vista en vivo" : "Tú estás aquí"}
            pulse={pulse}
          >
            <ClientDashboard />
          </Pane>
        </div>

        {/* Registro de eventos tipo terminal */}
        <div className="mx-auto mt-10 max-w-3xl max-md:hidden">
          <div className="brushed-dark overflow-hidden rounded-2xl border border-white/10">
            <div className="flex items-center gap-2 border-b border-white/8 px-4 py-2.5">
              <Terminal className="h-4 w-4 text-racing" aria-hidden />
              <p className="font-mono text-[11px] tracking-widest text-ink-muted">
                WS://CHAMBI.LIVE/ORDEN/{active.orderCode} · {active.plate}
              </p>
              <span className="ml-auto flex items-center gap-1.5 font-mono text-[10px] text-st-ready">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-st-ready" /> CONECTADO
              </span>
            </div>
            <ul className="space-y-1 px-4 py-3 font-mono text-[12px]" aria-live="polite">
              <AnimatePresence initial={false}>
                {active.events.slice(0, 4).map((e) => (
                  <motion.li
                    key={e.id}
                    layout
                    initial={{ opacity: 0, x: -14 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex gap-3 text-ink-muted"
                  >
                    <span className="text-ink-dim">{e.time}</span>
                    <span className="w-16 shrink-0 text-amber">{e.source}</span>
                    <span className="truncate text-ink">
                      → {e.title}
                    </span>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
