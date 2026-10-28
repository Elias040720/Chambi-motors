"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Pause, Play } from "lucide-react";
import { cx } from "@/lib/utils";

/** Alturas determinísticas (sin Math.random para evitar desajustes de hidratación). */
const BARS = Array.from({ length: 24 }, (_, i) => {
  const v = Math.abs(Math.sin(i * 1.5) * 0.6 + Math.sin(i * 0.7 + 1.2) * 0.4);
  return 20 + Math.round(v * 80);
});

/** Nota de voz simulada del mecánico (reproducción visual con scrubbing interactivo). */
export function VoiceNote({ seconds, mechanic }: { seconds: number; mechanic: string }) {
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const raf = useRef<number | null>(null);
  const start = useRef(0);

  useEffect(() => {
    if (!playing) return;
    start.current = performance.now() - t * 1000;
    const loop = () => {
      const el = (performance.now() - start.current) / 1000;
      if (el >= seconds) {
        setT(0);
        setPlaying(false);
        return;
      }
      setT(el);
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, seconds]);

  const progress = Math.min(1, Math.max(0, t / seconds));
  const remaining = Math.max(0, Math.ceil(seconds - t));

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) return;
    const clickX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, clickX / rect.width));
    setT(pct * seconds);
  };

  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] p-2.5 max-md:gap-3 max-md:rounded-xl max-md:p-3">
      <button
        type="button"
        id="voice-note-toggle"
        onClick={() => setPlaying((p) => !p)}
        aria-label={playing ? "Pausar nota de voz" : `Reproducir nota de voz de ${mechanic}`}
        className="btn-racing grid h-10 w-10 shrink-0 place-items-center rounded-full transition-transform hover:scale-105 active:scale-95 max-md:h-11 max-md:w-11"
      >
        {playing ? (
          <Pause className="h-4 w-4 fill-current" aria-hidden />
        ) : (
          <Play className="h-4 w-4 translate-x-0.5 fill-current" aria-hidden />
        )}
      </button>

      <div
        className="flex h-7 flex-1 min-w-0 cursor-pointer items-center gap-[3px] overflow-hidden max-md:h-8"
        aria-hidden
        onClick={handleSeek}
        title="Adelantar / retroceder"
      >
        {BARS.map((h, i) => (
          <span
            key={i}
            className={cx(
              "flex-1 min-w-[2px] max-w-[4px] rounded-full transition-colors duration-150",
              i / BARS.length < progress ? "bg-racing" : "bg-white/25",
            )}
            style={{ height: `${h}%` }}
          />
        ))}
      </div>

      <span className="flex shrink-0 items-center gap-1 font-mono text-xs tabular-nums text-ink-muted select-none">
        <Mic className="h-3 w-3 shrink-0 text-white/40" aria-hidden />
        <span>0:{String(playing ? remaining : seconds).padStart(2, "0")}</span>
      </span>
    </div>
  );
}
