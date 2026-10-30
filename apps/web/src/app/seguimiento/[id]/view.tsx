"use client";
import { useEffect, useRef, useState } from "react";
import { clientStatus, type WorkOrderStatus } from "@chambi/domain";
type Quote = {
  id: string;
  version: number;
  status: string;
  expiresAt: string | null;
  total: number;
  lines: { description: string; quantity: number; unitPrice: number }[];
  decision: { decision: string; channel: string; createdAt: string } | null;
};
type PublicOrder = {
  id: string;
  code: string;
  status: WorkOrderStatus;
  version: number;
  make: string;
  model: string;
  plate: string;
  created_at: string;
  updated_at: string;
  eta_from: string | null;
  eta_to: string | null;
  eta_confidence: string;
  eta_reason: string | null;
  public_notes: string;
  delivery_summary: string | null;
  delivered_at: string | null;
  warranty: string | null;
  progress: number;
  tasks: { title: string; completed: boolean }[];
  blockers: { kind: string; reason: string }[];
  events: { type: string; toStatus: WorkOrderStatus; reason: string | null; createdAt: string }[];
  quotes: Quote[];
  parts: { description: string; status: string; resolution: string; promisedAt: string | null }[];
  media: { id: string; url: string; caption: string | null; category: string }[];
  diagnosis: { revision: number; label: string; summary: string; updatedAt: string } | null;
  business: { name: string; phone: string; hours: string; privacy_notice: string };
  remoteApprovalEnabled: boolean;
};
const date = (value: string) =>
  new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Lima",
  }).format(new Date(value));
const money = (value: number) =>
  new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(value);
