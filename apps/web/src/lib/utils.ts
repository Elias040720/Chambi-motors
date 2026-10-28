import type { Vehicle, VehicleStatus } from "./types";

export const cx = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(" ");

export const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));

/** Normaliza lo que escribe el usuario: mayúsculas, sin símbolos. */
export const normalizePlate = (raw: string) =>
  raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);

/** Formato peruano: ABC-123 */
export const formatPlate = (raw: string) => {
  const n = normalizePlate(raw);
  return n.length > 3 ? `${n.slice(0, 3)}-${n.slice(3)}` : n;
};

export const formatPEN = (amount: number) =>
  `S/ ${amount.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const clockLabel = (d: Date = new Date()) =>
  d.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", hour12: false });

export const uid = (prefix = "id") =>
  `${prefix}-${Math.random().toString(36).slice(2, 8)}`;

/** Etapa del timeline (0‑4) que corresponde al estado real del vehículo. */
export const stageIndexOf = (v: Pick<Vehicle, "status" | "progress">): number => {
  switch (v.status) {
    case "diagnostico":
      return v.progress < 14 ? 0 : 1;
    case "esperando_repuesto":
      return 1;
    case "reparacion":
      return v.progress < 86 ? 2 : 3;
    case "listo":
      return 4;
  }
};

export const statusOrder: VehicleStatus[] = [
  "diagnostico",
  "esperando_repuesto",
  "reparacion",
  "listo",
];
