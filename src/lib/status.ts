import type { VehicleStatus } from "./types";

export interface StatusMeta {
  label: string;
  /** Texto cuando el vehículo está detenido por falta de repuesto */
  alt?: string;
  color: string;
  /** rgb sin comas para usar en rgb(r g b / a) */
  rgb: string;
  icon: "search" | "package" | "wrench" | "check";
  pulse: boolean;
}

export const STATUS_META: Record<VehicleStatus, StatusMeta> = {
  diagnostico: {
    label: "En Diagnóstico / Revisión",
    color: "#38BDF8",
    rgb: "56 189 248",
    icon: "search",
    pulse: false,
  },
  esperando_repuesto: {
    label: "Esperando Repuesto",
    alt: "Pausado por Repuesto",
    color: "#F59E0B",
    rgb: "245 158 11",
    icon: "package",
    pulse: true,
  },
  reparacion: {
    label: "En Reparación Activa",
    color: "#FFD60A",
    rgb: "255 214 10",
    icon: "wrench",
    pulse: false,
  },
  listo: {
    label: "Listo para Entrega",
    color: "#10B981",
    rgb: "16 185 129",
    icon: "check",
    pulse: false,
  },
};