const eventLabels: Record<string, string> = {
  "quote.create": "Presupuesto enviado",
  "quote.decide": "Decisión presencial registrada",
  "quote.decide.remote": "Decisión del cliente verificada",
  "part.request": "Repuesto solicitado",
  "part.promise": "Compromiso de repuesto actualizado",
  "part.receive": "Recepción de repuesto registrada",
  qa: "Control de calidad registrado",
  deliver: "Servicio entregado",
  eta: "Estimación de entrega actualizada",
  "blocker.add": "Bloqueo registrado",
  "blocker.resolve": "Bloqueo resuelto",
  note: "Mensaje del taller actualizado",
  "media.visibility": "Evidencia actualizada",
};
const panel = "rounded-2xl border border-white/10 bg-graphite p-5 sm:p-6";
export default function TrackingView({ id }: { id: string }) {
  const [data, setData] = useState<PublicOrder | null>(null),
    [invalid, setInvalid] = useState(false),
    [offline, setOffline] = useState(false),
    [message, setMessage] = useState(""),
    [challenge, setChallenge] = useState<{ id: string; quoteId: string; testCode?: string } | null>(
      null,
    ),
    [busy, setBusy] = useState(false);
  const etag = useRef(""),
    pending = useRef<Record<string, unknown> | null>(null);
  useEffect(() => {
    let active = true,
      loading = false;
    const controller = new AbortController();
    async function refresh() {
      if (document.visibilityState !== "visible" || loading) return;
      loading = true;
      try {
        const r = await fetch(`/api/v1/public?orderId=${id}`, {
          headers: etag.current ? { "If-None-Match": etag.current } : {},
          cache: "no-store",
          signal: controller.signal,
        });
        if (!active) return;
        if (r.status === 404) {
          setInvalid(true);
          return;
        }
        if (r.status === 304) {
          setOffline(false);
          return;
        }
        if (!r.ok) throw new Error();
        const fresh: PublicOrder = await r.json();
        if (pending.current) {
          const confirmed = fresh.quotes.find((q) => q.id === pending.current?.quoteId)?.decision;
          if (confirmed) {
            setMessage(
              confirmed.decision === pending.current.decision
                ? "Tu decisión quedó registrada."
                : "Hay otra decisión registrada. Revisa la constancia del presupuesto.",
            );
            pending.current = null;
            setChallenge(null);
          }
        }
        setData(fresh);
        etag.current = r.headers.get("etag") ?? "";
        setOffline(false);
      } catch {
        if (active && !controller.signal.aborted) setOffline(true);
      } finally {
        loading = false;
      }
    }
    void refresh();
    const timer = setInterval(() => void refresh(), 20000);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("online", refresh);
    return () => {
      active = false;
      controller.abort();
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("online", refresh);
    };
  }, [id]);
  async function sendCode(quoteId: string) {
    setBusy(true);
    setMessage("");
    try {
      const r = await fetch("/api/v1/public/verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteId }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setChallenge({ id: j.challengeId, quoteId, testCode: j.testCode });
      setMessage(j.message);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "No se pudo solicitar el código");
    } finally {
      setBusy(false);
    }
  }
  async function decide(form: FormData, decision: string) {
    if (pending.current && pending.current.decision !== decision) {
      setMessage(
        "Hay una decisión anterior sin confirmar. Reintenta esa misma decisión antes de elegir otra.",
      );
      return;
    }
    if (
      !challenge ||
      !data ||
      !window.confirm(
        `Confirmar decisión: ${decision}. Se guardará sobre esta versión y sus importes.`,
      )
    )
      return;
    setBusy(true);
    setMessage("");
    const body = pending.current ?? {
      challengeId: challenge.id,
      quoteId: challenge.quoteId,
      code: String(form.get("code")),
      decision,
      expectedVersion: data.version,
      idempotencyKey: crypto.randomUUID(),
    };
    pending.current = body;
    try {
      const r = await fetch("/api/v1/public/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok) {
        if (r.status < 500) pending.current = null;
        throw new Error(j.error);
      }
      pending.current = null;
      setChallenge(null);
      const fresh = await fetch(`/api/v1/public?orderId=${data.id}`, { cache: "no-store" });
      if (fresh.ok) setData(await fresh.json());
      setMessage("Tu decisión quedó registrada.");
    } catch (e) {
      setMessage(
        `${e instanceof Error ? e.message : "No se pudo confirmar"}${pending.current ? " Reintenta para consultar la misma solicitud, sin duplicarla." : ""}`,
      );
    } finally {
      setBusy(false);
    }
  }
  if (invalid)
    return (
      <main className="mx-auto max-w-xl px-5 py-16 text-ink">
        <h1 className="text-3xl font-bold">Enlace vencido o revocado</h1>
        <p className="mt-4">Solicita un nuevo enlace al taller.</p>
      </main>
    );
  if (!data)
    return (
      <main className="mx-auto max-w-xl px-5 py-16 text-ink">
        <h1 className="text-3xl font-bold">Seguimiento de tu servicio</h1>
        <p role="status" className="mt-5">
          {offline
            ? "No pudimos conectar con el taller. Reintentaremos al recuperar la conexión."
            : "Verificando el enlace y cargando tu servicio…"}
        </p>
        <div
          aria-hidden="true"
          className="mt-5 h-52 rounded-2xl bg-graphite motion-safe:animate-pulse"
        />
      </main>
    );
  return (
    <main
      style={{ overflowWrap: "anywhere" }}
      className="mx-auto min-h-screen max-w-2xl space-y-5 px-5 py-10 text-ink"
    >
      <header>
        <p className="text-sm font-semibold tracking-widest text-racing">{data.business.name}</p>
        <h1 className="mt-5 text-3xl font-bold">Seguimiento de tu servicio</h1>
        <p className="mt-2 text-ink-muted">
          {data.make} {data.model} · {data.plate}
        </p>
      </header>
      {offline && (
        <p role="status" className="rounded-lg border border-amber-400/50 p-3 text-amber-200">
          Sin conexión. Mostramos la última información recibida; se actualizará al reconectar.
        </p>
      )}
      <section className={panel}>
        <p className="text-sm text-ink-muted">{data.code}</p>
        <h2 className="mt-2 text-2xl font-semibold">{clientStatus(data.status)}</h2>
        <p className="mt-4">Tareas verificadas: {data.progress}%</p>
        <div
          className="mt-2 h-2 overflow-hidden rounded-full bg-white/10"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={data.progress}
          aria-label="Avance por tareas completadas"
        >
          <div className="h-full bg-racing" style={{ width: `${data.progress}%` }} />
        </div>
        {data.blockers.map((b, i) => (
          <p key={i} className="mt-3 rounded-lg bg-amber-400/10 p-3 text-amber-200">
            {b.reason}
          </p>
        ))}
        <p className="mt-4">
          {data.delivered_at
            ? `Entrega registrada: ${date(data.delivered_at)}`
            : data.eta_from && data.eta_to
              ? `Entrega ${data.eta_confidence}: ${date(data.eta_from)} a ${date(data.eta_to)}`
              : "Entrega estimada: por confirmar"}
        </p>
        {!data.delivered_at && data.eta_reason && (
          <p className="mt-2 text-sm text-ink-muted">{data.eta_reason}</p>
        )}
        <p className="mt-5 text-sm text-ink-muted">Última actualización: {date(data.updated_at)}</p>
      </section>
      {data.public_notes && (
        <section className={panel}>
          <h2 className="text-xl font-semibold">Mensaje del taller</h2>
          <p className="mt-3 whitespace-pre-wrap">{data.public_notes}</p>
        </section>
      )}
      {data.diagnosis && (
        <section className={panel} aria-labelledby="diagnosis-title">
          <p className="text-sm font-semibold tracking-wide text-racing">
            Revisión {data.diagnosis.revision}
          </p>
          <h2 id="diagnosis-title" className="mt-2 text-xl font-semibold">
            {data.diagnosis.label}
          </h2>
          <p className="mt-3 whitespace-pre-wrap">{data.diagnosis.summary}</p>
          <p className="mt-3 text-sm text-ink-muted">
            Actualizado: {date(data.diagnosis.updatedAt)}
          </p>
        </section>
      )}
      {data.tasks.length > 0 && (
        <section className={panel}>
          <h2 className="text-xl font-semibold">Trabajos del servicio</h2>
          <ul className="mt-3 space-y-3">
            {data.tasks.map((t, i) => (
              <li key={i}>
                {t.completed ? "✓" : "○"} {t.title} · {t.completed ? "Completado" : "Pendiente"}
              </li>
            ))}
          </ul>
        </section>
      )}
      {data.quotes.map((q, i) => (
        <section className={panel} key={q.id}>
          <h2 className="text-xl font-semibold">Presupuesto orientativo · V{q.version}</h2>
          <p className="mt-2 text-racing">
            {q.status}
            {i > 0 ? " · Versión anterior" : ""}
          </p>
          <ul className="mt-4 space-y-3">
            {q.lines.map((l, n) => (
              <li key={n} className="flex justify-between gap-3">
                <span>
                  {l.description}
                  <small className="block text-ink-muted">
                    {l.quantity} × {money(l.unitPrice)}
                  </small>
                </span>
                <span>{money(l.quantity * l.unitPrice)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 border-t border-white/10 pt-3 font-semibold">
            Total: {money(q.total)} · PEN
          </p>
          <p className="mt-2 text-sm text-ink-muted">
            No se realiza ningún cobro en este portal.
            {q.expiresAt ? ` Vence: ${date(q.expiresAt)}.` : ""}
          </p>
          {q.decision && (
            <p className="mt-3">
              Decisión registrada: {q.decision.decision} ·{" "}
              {q.decision.channel === "otp"
                ? "Contacto verificado"
                : "Presencial, registrada por el taller"}{" "}
              · {date(q.decision.createdAt)}
            </p>
          )}
          {i === 0 &&
            q.status === "pendiente" &&
            !["entregado", "cancelado"].includes(data.status) &&
            (data.remoteApprovalEnabled ? (
              <div className="mt-4">
                {challenge?.quoteId === q.id ? (
                  <form
                    action={(f) => void decide(f, String(f.get("decision")))}
                    className="space-y-3"
                  >
                    <label className="block">
                      Código de verificación
                      <input
                        name="code"
                        disabled={busy || !!pending.current}
                        required
                        pattern="[0-9]{6}"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        className="mt-2 w-full rounded-lg bg-carbon p-3"
                      />
                    </label>
                    {challenge.testCode && (
                      <p className="text-amber-200">Prueba local: {challenge.testCode}</p>
                    )}
                    <div className="flex flex-wrap gap-3">
                      <button
                        name="decision"
                        value="aprobado"
                        disabled={busy}
                        className="min-h-12 rounded-lg bg-racing px-5 text-black"
                      >
                        Aprobar V{q.version}
                      </button>
                      <button
                        name="decision"
                        value="rechazado"
                        disabled={busy}
                        className="min-h-12 rounded-lg border border-white/30 px-5"
                      >
                        Rechazar
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    onClick={() => void sendCode(q.id)}
                    disabled={busy}
                    className="min-h-12 rounded-lg bg-racing px-5 text-black"
                  >
                    Verificar contacto para decidir
                  </button>
                )}
              </div>
            ) : (
              <p className="mt-4 text-amber-200">
                Para aprobar o rechazar, coordina presencialmente con el taller. La aprobación
                remota aún no está habilitada.
              </p>
            ))}
        </section>
      ))}
      {message && (
        <p role="status" className="rounded-lg border border-racing/50 p-4">
          {message}
        </p>
      )}
      {data.parts.length > 0 && (
        <section className={panel}>
          <h2 className="text-xl font-semibold">Repuestos</h2>
          {data.parts.map((p, i) => (
            <p key={i} className="mt-3">
              {p.description} · {p.status} ·{" "}
              {p.resolution === "cliente" ? "Lo aporta el cliente" : "Lo consigue el taller"}
              {p.promisedAt ? ` · Compromiso: ${date(p.promisedAt)}` : ""}
            </p>
          ))}
        </section>
      )}
      {data.media.length > 0 && (
        <section className={panel}>
          <h2 className="text-xl font-semibold">Evidencia del servicio</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {data.media.map((m) => (
              <figure key={m.id}>
                <img
                  src={m.url}
                  alt={m.caption || `Evidencia de ${m.category}`}
                  className="aspect-square w-full rounded-xl object-cover"
                  loading="lazy"
                />
                <figcaption className="mt-2 text-sm text-ink-muted">
                  {m.caption || m.category}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}
      {data.delivery_summary && (
        <section className={panel}>
          <h2 className="text-xl font-semibold">Resumen de entrega</h2>
          <p className="mt-3 whitespace-pre-wrap">{data.delivery_summary}</p>
          <p className="mt-3">Garantía: {data.warranty}</p>
        </section>
      )}
      <section className={panel}>
        <h2 className="text-xl font-semibold">Historial del servicio</h2>
        <ol className="mt-4 space-y-4">
          {data.events
            .filter((e) => !e.type.startsWith("task."))
            .map((e, i) => (
              <li key={i} className="border-l-2 border-racing/50 pl-4">
                <p>
                  {eventLabels[e.type] ??
                    (e.toStatus ? clientStatus(e.toStatus) : "Actualización del servicio")}
                </p>
                {e.reason && <p className="mt-1 text-sm">{e.reason}</p>}
                <p className="mt-1 text-xs text-ink-muted">{date(e.createdAt)}</p>
              </li>
            ))}
        </ol>
      </section>
      <footer className="space-y-3 py-4 text-sm text-ink-muted">
        <p>Ingreso: {date(data.created_at)} · America/Lima</p>
        {data.business.phone && (
          <a
            className="inline-flex min-h-11 items-center text-racing underline"
            href={`tel:${data.business.phone.replace(/[^+\d]/g, "")}`}
          >
            Contactar al taller: {data.business.phone}
          </a>
        )}
        <p>{data.business.hours}</p>
        {data.business.phone && (
          <a
            className="inline-flex min-h-11 items-center text-racing underline"
            href={`https://wa.me/51${data.business.phone.replace(/\D/g, "").replace(/^51(?=9\d{8}$)/, "")}?text=${encodeURIComponent(`Hola, consulto sobre el servicio ${data.code}.`)}`}
            rel="noreferrer"
          >
            Consultar por WhatsApp
          </a>
        )}
        <p>{data.business.privacy_notice}</p>
      </footer>
    </main>
  );
}
