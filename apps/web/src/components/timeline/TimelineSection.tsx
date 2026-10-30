"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { BellRing, CarFront, PhoneOff } from "lucide-react";
import { FitBox } from "@/components/ui/FitBox";
import { Logo } from "@/components/ui/Logo";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { useSmoothScroll } from "@/components/providers/SmoothScrollProvider";
import { PHONE_H, PHONE_W, PhoneFrame } from "./PhoneFrame";
import { StageScreen } from "./StageScreens";
import { TIMELINE_STAGES } from "@/lib/data";
import { registerGsap } from "@/lib/gsap";
import { STATUS_META } from "@/lib/status";
import { cx } from "@/lib/utils";
import type { TimelineStage } from "@/lib/types";
import { MOBILE_STAGE_COPY, MobileStageCard } from "./MobileStageCard";

/** Recorrido de scroll (en dvh) de la sección sticky en móvil. */
const MOBILE_SCROLL_DVH = 420;

const LAST = TIMELINE_STAGES.length - 1;

/* ───────── Tarjeta de etapa (Plata Titanio + borde Amarillo Racing) ───────── */
function StageCard({
  stage,
  active,
  done,
  onSelect,
}: {
  stage: TimelineStage;
  active: boolean;
  done: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      id={`stage-card-${stage.id}`}
      onClick={onSelect}
      aria-current={active ? "step" : undefined}
      className={cx(
        "racing-border group relative w-full overflow-hidden rounded-2xl text-left transition-all duration-500",
        active
          ? "brushed scale-[1.02] text-obsidian shadow-[0_20px_60px_-18px_rgba(255,214,10,0.45)]"
          : "brushed-dark border border-white/8 text-ink-muted hover:text-ink",
        !active && "before:opacity-0",
      )}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <span
          className={cx(
            "grid h-8 w-8 shrink-0 place-items-center rounded-lg font-mono text-sm font-bold transition-colors duration-500",
            active
              ? "bg-obsidian text-racing"
              : done
                ? "bg-racing/15 text-racing"
                : "bg-white/6 text-ink-dim",
          )}
        >
          {String(stage.index + 1).padStart(2, "0")}
        </span>
        <span className={cx("font-tech text-[17px] font-bold uppercase leading-tight tracking-wide", active ? "text-obsidian" : "text-ink")}>
          {stage.title}
        </span>
      </div>
      <div
        className={cx(
          "grid transition-[grid-template-rows] duration-500 ease-out",
          active ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <p className="px-4 pb-4 pl-[3.75rem] text-[13px] leading-snug text-obsidian/80">
            {stage.description}
          </p>
        </div>
      </div>
      {active && (
        <motion.span
          layoutId="stage-glint"
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
          initial={{ x: "-100%" }}
          animate={{ x: "100%" }}
          transition={{ duration: 1.1, ease: "easeOut" }}
        />
      )}
    </button>
  );
}

/* ───────── Tarjeta de notificación push (columna derecha) ───────── */
function PushCard({ stage }: { stage: TimelineStage }) {
  const meta = STATUS_META[stage.status];
  return (
    <div className="space-y-4">
      <p className="font-label flex items-center gap-2 text-[11px] text-ink-dim">
        <BellRing className="h-3.5 w-3.5 text-racing" aria-hidden />
        Lo que recibe el cliente
      </p>
      <AnimatePresence mode="wait">
        <motion.div
          key={stage.id}
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -14, scale: 0.97 }}
          transition={{ duration: 0.4 }}
          className="glass flex items-start gap-3 rounded-2xl p-4 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.9)]"
        >
          <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/10 bg-carbon">
            <Logo variant="emblem" sizes="48px" className="h-6 w-auto" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-[13px] font-bold text-ink">{stage.notification.title}</p>
              <span className="font-mono text-[10px] text-ink-dim">{stage.notification.time}</span>
            </div>
            <p className="mt-0.5 text-[12.5px] leading-snug text-ink-muted">{stage.notification.body}</p>
            <span className="mt-2 inline-flex items-center gap-1.5 text-[10.5px] font-semibold" style={{ color: meta.color }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />
              {meta.label}
            </span>
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="grid grid-cols-2 gap-3">
        <div className="brushed-dark rounded-2xl border border-white/8 p-4">
          <AnimatePresence mode="wait">
            <motion.p
              key={stage.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="font-mono text-2xl font-bold text-racing"
            >
              {stage.metric.value}
            </motion.p>
          </AnimatePresence>
          <p className="mt-1 text-[11px] text-ink-muted">{stage.metric.label}</p>
        </div>
        <div className="brushed-dark rounded-2xl border border-white/8 p-4">
          <p className="flex items-center gap-2 font-mono text-2xl font-bold text-st-ready">
            <PhoneOff className="h-5 w-5" aria-hidden /> 0
          </p>
          <p className="mt-1 text-[11px] text-ink-muted">Llamadas de seguimiento</p>
        </div>
      </div>
    </div>
  );
}

/* ───────── Sección principal fijada (pinned) ───────── */
export function TimelineSection() {
  const reduce = useReducedMotion();
  const { scrollTo } = useSmoothScroll();
  const pinRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const carRef = useRef<HTMLDivElement>(null);
  const stRef = useRef<{ start: number; end: number } | null>(null);
  const activeRef = useRef(0);

  const [active, setActive] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);

  const applyStage = useCallback((next: number) => {
    if (next === activeRef.current) return;
    setDirection(next > activeRef.current ? 1 : -1);
    activeRef.current = next;
    setActive(next);
  }, []);

  const mSectionRef = useRef<HTMLDivElement>(null);
  const mFillRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reduce) return;
    const { gsap, ScrollTrigger } = registerGsap();
    const mm = gsap.matchMedia();

    /* ── Escritorio / tablet (≥ 768px): pin original, sin cambios ── */
    mm.add("(min-width: 768px)", () => {
      const track = trackRef.current;
      const fill = fillRef.current;
      const car = carRef.current;
      if (!pinRef.current || !track || !fill || !car) return;

      const setCarX = gsap.quickSetter(car, "x", "px");
      const setFill = gsap.quickSetter(fill, "scaleX");

      const st = ScrollTrigger.create({
        trigger: pinRef.current,
        start: "top top",
        end: () => `+=${Math.round(window.innerHeight * (window.innerWidth < 1024 ? 3.2 : 3.8))}`,
        pin: true,
        pinSpacing: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const p = self.progress;
          setFill(p);
          setCarX(track.offsetWidth * p);
          applyStage(Math.round(p * LAST));
        },
        onRefresh: (self) => {
          stRef.current = { start: self.start, end: self.end };
          setCarX(track.offsetWidth * self.progress);
        },
      });
      stRef.current = { start: st.start, end: st.end };
    });

    /* ── Móvil (< 768px): sticky 100dvh + progreso por scroll, SIN pin ──
       Al no usar position:fixed/pin-spacer, el ancho del contenedor no
       puede encogerse ni dejar franjas negras asimétricas. */
    mm.add("(max-width: 767px)", () => {
      const section = mSectionRef.current;
      const fill = mFillRef.current;
      if (!section || !fill) return;

      const setFill = gsap.quickSetter(fill, "scaleX");
      const sync = (p: number) => {
        setFill(p);
        applyStage(Math.round(p * LAST));
      };

      ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.5,
        invalidateOnRefresh: true,
        onUpdate: (self) => sync(self.progress),
        onRefresh: (self) => {
          stRef.current = { start: self.start, end: self.end };
          sync(self.progress);
        },
      });
    });

    return () => mm.revert();
  }, [reduce, applyStage]);

  const goToStage = (i: number) => {
    if (reduce || !stRef.current) {
      applyStage(i);
      return;
    }
    const { start, end } = stRef.current;
    scrollTo(start + (end - start) * (i / LAST), { offset: 0 });
  };

  const stage = TIMELINE_STAGES[active] ?? TIMELINE_STAGES[0]!;
  const glow = STATUS_META[stage.status].color;
  const pct = reduce ? (active / LAST) * 100 : undefined;

  return (
    <section
      id="como-funciona"
      aria-labelledby="timeline-title"
      className="relative bg-obsidian max-md:isolate max-md:z-10 max-md:overflow-clip"
    >
      {/* ───── MÓVIL (< 768px): sticky 100dvh, tarjeta única a ancho completo ───── */}
      <div
        ref={mSectionRef}
        className="relative w-full max-w-full md:hidden"
        style={reduce ? undefined : { height: `${MOBILE_SCROLL_DVH}dvh` }}
      >
        <div
          className={cx(
            "isolate w-full max-w-full overflow-hidden bg-obsidian",
            reduce ? "relative" : "sticky top-0 h-dvh",
          )}
        >
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
            <div className="grid-bg absolute inset-0 opacity-60" />
            <div
              className="absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20 blur-[100px] transition-colors duration-700"
              style={{ background: glow }}
            />
          </div>

          <div
            className={cx(
              "flex w-full flex-col gap-4 box-border px-5 pb-6 pt-24",
              !reduce && "h-full",
            )}
          >
            <header className="shrink-0">
              <p className="font-label flex items-center gap-3 text-xs text-amber">
                <span className="font-mono text-[11px] tracking-widest text-racing">02</span>
                <span className="h-px w-8 bg-gradient-to-r from-racing to-transparent" aria-hidden />
                Cómo funciona
              </p>
              <h2 className="font-title mt-2 text-3xl leading-tight text-ink">
                El fin de las <span className="text-racing">llamadas</span>
              </h2>
            </header>

            {/* Progreso continuo estilo Apple */}
            <div className="shrink-0">
              <div className="flex items-baseline justify-between">
                <p className="font-mono text-sm text-zinc-400">
                  Etapa{" "}
                  <b className="text-xl text-racing">{String(active + 1).padStart(2, "0")}</b> de{" "}
                  {String(TIMELINE_STAGES.length).padStart(2, "0")}
                </p>
                <span className="font-label text-[11px] tracking-[0.2em] text-amber">{stage.short}</span>
              </div>
              <div className="relative mt-3 h-2.5 rounded-full bg-white/10">
                <div
                  ref={mFillRef}
                  className="absolute inset-0 origin-left rounded-full bg-gradient-to-r from-racing via-amber to-amber-deep shadow-[0_0_16px_rgba(255,214,10,0.45)]"
                  style={{ transform: `scaleX(${pct != null ? pct / 100 : 0})` }}
                />
                <div className="absolute -inset-y-4 inset-x-0 grid grid-cols-5">
                  {TIMELINE_STAGES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      id={`m-stage-${s.id}`}
                      onClick={() => goToStage(s.index)}
                      aria-label={`Ir a la etapa ${s.index + 1}: ${s.title}`}
                      aria-current={s.index === active ? "step" : undefined}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Protagonista: gran tarjeta a ancho completo */}
            <div className={cx("min-h-0", reduce ? "h-[420px]" : "flex-1")}>
              <MobileStageCard stage={stage} />
            </div>

            {/* Título + descripción en 2 líneas */}
            <div className="shrink-0">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={stage.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                >
                  <h3 className="font-tech text-xl font-bold uppercase leading-tight tracking-wide text-titanium">
                    {stage.title}
                  </h3>
                  <p className="mt-1.5 text-base leading-relaxed text-zinc-400">
                    {MOBILE_STAGE_COPY[stage.index]}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* ───── ESCRITORIO / TABLET (≥ 768px): diseño original con pin ───── */}
      <div
        ref={pinRef}
        className={cx(
          "relative isolate flex flex-col overflow-hidden max-md:hidden",
          reduce ? "py-24" : "h-svh pb-4 pt-[4.75rem] sm:pb-6 sm:pt-24",
        )}
      >
        {/* fondo */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="grid-bg absolute inset-0 opacity-70" />
          <div
            className="absolute left-1/2 top-1/2 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20 blur-[110px] transition-colors duration-700"
            style={{ background: glow }}
          />
        </div>

        <div className="mx-auto flex h-full min-h-0 w-full max-w-7xl flex-1 flex-col px-5 sm:px-8">
          <div className="flex shrink-0 flex-wrap items-end justify-between gap-3">
            <SectionHeading
              compact
              id="timeline-title"
              chapter="02"
              eyebrow="Cómo funciona"
              title={
                <>
                  El fin de las <span className="text-racing">llamadas</span>
                </>
              }
            />
            <p className="font-mono text-xs tracking-widest text-ink-dim">
              ETAPA <span className="text-base font-bold text-racing">{active + 1}</span> / {TIMELINE_STAGES.length}
            </p>
          </div>

          {/* Barra de progreso automotriz */}
          <div className="relative mt-5 shrink-0 px-5 sm:mt-6 sm:px-6">
            <div ref={trackRef} className="relative h-1.5 rounded-full bg-white/10">
              <div
                ref={fillRef}
                className="absolute inset-0 origin-left rounded-full bg-gradient-to-r from-racing via-amber to-amber-deep shadow-[0_0_16px_rgba(255,214,10,0.55)]"
                style={{ transform: `scaleX(${pct != null ? pct / 100 : 0})` }}
              />
              {/* Auto que recorre la pista */}
              <div
                ref={carRef}
                aria-hidden
                className="absolute -top-[22px] left-0 -ml-3 grid h-6 w-6 place-items-center text-racing drop-shadow-[0_0_8px_rgba(255,214,10,0.9)]"
                style={pct != null ? { left: `${pct}%` } : undefined}
              >
                <CarFront className="h-6 w-6" />
              </div>
              {TIMELINE_STAGES.map((s) => {
                const lit = s.index <= active;
                return (
                  <button
                    key={s.id}
                    type="button"
                    id={`stage-node-${s.id}`}
                    onClick={() => goToStage(s.index)}
                    aria-label={`Ir a la etapa ${s.index + 1}: ${s.title}`}
                    aria-current={s.index === active ? "step" : undefined}
                    className="group absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${(s.index / LAST) * 100}%` }}
                  >
                    <span
                      className={cx(
                        "grid h-6 w-6 place-items-center rounded-full border-2 font-mono text-[10px] font-bold transition-all duration-500 sm:h-7 sm:w-7 sm:text-xs",
                        lit
                          ? "border-racing bg-racing text-obsidian shadow-[0_0_16px_rgba(255,214,10,0.7)]"
                          : "border-steel-line bg-obsidian text-ink-dim group-hover:border-titanium-400",
                        s.index === active && "scale-125",
                      )}
                    >
                      {s.index + 1}
                    </span>
                    <span
                      className={cx(
                        "font-label absolute left-1/2 top-full mt-1.5 hidden -translate-x-1/2 whitespace-nowrap text-[10px] transition-colors md:block",
                        lit ? "text-racing" : "text-ink-dim",
                      )}
                    >
                      {s.short}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Contenido: rail · teléfono · push */}
          <div className="mt-6 flex min-h-0 flex-1 flex-col gap-3 md:mt-8 lg:grid lg:grid-cols-[minmax(0,1fr)_340px_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)] lg:items-center lg:gap-8">
            <div className="hidden flex-col gap-2 lg:flex" role="list" aria-label="Etapas del servicio">
              {TIMELINE_STAGES.map((s) => (
                <div role="listitem" key={s.id}>
                  <StageCard
                    stage={s}
                    active={s.index === active}
                    done={s.index < active}
                    onSelect={() => goToStage(s.index)}
                  />
                </div>
              ))}
            </div>

            <div
              className={cx(
                reduce
                  ? "h-[580px] flex-none"
                  : "min-h-0 flex-1 lg:h-full lg:min-h-[460px] lg:flex-none",
              )}
            >
              <FitBox designWidth={PHONE_W} designHeight={PHONE_H}>
                <PhoneFrame glow={glow} clock={stage.notification.time}>
                  <AnimatePresence mode="wait" initial={false}>
                    <StageScreen key={stage.id} stage={stage} direction={direction} />
                  </AnimatePresence>
                </PhoneFrame>
              </FitBox>
            </div>

            {/* Móvil / tablet: tarjeta de etapa activa */}
            <div className="shrink-0 lg:hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={stage.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="brushed racing-border rounded-2xl px-4 py-3 text-obsidian shadow-[0_18px_50px_-18px_rgba(255,214,10,0.4)]"
                >
                  <p className="font-tech flex items-center gap-2 text-base font-bold uppercase leading-tight tracking-wide">
                    <span className="rounded-md bg-obsidian px-1.5 py-0.5 font-mono text-xs text-racing">
                      {String(stage.index + 1).padStart(2, "0")}
                    </span>
                    {stage.title}
                  </p>
                  <p className="mt-1 line-clamp-3 text-[12.5px] leading-snug text-obsidian/80">{stage.description}</p>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="hidden lg:block">
              <PushCard stage={stage} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
