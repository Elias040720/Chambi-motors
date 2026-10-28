export type VehicleStatus =
  | "diagnostico"
  | "esperando_repuesto"
  | "reparacion"
  | "listo";

export type VehicleKind = "combi" | "auto" | "camioneta";

export type Urgency = "alta" | "media" | "baja";

export type PartResolutionMode = "client" | "chambi";

export interface Mechanic {
  name: string;
  role: string;
  initials: string;
}

export interface QuoteLine {
  label: string;
  amount: number;
}

export interface PartRequest {
  id: string;
  name: string;
  spec: string;
  image: string;
  mechanicNote: string;
  voiceNoteSeconds: number;
  urgency: Urgency;
  quote: QuoteLine[];
  /** Hora estimada de entrega si el cliente lo trae */
  clientDeadline: string;
  /** Hora estimada de entrega si lo compra Chambi */
  chambiEta: string;
  resolution: null | { mode: PartResolutionMode; time: string };
}

export type EventTone = "info" | "alert" | "progress" | "success";

export interface LiveEvent {
  id: string;
  /** Etiqueta HH:MM ya formateada (evita desajustes de hidratación) */
  time: string;
  tone: EventTone;
  title: string;
  detail: string;
  source: "mecanico" | "cliente" | "sistema";
}

export interface ProgressPhoto {
  id: string;
  src: string;
  caption: string;
  time: string;
  /** background-position para simular distintos encuadres */
  focus: string;
  zoom: number;
}

export interface Vehicle {
  plate: string;
  orderCode: string;
  make: string;
  model: string;
  year: number;
  kind: VehicleKind;
  color: string;
  owner: string;
  photo: string;
  service: string;
  status: VehicleStatus;
  progress: number;
  mechanic: Mechanic;
  eta: string;
  intakeAt: string;
  photos: ProgressPhoto[];
  events: LiveEvent[];
  part: PartRequest | null;
  /** Plantilla para la siguiente solicitud de repuesto del mecánico */
  partTemplate: Omit<PartRequest, "resolution">;
  /** Última vez que el estado cambió (para animaciones de sincronización) */
  syncTick: number;
}

export interface TimelineStage {
  id: string;
  index: number;
  title: string;
  short: string;
  description: string;
  status: VehicleStatus;
  notification: { title: string; body: string; time: string };
  metric: { label: string; value: string };
}
