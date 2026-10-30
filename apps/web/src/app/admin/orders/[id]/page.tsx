"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { clientStatus, nextOrderStages, taskTemplates, type WorkOrderStatus } from "@chambi/domain";
type Task = {
  priority: string;
  depends_on: string | null;
  id: string;
  title: string;
  weight: number;
  completed_at: string | null;
  requires_evidence: boolean;
};
type Quote = {
  id: string;
  version: number;
  status: string;
  total: number;
  lines: { description: string; quantity: number; unit_price: number }[];
  decision: { channel: string; evidence: string } | null;
};
type Part = {
  id: string;
  description: string;
  status: string;
  resolution: string;
  promised_at: string | null;
};
type DiagnosisRevision = {
  id: string;
  revision: number;
  kind: "preliminary" | "confirmed" | "correction";
  effective_kind: "preliminary" | "confirmed";
  supersedes_id: string | null;
  internal_notes: string;
  public_summary: string;
  evidence_ids: string[];
  published_at: string | null;
  created_at: string;
};
type OrderContact = {
  id: string;
  name: string;
  phone_e164: string;
  relation_type: "client" | "representative";
  can_view_progress: boolean;
  can_approve_quote: boolean;
  verified_at: string;
  verification_note: string;
  delegation_note: string | null;
  revoked_at: string | null;
};
type Detail = {
  workOrder: {
    id: string;
    code: string;
    status: WorkOrderStatus;
    version: number;
    plate: string;
    make: string;
    model: string;
    concern: string;
    customer_name: string;
    phone: string;
    internal_notes: string;
    public_notes: string;
    eta_from: string | null;
    eta_to: string | null;
    delivery_summary: string | null;
    warranty: string | null;
  };
  tasks: Task[];
  quotes: Quote[];
  parts: Part[];
  blockers: { id: string; kind: string; reason: string }[];
  inspections: { id: string; passed: boolean; note: string; created_at: string }[];
  events: {
    id: string;
    event_type: string;
    to_status: WorkOrderStatus;
    reason: string | null;
    created_at: string;
  }[];
  media: { id: string; category: string; caption: string | null; visible_to_customer: boolean }[];
  progress: number;
  history: { id: string; code: string; status: WorkOrderStatus }[];
  diagnoses: DiagnosisRevision[];
  contacts: OrderContact[];
};
const card = "rounded-2xl border border-white/10 bg-graphite p-5";
const button = "min-h-11 rounded-lg border border-white/25 px-4 py-2 disabled:opacity-50";
const input = "mt-1 w-full rounded-lg border border-white/15 bg-carbon p-3";
const money = (n: number) =>
  new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(n);
