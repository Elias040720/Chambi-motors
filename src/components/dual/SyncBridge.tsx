"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Radio } from "lucide-react";
import { cx } from "@/lib/utils";

interface SyncBridgeProps {
  /** Se incrementa con cada evento para relanzar el paquete animado */
  pulse: number;
  /** Sentido del último paquete respecto al orden visual de los paneles */
  forward: boolean;
  latency: number;
}

/**
 * Puente visual “WebSocket” entre el panel del mecánico y el del cliente.
 * El paquete viaja con translate (GPU): un wrapper del tamaño de la pista
 * se desplaza ±100% con el “punto” pegado al borde delantero.
 */
export function SyncBridge({ pulse, forward, latency }: SyncBridgeProps) {
  const reduce = useReducedMotion();
  const show = pulse > 0 && !reduce;

  return (
    <div
      aria-hidden
      className="relative flex shrink-0 flex-row items-center justify-center gap-3 py-1 lg:w-28 lg:flex-col lg:py-0"
    >
      {/* Pista vertical (móvil) */}
      <div className="relative h-14 w-px overflow-hidden bg-gradient-to-b from-transparent via-steel-line to-transparent lg:hidden">
        {show && (
          <motion.div
            key={`v-${pulse}`}
            className={cx("absolute inset-0 flex justify-center", forward ? "items-end" : "items-start")}
            initial={{ y: forward ? "-100%" : "100%" }}
            animate={{ y: forward ? "100%" : "-100%" }}
            transition={{ duration: 0.9, ease: "easeInOut" }}
          >
            <span className="h-6 w-1 rounded-full bg-racing shadow-[0_0_12px_#FFD60A]" />
          </motion.div>
        )}
      </div>

      <div className="flex flex-col items-center gap-1.5">
        <span
          className={cx(
            "grid h-12 w-12 place-items-center rounded-full border transition-colors duration-500",
            pulse > 0 ? "border-racing/60 bg-racing/10 text-racing" : "border-steel-line/50 bg-graphite text-ink-muted",
          )}
        >
          <Radio className="h-5 w-5" />
        </span>
        <span className="font-mono text-[10px] tracking-widest text-ink-muted">WS · {latency} ms</span>
      </div>

      {/* Pista horizontal (escritorio) */}
      <div className="relative hidden h-px w-full overflow-hidden bg-gradient-to-r from-transparent via-steel-line to-transparent lg:block">
        {show && (
          <motion.div
            key={`h-${pulse}`}
            className={cx("absolute inset-0 flex items-center", forward ? "justify-end" : "justify-start")}
            initial={{ x: forward ? "-100%" : "100%" }}
            animate={{ x: forward ? "100%" : "-100%" }}
            transition={{ duration: 0.9, ease: "easeInOut" }}
          >
            <span className="h-1 w-8 rounded-full bg-racing shadow-[0_0_12px_#FFD60A]" />
          </motion.div>
        )}
      </div>
    </div>
  );
}
