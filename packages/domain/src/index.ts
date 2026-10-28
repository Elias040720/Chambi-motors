import { z } from "zod";
export { z };

export const Plate = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9-]{5,10}$/, "Placa no válida");
export const CustomerInput = z.object({
  contactPreference: z.enum(["whatsapp", "phone", "email"]).optional(),
  name: z.string().trim().min(2).max(120),
  phone: z
    .string()
    .trim()
    .regex(/^(?:\+?51)?9\d{8}$/),
  email: z.union([z.string().email().max(254), z.literal("")]).optional(),
});
export const VehicleInput = z.object({
  vin: z.string().trim().toUpperCase().max(32).optional(),
  plate: Plate,
  make: z.string().trim().min(1).max(80),
  model: z.string().trim().min(1).max(80),
  year: z
    .number()
    .int()
    .min(1950)
    .max(new Date().getFullYear() + 1)
    .optional(),
  color: z.string().max(40).optional(),
  mileage: z.number().int().nonnegative().optional(),
});
export const WorkOrderInput = z.object({
  customerId: z.string().uuid(),
  vehicleId: z.string().uuid().optional(),
  concern: z.string().trim().min(3).max(2000),
  mileage: z.number().int().nonnegative().optional(),
});
export const TransitionInput = z.object({
  status: z.enum([
    "recepcion",
    "diagnostico",
    "esperando_aprobacion",
    "reparacion",
    "esperando_repuesto",
    "pausado",
    "esperando_cliente",
    "control_calidad",
    "listo",
    "entregado",
    "cancelado",
  ]),
  reason: z.string().trim().max(500).optional(),
  expectedVersion: z.number().int().positive(),
  idempotencyKey: z.string().uuid(),
});

export type WorkOrderStatus = z.infer<typeof TransitionInput>["status"];
const transitions: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  recepcion: ["diagnostico", "cancelado"],
  diagnostico: [
    "esperando_aprobacion",
    "reparacion",
    "esperando_repuesto",
    "pausado",
    "esperando_cliente",
    "cancelado",
  ],
  esperando_aprobacion: ["reparacion", "cancelado", "pausado"],
  reparacion: [
    "esperando_aprobacion",
    "esperando_repuesto",
    "pausado",
    "esperando_cliente",
    "control_calidad",
    "cancelado",
  ],
  esperando_repuesto: ["reparacion", "pausado", "cancelado"],
  pausado: [
    "diagnostico",
    "reparacion",
    "esperando_aprobacion",
    "esperando_repuesto",
    "esperando_cliente",
    "cancelado",
  ],
  esperando_cliente: ["diagnostico", "reparacion", "esperando_aprobacion", "cancelado"],
  control_calidad: ["listo", "reparacion", "cancelado"],
  listo: ["entregado", "reparacion", "cancelado"],
  entregado: [],
  cancelado: [],
};
export function assertTransition(
  from: WorkOrderStatus,
  to: WorkOrderStatus,
  qaPassed = false,
  reason?: string,
) {
  if (!transitions[from].includes(to)) throw new Error(`Transición no permitida: ${from} → ${to}`);
  if (to === "listo" && !qaPassed) throw new Error("Se requiere control de calidad aprobado");
  if (to === "pausado" && !reason?.trim()) throw new Error("Indica el motivo de la pausa");
}
export function clientStatus(status: WorkOrderStatus) {
  return (
    {
      recepcion: "Vehículo recibido",
      diagnostico: "En diagnóstico",
      esperando_aprobacion: "Esperando tu aprobación",
      reparacion: "En reparación",
      esperando_repuesto: "Esperando un repuesto",
      pausado: "Trabajo pausado",
      esperando_cliente: "Necesitamos contactarte",
      control_calidad: "Control de calidad",
      listo: "Listo para recoger",
      entregado: "Servicio entregado",
      cancelado: "Orden cancelada",
    } satisfies Record<WorkOrderStatus, string>
  )[status];
}