function Field({
  label,
  name,
  type = "text",
  required = true,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <label className="block text-sm">
      {label}
      <input
        className={input}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        step={type === "number" ? "0.01" : undefined}
      />
    </label>
  );
}
export default function OrderDetail() {
  const { id } = useParams<{ id: string }>(),
    router = useRouter();
  const [data, setData] = useState<Detail | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [tab, setTab] = useState("Resumen"),
    [share, setShare] = useState(""),
    [pending, setPending] = useState<{ path: string; body: Record<string, unknown> } | null>(null);
  async function load() {
    const r = await fetch(`/api/v1/admin/work-orders/${id}`, { cache: "no-store" });
    if (r.status === 401) {
      router.push("/admin");
      return;
    }
    const j = await r.json();
    if (!r.ok) throw new Error(j.error);
    setData(j);
  }
  useEffect(() => {
    void load().catch((e) => setError(e.message));
  }, [id]);
  async function transmit(job: { path: string; body: Record<string, unknown> }) {
    setBusy(true);
    setError("");
    setPending(job);
    try {
      const r = await fetch(job.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(job.body),
      });
      const j = await r.json();
      if (!r.ok) {
        if (r.status < 500) setPending(null);
        if (r.status === 409) await load();
        throw new Error(j.error);
      }
      setPending(null);
      await load();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Respuesta no confirmada; reintenta la misma solicitud.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function action(payload: Record<string, unknown>) {
    if (!data || pending) return;
    await transmit({
      path: `/api/v1/admin/work-orders/${id}/actions`,
      body: {
        ...payload,
        expectedVersion: data.workOrder.version,
        idempotencyKey: crypto.randomUUID(),
      },
    });
  }
  async function transition(f: FormData) {
    if (!data) return;
    await transmit({
      path: `/api/v1/admin/work-orders/${id}/transition`,
      body: {
        status: f.get("status"),
        reason: f.get("reason") || undefined,
        expectedVersion: data.workOrder.version,
        idempotencyKey: crypto.randomUUID(),
      },
    });
  }
  async function saveDiagnosis(form: FormData) {
    if (!data) return;
    await transmit({
      path: `/api/v1/admin/work-orders/${id}/diagnoses`,
      body: {
        expectedVersion: data.workOrder.version,
        kind: form.get("kind"),
        supersedesId: form.get("supersedesId") || undefined,
        internalNotes: form.get("internalNotes"),
        publicSummary: form.get("publicSummary"),
        evidenceIds: form.getAll("evidenceIds"),
        publish: form.get("publish") === "on",
      },
    });
  }
  async function saveContact(form: FormData) {
    await transmit({
      path: `/api/v1/admin/work-orders/${id}/contacts`,
      body: {
        name: form.get("name"),
        phone: form.get("phone"),
        relationType: form.get("relationType"),
        canViewProgress: form.get("canViewProgress") === "on",
        canApproveQuote: form.get("canApproveQuote") === "on",
        verifiedInPerson: form.get("verifiedInPerson") === "on",
        verificationNote: form.get("verificationNote"),
        delegationNote: form.get("delegationNote") || undefined,
      },
    });
  }
  async function revokeContact(contactId: string) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/v1/admin/work-orders/${id}/contacts/${contactId}`, {
        method: "DELETE",
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo revocar el contacto.");
    } finally {
      setBusy(false);
    }
  }
  async function shareLink() {
    setError("");
    try {
      const r = await fetch(`/api/v1/admin/work-orders/${id}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setShare(j.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo generar el enlace");
    }
  }
  async function upload(form: FormData) {
    setBusy(true);
    setError("");
    form.set("idempotencyKey", crypto.randomUUID());
    try {
      const r = await fetch(`/api/v1/admin/work-orders/${id}/media`, {
        method: "POST",
        body: form,
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir la foto");
    } finally {
      setBusy(false);
    }
  }
  if (!data)
    return (
      <main className="mx-auto max-w-3xl p-6 text-ink">
        <Link href="/admin" className="text-racing">
          Volver al taller
        </Link>
        <p role="status" className="mt-8">
          {error || "Cargando orden…"}
        </p>
      </main>
    );
  const w = data.workOrder,
    closed = ["entregado", "cancelado"].includes(w.status);
  const submit = (label: string, disabled = false) => (
    <button
      disabled={disabled}
      className="min-h-12 rounded-lg bg-racing px-5 font-semibold text-black disabled:opacity-50"
      type="submit"
    >
      {label}
    </button>
  );
  return (
    <main className="mx-auto max-w-4xl space-y-5 px-5 py-8 text-ink">
      <Link href="/admin" className="inline-flex min-h-11 items-center text-racing">
        ← Órdenes de trabajo
      </Link>
      <header>
        <p className="text-sm text-ink-muted">{w.code}</p>
        <h1 className="mt-2 text-3xl font-bold">
          {w.plate} · {w.make} {w.model}
        </h1>
        <p className="mt-2">
          {w.customer_name} ·{" "}
          <a href={`tel:${w.phone}`} className="underline">
            {w.phone}
          </a>
        </p>
        <p className="mt-3 text-racing">
          {clientStatus(w.status)} · Tareas verificadas: {data.progress}%
        </p>
        <p className="mt-2 text-sm text-ink-muted">
          Versión {w.version} · {w.concern}
        </p>
      </header>
      {error && (
        <p role="alert" className="rounded-lg border border-red-400/40 p-4 text-red-200">
          {error}
        </p>
      )}
      {pending && (
        <aside className={card}>
          <p>
            La solicitud aún no está confirmada. Reintenta con la misma clave para evitar
            duplicados.
          </p>
          <button
            disabled={busy}
            className={`${button} mt-3`}
            onClick={() => void transmit(pending)}
          >
            Reintentar solicitud pendiente
          </button>
        </aside>
      )}
      <nav className="flex flex-wrap gap-2" aria-label="Secciones de la orden">
        {[
          "Resumen",
          "Diagnóstico",
          "Contactos",
          "Tareas",
          "Presupuesto",
          "Repuestos",
          "QA y entrega",
          "Fotos",
          "Historial",
        ].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            aria-pressed={tab === t}
            className={`${button} ${tab === t ? "bg-racing text-black" : ""}`}
          >
            {t}
          </button>
        ))}
      </nav>
      <fieldset
        disabled={busy || !!pending || closed}
        className="min-w-0 space-y-5 disabled:opacity-75"
      >
        {tab === "Diagnóstico" && (
          <>
            <section className={card}>
              <h2 className="text-xl font-semibold">Nueva revisión de diagnóstico</h2>
              <p className="mt-2 text-sm text-ink-muted">
                La evaluación inicial se muestra como pendiente de confirmar. Las correcciones
                conservan la revisión anterior.
              </p>
              <form action={saveDiagnosis} className="mt-4 space-y-3">
                <label className="block text-sm">
                  Tipo
                  <select className={input} name="kind">
                    <option value="preliminary">Evaluación preliminar</option>
                    <option value="confirmed">Diagnóstico confirmado</option>
                    <option value="correction">Corrección</option>
                  </select>
                </label>
                <label className="block text-sm">
                  Revisión que corriges (solo para corrección)
                  <select className={input} name="supersedesId" defaultValue="">
                    <option value="">Selecciona la revisión vigente</option>
                    {data.diagnoses.map((diagnosis) => (
                      <option key={diagnosis.id} value={diagnosis.id}>
                        Revisión {diagnosis.revision} ·{" "}
                        {diagnosis.effective_kind === "preliminary" ? "Preliminar" : "Confirmada"}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  Notas internas y motivo de corrección
                  <textarea className={input} name="internalNotes" maxLength={4000} />
                </label>
                <label className="block text-sm">
                  Resumen para el cliente
                  <textarea className={input} name="publicSummary" maxLength={1200} />
                </label>
                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium">Evidencia asociada a esta orden</legend>
                  {data.media.length === 0 ? (
                    <p className="text-sm text-ink-muted">
                      Carga una fotografía en la sección Fotos.
                    </p>
                  ) : (
                    data.media.map((asset) => (
                      <label key={asset.id} className="flex min-h-11 items-center gap-3 text-sm">
                        <input type="checkbox" name="evidenceIds" value={asset.id} />
                        {asset.category} · {asset.caption ?? "Foto"} ·{" "}
                        {asset.visible_to_customer ? "visible" : "privada"}
                      </label>
                    ))
                  )}
                </fieldset>
                <label className="flex min-h-11 items-center gap-3 text-sm">
                  <input type="checkbox" name="publish" /> Publicar el resumen en el portal
                </label>
                {submit("Guardar revisión")}
              </form>
            </section>
            <section className={card}>
              <h2 className="text-xl font-semibold">Historial de diagnósticos</h2>
              <ol className="mt-4 space-y-4">
                {data.diagnoses.map((diagnosis) => (
                  <li key={diagnosis.id} className="border-l-2 border-racing/50 pl-4">
                    <p className="font-medium">
                      Revisión {diagnosis.revision} ·{" "}
                      {diagnosis.effective_kind === "preliminary"
                        ? "Evaluación preliminar"
                        : "Diagnóstico confirmado"}
                    </p>
                    <p className="mt-1">
                      {diagnosis.published_at
                        ? diagnosis.public_summary
                        : "Revisión interna, no publicada."}
                    </p>
                    {diagnosis.internal_notes && (
                      <p className="mt-1 text-sm text-ink-muted">
                        Interno: {diagnosis.internal_notes}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-ink-muted">
                      {new Date(diagnosis.created_at).toLocaleString("es-PE", {
                        timeZone: "America/Lima",
                      })}
                    </p>
                  </li>
                ))}
              </ol>
            </section>
          </>
        )}
        {tab === "Contactos" && (
          <>
            <section className={card}>
              <h2 className="text-xl font-semibold">Contactos de esta orden</h2>
              <p className="mt-2 text-sm text-ink-muted">
                Los permisos se aplican solo a esta OT. Cambiar el contacto cliente invalida sus
                enlaces y sesiones anteriores. La autorización de representantes queda registrada,
                pero su aprobación remota aún no está habilitada; usa constancia presencial.
              </p>
              <ul className="mt-4 space-y-3">
                {data.contacts.map((contact) => (
                  <li key={contact.id} className="rounded-xl border border-white/10 p-4">
                    <p className="font-semibold">
                      {contact.name} ·{" "}
                      {contact.relation_type === "client" ? "Cliente" : "Representante"}
                    </p>
                    <p className="mt-1">{contact.phone_e164}</p>
                    <p className="mt-1 text-sm text-ink-muted">
                      {contact.can_view_progress ? "Puede consultar" : "Sin consulta"} ·{" "}
                      {contact.can_approve_quote
                        ? "Autorización registrada; aprobación remota pendiente"
                        : "No puede aprobar cotizaciones"}
                    </p>
                    <p className="mt-1 text-sm text-ink-muted">
                      Verificado en recepción: {contact.verification_note}
                    </p>
                    {contact.delegation_note && (
                      <p className="mt-1 text-sm text-ink-muted">
                        Delegación: {contact.delegation_note}
                      </p>
                    )}
                    {contact.revoked_at ? (
                      <p className="mt-2 text-sm text-red-200">Revocado</p>
                    ) : (
                      <button
                        type="button"
                        className={`${button} mt-3`}
                        disabled={busy}
                        onClick={() => void revokeContact(contact.id)}
                      >
                        Revocar acceso
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
            <section className={card}>
              <h2 className="text-xl font-semibold">Registrar contacto verificado</h2>
              <form action={saveContact} className="mt-4 space-y-3">
                <Field name="name" label="Nombre" />
                <Field name="phone" label="Teléfono verificado (+519XXXXXXXX)" />
                <label className="block text-sm">
                  Relación
                  <select className={input} name="relationType">
                    <option value="client">Cliente</option>
                    <option value="representative">Representante</option>
                  </select>
                </label>
                <label className="flex min-h-11 items-center gap-3 text-sm">
                  <input type="checkbox" name="canViewProgress" defaultChecked /> Puede consultar el
                  seguimiento
                </label>
                <label className="flex min-h-11 items-center gap-3 text-sm">
                  <input type="checkbox" name="canApproveQuote" /> Registrar autorización para
                  presupuesto (flujo remoto pendiente)
                </label>
                <label className="block text-sm">
                  Cómo se verificó identidad y teléfono
                  <textarea
                    className={input}
                    name="verificationNote"
                    minLength={3}
                    maxLength={500}
                    required
                  />
                </label>
                <label className="block text-sm">
                  Delegación para aprobar (obligatoria si es representante autorizante)
                  <textarea className={input} name="delegationNote" maxLength={500} />
                </label>
                <label className="flex min-h-11 items-center gap-3 text-sm">
                  <input type="checkbox" name="verifiedInPerson" required /> Confirmo que comprobé
                  presencialmente identidad y teléfono
                </label>
                {submit("Registrar en esta orden")}
              </form>
            </section>
          </>
        )}
        {tab === "Resumen" && (
          <>
            <section className={card}>
              <h2 className="text-xl font-semibold">Etapa del servicio</h2>
              <form action={transition} className="mt-4 space-y-3">
                <label className="block">
                  Siguiente etapa
                  <select
                    name="status"
                    className={input}
                    key={w.status}
                    defaultValue={nextOrderStages(w.status)[0]}
                  >
                    {nextOrderStages(w.status).map((s) => (
                      <option key={s} value={s}>
                        {clientStatus(s as WorkOrderStatus)}
                      </option>
                    ))}
                  </select>
                </label>
                <Field
                  name="reason"
                  label="Motivo (obligatorio al cancelar/retrabajar)"
                  required={false}
                />
                {submit("Confirmar etapa")}
              </form>
            </section>
            <section className={card}>
              <h2 className="text-xl font-semibold">Notas separadas por privacidad</h2>
              <form
                action={(f) =>
                  action({
                    action: "note",
                    internalNotes: f.get("internal"),
                    publicNotes: f.get("public"),
                  })
                }
                className="mt-4 space-y-3"
              >
                <label className="block">
                  Nota interna
                  <textarea className={input} name="internal" defaultValue={w.internal_notes} />
                </label>
                <label className="block">
                  Mensaje visible para el cliente
                  <textarea className={input} name="public" defaultValue={w.public_notes} />
                </label>
                {submit("Guardar notas")}
              </form>
            </section>
            <section className={card}>
              <h2 className="text-xl font-semibold">Entrega estimada</h2>
              <form
                action={(f) =>
                  action({
                    action: "eta",
                    confidence: f.get("confidence"),
                    from: f.get("from") ? new Date(String(f.get("from"))).toISOString() : undefined,
                    to: f.get("to") ? new Date(String(f.get("to"))).toISOString() : undefined,
                    reason: f.get("reason"),
                  })
                }
                className="mt-4 space-y-3"
              >
                <p className="text-sm text-ink-muted">
                  Las fechas se ingresan en la zona horaria de este dispositivo.
                </p>
                <Field name="from" type="datetime-local" label="Desde" required={false} />
                <Field name="to" type="datetime-local" label="Hasta" required={false} />
                <label>
                  Confianza
                  <select className={input} name="confidence">
                    <option value="tentativa">Tentativa</option>
                    <option value="confirmada">Confirmada</option>
                    <option value="no_disponible">Por confirmar</option>
                  </select>
                </label>
                <Field name="reason" label="Motivo de la estimación o cambio" />
                {submit("Guardar ETA y motivo")}
              </form>
            </section>
            <section className={card}>
              <h2 className="text-xl font-semibold">Bloqueos paralelos</h2>
              {data.blockers.map((b) => (
                <form
                  key={b.id}
                  action={(f) =>
                    action({ action: "blocker.resolve", blockerId: b.id, reason: f.get("reason") })
                  }
                  className="mt-4 space-y-3 border-t border-white/10 pt-4"
                >
                  <p>{b.reason}</p>
                  <Field name="reason" label="Motivo de resolución" />
                  {submit("Resolver bloqueo")}
                </form>
              ))}
              <form
                action={(f) =>
                  action({ action: "blocker.add", kind: f.get("kind"), reason: f.get("reason") })
                }
                className="mt-4 space-y-3"
              >
                <label>
                  Tipo
                  <select name="kind" className={input}>
                    <option value="pausado">Pausado</option>
                    <option value="esperando_cliente">Esperando al cliente</option>
                    <option value="esperando_repuesto">Esperando repuesto</option>
                  </select>
                </label>
                <Field name="reason" label="Motivo visible para el cliente" />
                {submit("Registrar bloqueo")}
              </form>
            </section>
          </>
        )}
        {tab === "Tareas" && (
          <section className={card}>
            <h2 className="text-xl font-semibold">Tareas verificables</h2>
            {data.tasks.map((t) => (
              <form
                key={t.id}
                action={(f) =>
                  action({
                    action: "task.complete",
                    taskId: t.id,
                    completed: !t.completed_at,
                    evidence: f.get("evidence") || undefined,
                  })
                }
                className="mt-4 space-y-3 border-b border-white/10 pb-4"
              >
                <p>
                  {t.completed_at ? "✓" : "○"} {t.title} · Peso {t.weight}
                </p>
                <Field
                  name="evidence"
                  label="Evidencia del trabajo"
                  required={t.requires_evidence && !t.completed_at}
                />
                {submit(
                  t.completed_at ? "Reabrir tarea" : "Completar tarea",
                  w.status !== "reparacion",
                )}
              </form>
            ))}
            <form
              action={(f) =>
                action({
                  action: "task.add",
                  title: f.get("title"),
                  weight: Number(f.get("weight")),
                  visibleToCustomer: f.get("visible") === "on",
                  requiresEvidence: f.get("evidence") === "on",
                  quoteId: f.get("quote") || undefined,
                  priority: f.get("priority"),
                  dependsOn: f.get("dependency") || undefined,
                })
              }
              className="mt-5 space-y-3"
            >
              <label>
                Título
                <input name="title" required list="task-templates" className={input} />
                <datalist id="task-templates">
                  {taskTemplates.map((t) => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
              </label>
              <Field name="weight" type="number" label="Peso (1 a 10)" defaultValue="1" />
              <label>
                Prioridad
                <select name="priority" defaultValue="media" className={input}>
                  <option value="alta">Alta</option>
                  <option value="media">Media</option>
                  <option value="baja">Baja</option>
                </select>
              </label>
              <label>
                Tarea previa
                <select name="dependency" className={input}>
                  <option value="">Sin dependencia</option>
                  {data.tasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Presupuesto asociado
                <select name="quote" className={input}>
                  <option value="">Sin costo adicional</option>
                  {data.quotes.map((q) => (
                    <option key={q.id} value={q.id}>
                      V{q.version} · {q.status}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <input type="checkbox" name="visible" /> Visible para el cliente
              </label>
              <label className="block">
                <input type="checkbox" name="evidence" /> Requiere evidencia
              </label>
              {submit("Agregar tarea")}
            </form>
          </section>
        )}
        {tab === "Presupuesto" && (
          <>
            <section className={card}>
              <h2 className="text-xl font-semibold">Versiones inmutables</h2>
              {data.quotes.map((q) => (
                <article className="mt-4 border-b border-white/10 pb-5" key={q.id}>
                  <h3>
                    V{q.version} · {q.status} · {money(q.total)}
                  </h3>
                  <ul className="my-3 space-y-2">
                    {q.lines.map((l, i) => (
                      <li key={i}>
                        {l.description} · {l.quantity} × {money(l.unit_price)}
                      </li>
                    ))}
                  </ul>
                  {q.status === "pendiente" && q.id === data.quotes[0]?.id && (
                    <form
                      action={(f) => {
                        if (
                          !window.confirm(
                            "Registrar decisión presencial para esta versión exacta e importes",
                          )
                        )
                          return;
                        return action({
                          action: "quote.decide",
                          quoteId: q.id,
                          decision: f.get("decision"),
                          channel: "presencial",
                          evidence: f.get("evidence"),
                        });
                      }}
                      className="space-y-3"
                    >
                      <Field name="evidence" label="Constancia de aprobación/rechazo presencial" />
                      <label>
                        Decisión
                        <select name="decision" className={input}>
                          <option value="aprobado">Aprobado</option>
                          <option value="rechazado">Rechazado</option>
                        </select>
                      </label>
                      {submit("Registrar decisión presencial")}
                    </form>
                  )}
                  {q.decision && (
                    <p className="text-sm text-ink-muted">
                      {q.decision.channel}: {q.decision.evidence}
                    </p>
                  )}
                </article>
              ))}
            </section>
            <section className={card}>
              <h2 className="text-xl font-semibold">Nueva versión de presupuesto · PEN</h2>
              <p className="mt-2 text-sm text-ink-muted">
                Cambiar el alcance o los importes crea otra versión y exige una nueva aprobación.
              </p>
              <form
                className="mt-4 space-y-4"
                action={(f) =>
                  action({
                    action: "quote.create",
                    lines: [0, 1, 2]
                      .filter((i) => f.get(`description${i}`))
                      .map((i) => ({
                        description: f.get(`description${i}`),
                        kind: f.get(`kind${i}`),
                        quantity: Number(f.get(`quantity${i}`)),
                        unitPrice: Number(f.get(`price${i}`)),
                      })),
                    expiresAt: f.get("expiry")
                      ? new Date(String(f.get("expiry"))).toISOString()
                      : undefined,
                  })
                }
              >
                {[0, 1, 2].map((i) => (
                  <div key={i} className="space-y-2 rounded-lg border border-white/10 p-3">
                    <Field
                      name={`description${i}`}
                      label={`Línea ${i + 1}: descripción`}
                      required={i === 0}
                    />
                    <label>
                      Tipo
                      <select name={`kind${i}`} className={input}>
                        <option value="trabajo">Trabajo</option>
                        <option value="repuesto">Repuesto</option>
                      </select>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <Field
                        name={`quantity${i}`}
                        type="number"
                        label="Cantidad"
                        defaultValue="1"
                      />
                      <Field
                        name={`price${i}`}
                        type="number"
                        label="Precio unitario PEN"
                        defaultValue="0"
                      />
                    </div>
                  </div>
                ))}
                <Field name="expiry" type="datetime-local" label="Vencimiento" required={false} />
                {submit("Crear versión y solicitar aprobación")}
              </form>
            </section>
          </>
        )}
        {tab === "Repuestos" && (
          <section className={card}>
            <h2 className="text-xl font-semibold">Repuestos y recepción física</h2>
            {data.parts.map((p) => (
              <article key={p.id} className="mt-4 space-y-3 border-b border-white/10 pb-4">
                <h3>
                  {p.description} · {p.status}
                </h3>
                <form
                  action={(f) =>
                    action({
                      action: "part.promise",
                      partId: p.id,
                      resolution: f.get("resolution"),
                      promisedAt: f.get("date")
                        ? new Date(String(f.get("date"))).toISOString()
                        : undefined,
                    })
                  }
                  className="space-y-3"
                >
                  <label>
                    Quién lo consigue
                    <select name="resolution" defaultValue={p.resolution} className={input}>
                      <option value="cliente">Cliente</option>
                      <option value="taller">Taller</option>
                    </select>
                  </label>
                  <Field
                    name="date"
                    type="datetime-local"
                    label="Fecha comprometida"
                    required={false}
                  />
                  {submit("Actualizar compromiso")}
                </form>
                <form
                  action={(f) =>
                    action({
                      action: "part.receive",
                      partId: p.id,
                      accepted: f.get("accepted") === "true",
                      note: f.get("note"),
                    })
                  }
                  className="space-y-3"
                >
                  <Field name="note" label="Resultado de inspección física" />
                  <label>
                    Conformidad
                    <select className={input} name="accepted">
                      <option value="false">Rechazado / incompatible</option>
                      <option value="true">Recibido y conforme</option>
                    </select>
                  </label>
                  {submit("Registrar recepción e inspección")}
                </form>
              </article>
            ))}
            <form
              className="mt-5 space-y-3"
              action={(f) =>
                action({
                  action: "part.request",
                  description: f.get("description"),
                  resolution: f.get("resolution"),
                  urgency: f.get("urgency"),
                  provider: f.get("provider") || undefined,
                  promisedAt: f.get("date")
                    ? new Date(String(f.get("date"))).toISOString()
                    : undefined,
                })
              }
            >
              <Field name="description" label="Repuesto y compatibilidad" />
              <label>
                Quién lo consigue
                <select name="resolution" className={input}>
                  <option value="cliente">Cliente</option>
                  <option value="taller">Taller</option>
                </select>
              </label>
              <label>
                Urgencia
                <select name="urgency" className={input}>
                  <option value="media">Media</option>
                  <option value="alta">Alta</option>
                  <option value="baja">Baja</option>
                </select>
              </label>
              <Field name="provider" label="Proveedor (solo interno)" required={false} />
              <Field
                name="date"
                type="datetime-local"
                label="Fecha comprometida"
                required={false}
              />
              {submit("Solicitar y bloquear hasta conformidad")}
            </form>
          </section>
        )}
        {tab === "QA y entrega" && (
          <>
            <section className={card}>
              <h2 className="text-xl font-semibold">Control de calidad</h2>
              <form
                action={(f) =>
                  action({
                    action: "qa",
                    items: [
                      "Prueba funcional del servicio",
                      "Sin fugas ni alertas",
                      "Evidencia y revisión final",
                    ].map((title, i) => ({ title, passed: f.get(`qa${i}`) === "on" })),
                    note: f.get("note"),
                  })
                }
                className="mt-4 space-y-4"
              >
                {[
                  "Prueba funcional del servicio",
                  "Sin fugas ni alertas",
                  "Evidencia y revisión final",
                ].map((title, i) => (
                  <label key={title} className="flex min-h-11 items-center gap-3">
                    <input name={`qa${i}`} type="checkbox" />
                    {title} conforme
                  </label>
                ))}
                <Field name="note" label="Observaciones del control" />
                {submit("Registrar QA (fallo vuelve a reparación)", w.status !== "control_calidad")}
              </form>
              {data.inspections.map((q) => (
                <p className="mt-3 text-sm" key={q.id}>
                  {q.passed ? "Aprobado" : "No conforme / retrabajo"}: {q.note}
                </p>
              ))}
            </section>
            <section className={card}>
              <h2 className="text-xl font-semibold">Entrega del vehículo</h2>
              <form
                action={(f) => {
                  if (
                    !window.confirm("Confirmar entrega y cierre. El historial quedará conservado.")
                  )
                    return;
                  return action({
                    action: "deliver",
                    summary: f.get("summary"),
                    warranty: f.get("warranty"),
                  });
                }}
                className="mt-4 space-y-3"
              >
                <Field name="summary" label="Resumen de trabajos entregados" />
                <Field name="warranty" label="Condiciones de garantía" />
                {submit("Registrar entrega y cerrar OT", w.status !== "listo")}
              </form>
            </section>
          </>
        )}
        {tab === "Fotos" && (
          <section className={card}>
            <h2 className="text-xl font-semibold">Evidencias privadas</h2>
            <form action={upload} className="mt-4 space-y-3">
              <label>
                Foto
                <input
                  className={input}
                  name="photo"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  required
                />
              </label>
              <label>
                Categoría
                <select name="category" className={input}>
                  {["ingreso", "diagnostico", "reparacion", "control", "entrega"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <Field name="caption" label="Descripción de la foto" required={false} />
              <label className="block">
                <input name="visibleToCustomer" type="checkbox" value="true" /> Permitir al cliente
                ver esta foto
              </label>
              {submit("Subir foto")}
            </form>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {data.media.map((m) => (
                <article key={m.id}>
                  <img
                    alt={m.caption || m.category}
                    src={`/api/v1/admin/media/${m.id}`}
                    className="aspect-square w-full rounded-xl object-cover"
                  />
                  <p className="my-2 text-sm">
                    {m.caption || m.category} ·{" "}
                    {m.visible_to_customer ? "Visible al cliente" : "Interna"}
                  </p>
                  <button
                    className={button}
                    onClick={() =>
                      void action({
                        action: "media.visibility",
                        mediaId: m.id,
                        visibleToCustomer: !m.visible_to_customer,
                      })
                    }
                  >
                    Cambiar visibilidad
                  </button>
                </article>
              ))}
            </div>
          </section>
        )}
      </fieldset>
      {closed && (
        <section className={card}>
          <h2 className="text-xl font-semibold">Orden cerrada</h2>
          <p className="mt-3">
            {w.delivery_summary ||
              "Historial conservado. Registra una nueva orden para otro servicio."}
          </p>
          {w.warranty && <p className="mt-3">Garantía: {w.warranty}</p>}
        </section>
      )}
      {tab === "Historial" && (
        <section className={card}>
          <h2 className="text-xl font-semibold">Bitácora e historial del vehículo</h2>
          <ol className="mt-4 space-y-3">
            {data.events.map((e) => (
              <li key={e.id} className="border-l-2 border-racing/50 pl-3">
                <p>
                  {e.event_type} · {e.to_status && clientStatus(e.to_status)}
                </p>
                <p>{e.reason}</p>
                <small className="text-ink-muted">
                  {new Date(e.created_at).toLocaleString("es-PE", { timeZone: "America/Lima" })}
                </small>
              </li>
            ))}
          </ol>
          <div className="mt-5 flex flex-wrap gap-3">
            {data.history.map((o) => (
              <Link className="text-racing underline" key={o.id} href={`/admin/orders/${o.id}`}>
                {o.code} · {clientStatus(o.status)}
              </Link>
            ))}
          </div>
        </section>
      )}
      <section className={card}>
        <h2 className="text-xl font-semibold">Enlace del cliente</h2>
        <p className="mt-2 text-sm text-ink-muted">
          Regenerar revoca los enlaces anteriores de esta orden.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button disabled={busy} onClick={() => void shareLink()} className={button}>
            Generar / regenerar enlace
          </button>
          <button
            className={button}
            onClick={async () => {
              if (window.confirm("¿Revocar todos los enlaces de esta orden?")) {
                await fetch(`/api/v1/admin/work-orders/${id}/share`, { method: "DELETE" });
                setShare("");
              }
            }}
          >
            Revocar enlaces
          </button>
        </div>
        {share && (
          <div className="mt-4 space-y-3">
            <p className="break-all text-sm">{share}</p>
            <button className={button} onClick={() => void navigator.clipboard.writeText(share)}>
              Copiar enlace
            </button>
            <button
              className={`${button} ml-3`}
              onClick={() =>
                void (navigator.share
                  ? navigator.share({ title: "Seguimiento CHAMBI MOTORS", url: share })
                  : navigator.clipboard.writeText(share))
              }
            >
              Compartir
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
