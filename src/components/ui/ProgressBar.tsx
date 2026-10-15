"use client";

import { motion } from "framer-motion";
import type { CSSProperties } from "react";
import { cx } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  color?: string;
  className?: string;
  height?: string;
  label?: string;
}

/** Barra de avance animada con transform (GPU) y trazo de “brillo” viajando. */
export function ProgressBar({
  value,
  color = "#FFD60A",
  className,
  height = "h-2.5",
  label = "Avance del vehículo",
}: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      className={cx("relative w-full overflow-hidden rounded-full bg-white/10", height, className)}
      style={{ "--bar": color } as CSSProperties}
    >
      <motion.div
        className="absolute inset-0 origin-left rounded-full"
        style={{
          background: `linear-gradient(90deg, color-mix(in srgb, ${color} 55%, #000), ${color})`,
          boxShadow: `0 0 14px ${color}88`,
        }}
        initial={false}
        animate={{ scaleX: pct / 100 }}
        transition={{ type: "spring", stiffness: 90, damping: 20 }}
      >
        <span className="absolute inset-y-0 left-0 w-1/3 animate-sheen bg-gradient-to-r from-transparent via-white/45 to-transparent" />
      </motion.div>
    </div>
  );
}
