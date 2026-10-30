export type Vehicle = {
  id: string;
  plate: string;
  make: string;
  model: string;
  year?: number | null;
  color?: string | null;
  vin?: string | null;
  mileage?: number;
};
export type Customer = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  vehicles?: Vehicle[];
};
export type Blocker = { id: string; kind: string; reason: string };
export type Order = {
  id: string;
  code: string;
  status: string;
  version: number;
  concern: string;
  customer_name: string;
  plate: string;
  make: string;
  model: string;
  progress?: number;
  blockers?: Blocker[];
  created_at?: string;
  updated_at?: string;
  eta_from?: string;
  eta_to?: string;
  eta_confidence?: string;
  phone?: string;
  internal_notes?: string;
  public_notes?: string;
  delivery_summary?: string;
  warranty?: string;
};
export type Task = {
  id: string;
  title: string;
  weight: number;
  completed_at?: string;
  visible_to_customer: boolean;
  requires_evidence?: boolean;
  quote_id?: string;
  priority?: "alta" | "media" | "baja";
  depends_on?: string | null;
};
export type QuoteLine = {
  description: string;
  kind: "trabajo" | "repuesto";
  quantity: number | string;
  unit_price: number | string;
};
export type Quote = {
  id: string;
  version: number;
  status: string;
  expires_at?: string;
  total: number | string;
  lines: QuoteLine[];
  decision?: { channel: string; evidence?: string };
};
export type Part = {
  id: string;
  description: string;
  status: string;
  resolution: string;
  urgency: string;
  promised_at?: string;
  provider?: string;
};
export type Media = {
  id: string;
  category: string;
  caption?: string;
  visible_to_customer: boolean;
};
export type Event = {
  id: string;
  event_type: string;
  reason?: string;
  to_status?: string;
  created_at: string;
};
export type DiagnosisRevision = {
  id: string;
  revision: number;
  kind: "preliminary" | "confirmed" | "correction";
  effective_kind: "preliminary" | "confirmed";
  supersedes_id: string | null;
  internal_notes: string;
  public_summary: string;
  evidence_ids: string[];
  author_id: string;
  published_at: string | null;
  created_at: string;
};
export type WorkOrderContact = {
  id: string;
  name: string;
  phone_e164: string;
  relation_type: "client" | "representative";
  can_view_progress: boolean;
  can_approve_quote: boolean;
  verified_at: string;
  verified_method: "in_person" | "otp";
  verification_note: string;
  delegation_verified_at: string | null;
  delegation_note: string | null;
  revoked_at: string | null;
  created_at: string;
};
export type Detail = {
  workOrder: Order;
  tasks: Task[];
  quotes: Quote[];
  parts: Part[];
  blockers: Blocker[];
  inspections: {
    id: string;
    passed: boolean;
    note: string;
    items: { title: string; passed: boolean }[];
  }[];
  events: Event[];
  media: Media[];
  diagnoses: DiagnosisRevision[];
  contacts: WorkOrderContact[];
  progress: number;
  history: Order[];
};
export type Config = {
  authMode: "development" | "supabase";
  business: {
    name: string;
    phone?: string;
    hours?: string;
    privacyNotice?: string;
    retentionDays?: number;
    linkDays?: number;
  };
  templates: string[];
};
export type PhotoDraft = { uri: string; mime: string; name: string };
export type IntakeDraft = {
  key: string;
  customerId: string;
  vehicleId?: string;
  newCustomer: boolean;
  name: string;
  phone: string;
  email: string;
  plate: string;
  make: string;
  model: string;
  year: string;
  color: string;
  vin: string;
  mileage: string;
  concern: string;
  fuel: string;
  accessories: string;
  damage: string;
  checklist: string[];
  photo?: PhotoDraft;
  submissionPayload?: string;
  createdOrderId?: string;
  createdOrderCode?: string;
  step: number;
  updatedAt?: string;
};
export const statusNames: Record<string, string> = {
  recepcion: "En recepción",
  diagnostico: "En diagnóstico",
  esperando_aprobacion: "Esperando aprobación",
  reparacion: "En reparación",
  control_calidad: "Control de calidad",
  listo: "Listo para recoger",
  entregado: "Entregado",
  cancelado: "Cancelado",
  esperando_repuesto: "Esperando repuesto",
  pausado: "Pausado",
  esperando_cliente: "Esperando al cliente",
};
export const nextStatuses: Record<string, string[]> = {
  recepcion: ["diagnostico", "cancelado"],
  diagnostico: ["esperando_aprobacion", "reparacion", "cancelado"],
  esperando_aprobacion: ["reparacion", "cancelado"],
  reparacion: ["control_calidad", "cancelado"],
  control_calidad: ["listo", "reparacion", "cancelado"],
  listo: ["reparacion", "cancelado"],
  entregado: [],
  cancelado: [],
};
export const date = (value?: string) =>
  value
    ? new Intl.DateTimeFormat("es-PE", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "America/Lima",
      }).format(new Date(value))
    : "No disponible";
export const money = (value: number | string) =>
  new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(Number(value));

export function orderedTasks(tasks: Task[]): Task[] {
  const priority = { alta: 0, media: 1, baja: 2 };
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const seen = new Set<string>();
  const result: Task[] = [];
  function visit(task: Task) {
    if (seen.has(task.id)) return;
    seen.add(task.id);
    const dependency = task.depends_on ? byId.get(task.depends_on) : undefined;
    if (dependency) visit(dependency);
    result.push(task);
  }
  [...tasks]
    .sort((a, b) => priority[a.priority ?? "media"] - priority[b.priority ?? "media"])
    .forEach(visit);
  return result;
}
