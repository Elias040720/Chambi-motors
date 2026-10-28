"use client";

import { motion } from "framer-motion";
import { useWorkshop } from "@/store/workshop";
import { cx } from "@/lib/utils";
import { STATUS_META } from "@/lib/status";

/** Selector de vehículo de prueba compartido por los capítulos 3 y 4. */
export function VehicleSwitcher({ className, id }: { className?: string; id: string }) {
  const { vehicles, active, selectPlate } = useWorkshop();

  return (
    <div
      role="radiogroup"
      aria-label="Vehículo de demostración"
      className={cx("flex flex-wrap items-center gap-2", className)}
    >
      <span className="font-label mr-1 text-[11px] text-ink-dim">Vehículo demo</span>
      {vehicles.map((v) => {
        const selected = v.plate === active.plate;
        return (
          <button
            key={v.plate}
            id={`${id}-${v.plate}`}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => selectPlate(v.plate)}
            className={cx(
              "relative flex items-center gap-2 rounded-xl border px-3 py-2 text-left transition-colors",
              selected
                ? "border-racing/60 bg-racing/10 text-ink"
                : "border-steel-line/40 bg-graphite/60 text-ink-muted hover:border-titanium-400/60 hover:text-ink",
            )}
          >
            {selected && (
              <motion.span
                layoutId={`${id}-pill`}
                className="absolute inset-0 rounded-xl ring-1 ring-racing/70"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <span
              className="relative h-2 w-2 rounded-full"
              style={{ background: STATUS_META[v.status].color }}
              aria-hidden
            />
            <span className="relative font-mono text-xs font-semibold tracking-wider">
              {v.plate}
            </span>
            <span className="relative hidden text-xs sm:inline">{v.model.split(" ")[0]}</span>
          </button>
        );
      })}
    </div>
  );
}
