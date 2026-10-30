import { CircleCheck, Package, Search, Wrench } from "lucide-react";
import type { CSSProperties } from "react";
import { STATUS_META } from "@/lib/status";
import type { VehicleStatus } from "@/lib/types";
import { cx } from "@/lib/utils";

const ICONS = {
  search: Search,
  package: Package,
  wrench: Wrench,
  check: CircleCheck,
} as const;

interface StatusBadgeProps {
  status: VehicleStatus;
  /** Usa el texto alterno (“Pausado por Repuesto”) cuando existe */
  useAlt?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function StatusBadge({ status, useAlt, size = "md", className }: StatusBadgeProps) {
  const meta = STATUS_META[status];
  const Icon = ICONS[meta.icon];
  const label = useAlt && meta.alt ? meta.alt : meta.label;
  const style = {
    "--st": meta.color,
    "--st-rgb": meta.rgb,
  } as CSSProperties;

  return (
    <span
      style={style}
      className={cx(
        "relative inline-flex items-center gap-2 rounded-full border font-semibold whitespace-nowrap",
        "border-[rgb(var(--st-rgb)/0.45)] bg-[rgb(var(--st-rgb)/0.12)] text-[var(--st)]",
        size === "sm" && "px-2.5 py-1 text-[11px]",
        size === "md" && "px-3 py-1.5 text-xs",
        size === "lg" && "px-4 py-2 text-sm",
        className,
      )}
    >
      <span className="relative flex h-2 w-2 items-center justify-center">
        {meta.pulse && (
          <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-[var(--st)]" />
        )}
        <span className="relative h-2 w-2 rounded-full bg-[var(--st)]" />
      </span>
      <Icon className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} aria-hidden />
      {label}
    </span>
  );
}
