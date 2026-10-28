"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Loader2, Play, ScanSearch, SearchX } from "lucide-react";
import { VehicleResult } from "./VehicleResult";
import { DEMO_PLATE } from "@/lib/data";
import { cx, formatPlate, normalizePlate } from "@/lib/utils";
import { useWorkshop } from "@/store/workshop";

type Phase = "idle" | "scanning" | "found" | "notfound";

/** Buscador por placa con estética de tablero digital automotriz. */
export function PlateSearch() {
  const { vehicles, findByPlate, selectPlate } = useWorkshop();
  const reduce = useReducedMotion();
  const [value, setValue] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [queried, setQueried] = useState<string | null>(null);
  const [typing, setTyping] = useState(false);
  const timers = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const runSearch = useCallback(
    (raw: string) => {
      clearTimers();
      const found = findByPlate(raw);
      setQueried(raw);
      setPhase("scanning");
      timers.current.push(
        window.setTimeout(() => {
          if (found) {
            selectPlate(found.plate);
            setPhase("found");
          } else setPhase("notfound");
        }, reduce ? 150 : 1000),
      );
    },
    [clearTimers, findByPlate, selectPlate, reduce],
  );

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (normalizePlate(value).length < 6 || typing) return;
    runSearch(value);
  };

  /** Demo en vivo: “escribe” la placa y lanza la consulta automáticamente. */
  const playDemo = (plate: string) => {
    clearTimers();
    setPhase("idle");
    setTyping(true);
    setValue("");
    const target = formatPlate(plate);
    if (reduce) {
      setValue(target);
      setTyping(false);
      runSearch(target);
      return;
    }
    [...target].forEach((_, i) => {
      timers.current.push(
        window.setTimeout(() => {
          setValue(target.slice(0, i + 1));
          if (i === target.length - 1) {
            setTyping(false);
            timers.current.push(window.setTimeout(() => runSearch(target), 350));
          }
        }, 160 + i * 95),
      );
    });
  };

  const vehicle = phase === "found" && queried ? findByPlate(queried) : undefined;
  const complete = normalizePlate(value).length === 6;

  return (
    <div id="consulta" className="w-full min-w-0 max-w-2xl scroll-mt-28">
      <form
        onSubmit={onSubmit}
        aria-label="Consulta rápida por placa"
        className="brushed-dark relative rounded-2xl border border-white/10 p-3 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)] sm:p-4 m-surface max-md:w-full max-md:rounded-3xl max-md:p-5"
      >
        <div className="mb-3 flex items-center justify-between px-1">
          <label htmlFor="plate-input" className="font-label flex items-center gap-2 text-[11px] text-ink-muted">
            <ScanSearch className="h-4 w-4 text-racing" aria-hidden />
            Consulta rápida por placa
          </label>
          <span className="hidden font-mono text-[10px] tracking-widest text-ink-dim sm:block">
            WS://CHAMBI.LIVE · 38 MS
          </span>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row max-md:gap-4">
          <div
            className={cx(
              "relative flex min-w-0 flex-1 items-stretch overflow-hidden rounded-xl border-2 bg-obsidian transition-colors max-md:h-16 max-md:rounded-2xl",
              complete ? "border-racing/70" : "border-steel-line/50 focus-within:border-racing/70",
            )}
          >
            <span className="font-label grid w-11 shrink-0 place-items-center bg-gradient-to-b from-[#c7283b] to-[#8f1626] px-1 text-[11px] tracking-widest text-white [writing-mode:vertical-rl] rotate-180">
              Perú
            </span>
            <input
              id="plate-input"
              name="plate"
              inputMode="text"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={7}
              value={value}
              onChange={(e) => setValue(formatPlate(e.target.value))}
              placeholder="ABC-123"
              aria-describedby="plate-hint"
              disabled={typing}
              className="min-w-0 flex-1 bg-transparent px-4 py-3.5 text-center font-mono text-2xl font-extrabold uppercase tracking-[0.28em] text-ink placeholder:text-white/20 focus:outline-none sm:text-3xl max-md:px-2 max-md:py-0 max-md:tracking-[0.2em]"
            />
            {typing && (
              <span className="pointer-events-none absolute bottom-3 right-4 h-6 w-0.5 animate-blink bg-racing" aria-hidden />
            )}
          </div>

          <button
            type="submit"
            id="plate-submit"
            disabled={!complete || typing || phase === "scanning"}
            className="btn-racing font-tech inline-flex items-center justify-center gap-2 rounded-xl px-7 py-3.5 text-lg font-bold uppercase tracking-widest transition-all enabled:hover:-translate-y-0.5 enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 max-md:h-14 max-md:w-full max-md:rounded-2xl max-md:py-0 max-md:text-base"
          >
            {phase === "scanning" ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            ) : (
              "Consultar"
            )}
          </button>
        </div>

        <p id="plate-hint" className="mt-3 px-1 text-xs text-ink-muted max-md:hidden">
          Sin registro ni contraseña. Prueba con una placa de demostración:
        </p>

        <div className="mt-2.5 flex flex-wrap items-center gap-2 max-md:mt-4">
          <button
            type="button"
            id="plate-demo"
            onClick={() => playDemo(DEMO_PLATE)}
            disabled={typing}
            className="group btn-metal inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-bold text-ink transition-all hover:-translate-y-0.5 hover:border-racing/60 disabled:opacity-60 max-md:h-14 max-md:w-full max-md:justify-center max-md:rounded-2xl max-md:py-0 max-md:text-base"
          >
            <span className="grid h-6 w-6 place-items-center rounded-full bg-racing text-obsidian transition-transform group-hover:scale-110">
              <Play className="h-3 w-3 translate-x-px fill-current" aria-hidden />
            </span>
            Probar Demo<span className="max-md:hidden"> en Vivo</span>: Placa <span className="font-mono text-racing">{DEMO_PLATE}</span>
          </button>
          {vehicles
            .filter((v) => v.plate !== DEMO_PLATE)
            .map((v) => (
              <button
                key={v.plate}
                type="button"
                id={`plate-chip-${v.plate}`}
                onClick={() => playDemo(v.plate)}
                disabled={typing}
                className="rounded-lg border border-steel-line/40 px-3 py-2 font-mono text-xs font-semibold tracking-wider text-ink-muted transition-colors hover:border-racing/50 hover:text-racing disabled:opacity-60 max-md:hidden"
              >
                {v.plate}
              </button>
            ))}
        </div>
      </form>

      <div className="mt-4 min-h-[2px]" aria-live="polite">
        <AnimatePresence mode="wait">
          {phase === "scanning" && (
            <motion.div
              key="scan"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="glass relative overflow-hidden rounded-2xl px-5 py-6"
            >
              <p className="font-mono text-xs tracking-widest text-ink-muted">
                BUSCANDO {queried && formatPlate(queried)} EN EL SISTEMA…
              </p>
              <div className="relative mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
                <motion.span
                  className="absolute inset-y-0 w-1/3 rounded-full bg-gradient-to-r from-transparent via-racing to-transparent"
                  initial={{ x: "-100%" }}
                  animate={{ x: "300%" }}
                  transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>
            </motion.div>
          )}

          {phase === "found" && vehicle && <VehicleResult key={vehicle.plate} vehicle={vehicle} />}

          {phase === "notfound" && (
            <motion.div
              key="nf"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              role="alert"
              className="glass flex items-start gap-3 rounded-2xl border-st-waiting/30 px-5 py-4"
            >
              <SearchX className="mt-0.5 h-5 w-5 shrink-0 text-amber" aria-hidden />
              <p className="text-sm text-ink-muted">
                <span className="font-semibold text-ink">No encontramos la placa {queried && formatPlate(queried)}.</span>{" "}
                Esta es una demo: usa <b className="font-mono text-racing">ABC-123</b>,{" "}
                <b className="font-mono text-racing">V3R-482</b> o{" "}
                <b className="font-mono text-racing">F7H-905</b>.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