const reason = z.string().trim().min(3).max(1000);
const id = z.string().uuid();
const line = z.object({
  description: reason,
  kind: z.enum(["trabajo", "repuesto"]),
  quantity: z.number().positive().max(10000).multipleOf(0.01),
  unitPrice: z.number().nonnegative().max(1000000).multipleOf(0.01),
});
export const ActionInput = z.intersection(
  z.object({ expectedVersion: z.number().int().positive(), idempotencyKey: id }),
  z.discriminatedUnion("action", [
    z.object({
      action: z.literal("task.add"),
      title: reason,
      weight: z.number().int().min(1).max(10).default(1),
      visibleToCustomer: z.boolean().default(false),
      requiresEvidence: z.boolean().default(false),
      quoteId: id.optional(),
      priority: z.enum(["alta", "media", "baja"]).default("media"),
      dependsOn: id.optional(),
    }),
    z.object({
      action: z.literal("task.complete"),
      taskId: id,
      completed: z.boolean(),
      evidence: z.string().trim().max(1000).optional(),
    }),
    z.object({
      action: z.literal("note"),
      internalNotes: z.string().max(5000),
      publicNotes: z.string().max(2000),
    }),
    z.object({
      action: z.literal("eta"),
      from: z.string().datetime({ offset: true }).optional(),
      to: z.string().datetime({ offset: true }).optional(),
      confidence: z.enum(["tentativa", "confirmada", "no_disponible"]),
      reason,
    }),
    z.object({
      action: z.literal("blocker.add"),
      kind: z.enum(["esperando_repuesto", "pausado", "esperando_cliente"]),
      reason,
    }),
    z.object({ action: z.literal("blocker.resolve"), blockerId: id, reason }),
    z.object({
      action: z.literal("quote.create"),
      lines: z.array(line).min(1).max(40),
      expiresAt: z.string().datetime({ offset: true }).optional(),
    }),
    z.object({
      action: z.literal("quote.decide"),
      quoteId: id,
      decision: z.enum(["aprobado", "rechazado"]),
      channel: z.literal("presencial"),
      evidence: reason,
    }),
    z.object({
      action: z.literal("part.request"),
      description: reason,
      urgency: z.enum(["alta", "media", "baja"]),
      resolution: z.enum(["cliente", "taller"]),
      provider: z.string().max(200).optional(),
      promisedAt: z.string().datetime({ offset: true }).optional(),
    }),
    z.object({
      action: z.literal("part.promise"),
      partId: id,
      resolution: z.enum(["cliente", "taller"]),
      promisedAt: z.string().datetime({ offset: true }).optional(),
    }),
    z.object({
      action: z.literal("part.receive"),
      partId: id,
      accepted: z.boolean(),
      note: reason,
    }),
    z.object({
      action: z.literal("qa"),
      items: z
        .array(z.object({ title: reason, passed: z.boolean() }))
        .min(1)
        .max(30),
      note: reason,
    }),
    z.object({
      action: z.literal("deliver"),
      summary: reason,
      warranty: z.string().trim().min(3).max(2000),
    }),
    z.object({
      action: z.literal("media.visibility"),
      mediaId: id,
      visibleToCustomer: z.boolean(),
    }),
  ]),
);
export type OrderAction = z.infer<typeof ActionInput>;
export function verifiedProgress(tasks: { weight: number; completed_at?: unknown }[]) {
  const total = tasks.reduce((sum, t) => sum + t.weight, 0);
  return total
    ? Math.floor((tasks.reduce((sum, t) => sum + (t.completed_at ? t.weight : 0), 0) * 100) / total)
    : 0;
}
export function quoteTotal(lines: { quantity: number; unitPrice: number }[]) {
  return (
    lines.reduce((total, l) => total + Math.round(l.quantity * Math.round(l.unitPrice * 100)), 0) /
    100
  );
}
export const taskTemplates = [
  "Inspeccionar frenos",
  "Revisar suspensión y dirección",
  "Diagnosticar motor",
  "Cambiar aceite y filtros",
  "Verificar luces y niveles",
];

export function nextOrderStages(status: WorkOrderStatus) {
  return transitions[status].filter(
    (s) => !["esperando_repuesto", "pausado", "esperando_cliente", "entregado"].includes(s),
  );
}
