import type { CSSProperties, ReactNode } from "react";
import { Logo } from "@/components/ui/Logo";
import { Signal, Wifi, BatteryFull } from "lucide-react";

export const PHONE_W = 280;
export const PHONE_H = 580;

interface PhoneFrameProps {
  children: ReactNode;
  /** Color de resplandor (estado actual) */
  glow?: string;
  className?: string;
  clock?: string;
}

/** Mockup de teléfono en acero cepillado con isla dinámica. Tamaño de diseño fijo. */
export function PhoneFrame({ children, glow = "#FFD60A", className, clock = "10:07" }: PhoneFrameProps) {
  return (
    <div
      className={className}
      style={
        {
          width: PHONE_W,
          height: PHONE_H,
          "--glow": glow,
        } as CSSProperties
      }
    >
      <div
        aria-hidden
        className="absolute -inset-8 -z-10 rounded-[64px] opacity-40 blur-3xl transition-colors duration-700"
        style={{ background: `radial-gradient(circle, ${glow}55, transparent 65%)` }}
      />
      {/* Chasis */}
      <div className="brushed relative h-full w-full rounded-[46px] p-[5px] shadow-[0_40px_90px_-30px_rgba(0,0,0,0.95),inset_0_0_0_1.5px_rgba(255,255,255,0.65)]">
        <span aria-hidden className="absolute -left-[3px] top-24 h-10 w-[3px] rounded-l bg-titanium-400" />
        <span aria-hidden className="absolute -left-[3px] top-40 h-14 w-[3px] rounded-l bg-titanium-400" />
        <span aria-hidden className="absolute -right-[3px] top-32 h-16 w-[3px] rounded-r bg-titanium-400" />
        {/* Pantalla */}
        <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[41px] bg-obsidian">
          <div className="absolute left-1/2 top-2.5 z-20 h-[22px] w-[86px] -translate-x-1/2 rounded-full bg-black" />
          {/* Barra de estado */}
          <div className="relative z-10 flex h-10 shrink-0 items-end justify-between px-7 pb-1 text-[11px] font-semibold text-ink">
            <span className="font-mono">{clock}</span>
            <span className="flex items-center gap-1 text-ink-muted">
              <Signal className="h-3 w-3" aria-hidden />
              <Wifi className="h-3 w-3" aria-hidden />
              <BatteryFull className="h-3.5 w-3.5" aria-hidden />
            </span>
          </div>
          {/* Encabezado de la app */}
          <div className="relative z-10 flex shrink-0 items-center gap-2 px-4 pb-2 pt-1">
            <Logo variant="emblem" sizes="48px" className="h-7 w-auto" />
            <div className="leading-none">
              <p className="font-title text-titanium text-[13px]">Chambi Live</p>
              <p className="font-mono text-[9px] tracking-widest text-ink-dim">ABC-123 · OT-2481</p>
            </div>
            <span className="relative ml-auto flex h-2 w-2">
              <span className="absolute inline-flex h-2 w-2 animate-pulse-ring rounded-full bg-st-ready" />
              <span className="relative h-2 w-2 rounded-full bg-st-ready" />
            </span>
          </div>
          <div className="relative min-h-0 flex-1">{children}</div>
          <div aria-hidden className="mx-auto mb-2 mt-1 h-1 w-24 shrink-0 rounded-full bg-white/30" />
        </div>
      </div>
    </div>
  );
}
