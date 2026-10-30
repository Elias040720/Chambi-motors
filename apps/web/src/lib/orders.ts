import { createHash } from "node:crypto";
import type { PoolClient } from "pg";
import {
  assertTransition,
  type OrderAction,
  type WorkOrderStatus,
  verifiedProgress,
} from "@chambi/domain";
import { db } from "./db";

export class DomainError extends Error {
  constructor(
    message: string,
    public status = 422,
  ) {
    super(message);
  }
}
export const requireValue = (value: unknown, message: string) => {
  if (!value) throw new DomainError(message);
};

export async function getOrder(id: string) {
  const order = await db.query(
    `select w.*,v.plate,v.make,v.model,v.year,v.color,v.vin,c.name customer_name,c.phone,c.email
    from work_orders w join vehicles v on v.id=w.vehicle_id join customers c on c.id=w.customer_id where w.id=$1`,
    [id],
  );
  if (!order.rowCount) throw new DomainError("Orden no encontrada", 404);
  const [tasks, quotes, parts, blockers, inspections, events, media, history, diagnoses, contacts] =
    await Promise.all([
      db.query(
        "select * from work_order_tasks where work_order_id=$1 order by case priority when 'alta' then 0 when 'media' then 1 else 2 end,created_at",
        [id],
      ),
      db.query(
        `select q.*,case when q.status='pendiente' and q.expires_at<now() then 'vencido' else q.status end status,coalesce((select sum(round(quantity*unit_price,2)) from quote_lines where quote_id=q.id),0) total,
      coalesce((select json_agg(l order by l.id) from quote_lines l where l.quote_id=q.id),'[]') lines,
      (select row_to_json(d) from quote_decisions d where d.quote_id=q.id) decision from quotes q where q.work_order_id=$1 order by version desc`,
        [id],
      ),
      db.query("select * from part_requests where work_order_id=$1 order by created_at", [id]),
      db.query(
        "select * from work_order_blockers where work_order_id=$1 and resolved_at is null order by created_at",
        [id],
      ),
      db.query("select * from inspections where work_order_id=$1 order by created_at desc", [id]),
      db.query(
        "select * from work_order_events where work_order_id=$1 order by created_at desc limit 200",
        [id],
      ),
      db.query(
        "select id,category,caption,visible_to_customer,created_at from media_assets where work_order_id=$1 order by created_at desc",
        [id],
      ),
      db.query(
        "select id,code,status,created_at,delivery_summary from work_orders where vehicle_id=$1 order by created_at desc",
        [order.rows[0].vehicle_id],
      ),
      db.query(
        "select id,revision,kind,effective_kind,supersedes_id,internal_notes,public_summary,evidence_ids,author_id,published_at,created_at from diagnosis_revisions where work_order_id=$1 order by revision desc",
        [id],
      ),
      db.query(
        "select id,name,phone_e164,relation_type,can_view_progress,can_approve_quote,verified_at,verified_method,verification_note,delegation_verified_at,delegation_note,revoked_at,created_at from work_order_contacts where work_order_id=$1 order by created_at",
        [id],
      ),
    ]);
  return {
    workOrder: order.rows[0],
    tasks: tasks.rows,
    quotes: quotes.rows,
    parts: parts.rows,
    blockers: blockers.rows,
    inspections: inspections.rows,
    events: events.rows,
    media: media.rows,
    history: history.rows,
    diagnoses: diagnoses.rows,
    contacts: contacts.rows,
    progress: verifiedProgress(tasks.rows),
  };
}

type OrderRow = { id: string; status: WorkOrderStatus; version: number; qa_passed: boolean };
type Mutation = { expectedVersion: number; idempotencyKey: string };
export async function mutateOrder(
  id: string,
  input: Mutation,
  kind: string,
  operation: (c: PoolClient, w: OrderRow) => Promise<void>,
  reason: string | null = null,
  visible = true,
  actor = "admin",
) {
  const hash = createHash("sha256").update(JSON.stringify({ id, kind, input })).digest();
  const c = await db.connect();
  try {
    await c.query("begin");
    await c.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [input.idempotencyKey]);
    const prior = await c.query(
      "select request_hash,response from api_idempotency where idempotency_key=$1",
      [input.idempotencyKey],
    );
    if (prior.rowCount) {
      if (!prior.rows[0].request_hash.equals(hash))
        throw new DomainError("La clave de reintento ya se usó con otros datos", 409);
      await c.query("commit");
      return prior.rows[0].response;
    }
    const result = await c.query<OrderRow>(
      "select id,status,version,qa_passed from work_orders where id=$1 for update",
      [id],
    );
    const w = result.rows[0];
    if (!w) throw new DomainError("Orden no encontrada", 404);
    if (w.version !== input.expectedVersion)
      throw new DomainError("La orden cambió. Actualiza y vuelve a intentar.", 409);
    if (w.status === "entregado" || w.status === "cancelado")
      throw new DomainError(
        "La orden está cerrada. Registra una nueva OT para una corrección o servicio.",
      );
    await operation(c, w);
    const updated = await c.query(
      "update work_orders set version=version+1,updated_at=now() where id=$1 returning *",
      [id],
    );
    const event = await c.query(
      `insert into work_order_events(work_order_id,event_type,from_status,to_status,reason,visible_to_customer,actor)
      values($1,$2,$3,$4,$5,$6,$7) returning id`,
      [id, kind, w.status, updated.rows[0].status, reason, visible, actor],
    );
    await c.query(
      "insert into audit_events(actor,action,entity_type,entity_id) values($1,$2,'work_order',$3)",
      [actor, kind, id],
    );
    await c.query(
      "insert into notification_outbox(event_id,channel,payload) values($1,'share_link',$2)",
      [event.rows[0].id, { event: kind, workOrderId: id }],
    );
    const response = { workOrder: updated.rows[0] };
    await c.query(
      "insert into api_idempotency(idempotency_key,request_hash,response) values($1,$2,$3)",
      [input.idempotencyKey, hash, response],
    );
    await c.query("commit");
    return response;
  } catch (error) {
    await c.query("rollback");
    throw error;
  } finally {
    c.release();
  }
}

async function linked(
  c: PoolClient,
  table: "work_order_tasks" | "quotes" | "part_requests" | "media_assets" | "work_order_blockers",
  id: string,
  order: string,
) {
  const result = await c.query(
    `select * from ${table} where id=$1 and work_order_id=$2 for update`,
    [id, order],
  );
  if (!result.rows[0]) throw new DomainError("El elemento no pertenece a esta orden", 404);
  return result.rows[0];
}
export async function assertCanRepair(c: PoolClient, id: string) {
  const blockers = await c.query(
    "select 1 from work_order_blockers where work_order_id=$1 and resolved_at is null",
    [id],
  );
  requireValue(!blockers.rowCount, "Resuelve los bloqueos antes de continuar");
  const quote = await c.query(
    "select status,expires_at from quotes where work_order_id=$1 order by version desc limit 1",
    [id],
  );
  if (quote.rows[0])
    requireValue(
      quote.rows[0].status === "aprobado",
      "Se requiere aprobar la última versión del presupuesto antes de trabajar",
    );
}

export async function transitionOrder(
  id: string,
  input: Mutation & { status: WorkOrderStatus; reason?: string },
) {
  return mutateOrder(
    id,
    input,
    "status_changed",
    async (c, w) => {
      if (["esperando_repuesto", "pausado", "esperando_cliente"].includes(input.status))
        throw new DomainError("Registra un bloqueo paralelo sin cambiar la etapa del servicio");
      try {
        assertTransition(w.status, input.status, w.qa_passed, input.reason);
      } catch (e) {
        throw new DomainError(e instanceof Error ? e.message : "Transición no válida");
      }
      if (["reparacion", "control_calidad", "listo"].includes(input.status))
        await assertCanRepair(c, id);
      if (input.status === "control_calidad") {
        const tasks = await c.query(
          "select count(*)::int total,count(*) filter(where completed_at is null)::int pending from work_order_tasks where work_order_id=$1",
          [id],
        );
        requireValue(
          tasks.rows[0].total > 0 && !tasks.rows[0].pending,
          "Completa las tareas verificadas antes del control de calidad",
        );
      }
      requireValue(
        input.status !== "entregado",
        "Registra resumen y garantía con la acción de entrega",
      );
      if (
        input.status === "cancelado" ||
        (["listo", "control_calidad"].includes(w.status) && input.status === "reparacion")
      )
        requireValue(input.reason?.trim(), "Indica el motivo de la cancelación o retrabajo");
      await c.query(
        "update work_orders set status=$2,qa_passed=case when $2='reparacion' then false else qa_passed end where id=$1",
        [id, input.status],
      );
    },
    input.reason ?? null,
  );
}

export async function applyAction(id: string, a: OrderAction) {
  return mutateOrder(
    id,
    a,
    a.action,
    async (c, w) => {
      switch (a.action) {
        case "task.add":
          requireValue(
            !["listo", "control_calidad"].includes(w.status),
            "Vuelve a reparación antes de cambiar el alcance",
          );
          if (a.quoteId) await linked(c, "quotes", a.quoteId, id);
          if (a.dependsOn) await linked(c, "work_order_tasks", a.dependsOn, id);
          await c.query(
            "insert into work_order_tasks(work_order_id,title,weight,visible_to_customer,requires_evidence,quote_id,priority,depends_on) values($1,$2,$3,$4,$5,$6,$7,$8)",
            [
              id,
              a.title,
              a.weight,
              a.visibleToCustomer,
              a.requiresEvidence,
              a.quoteId ?? null,
              a.priority,
              a.dependsOn ?? null,
            ],
          );
          break;
        case "task.complete": {
          requireValue(w.status === "reparacion", "Solo se completan tareas durante reparación");
          await assertCanRepair(c, id);
          const task = await linked(c, "work_order_tasks", a.taskId, id);
          if (a.completed && task.depends_on) {
            const parent = await linked(c, "work_order_tasks", task.depends_on, id);
            requireValue(parent.completed_at, "Completa la tarea previa antes de esta tarea");
          }
          if (!a.completed) {
            const dependents = await c.query(
              "select 1 from work_order_tasks where depends_on=$1 and completed_at is not null",
              [a.taskId],
            );
            requireValue(
              !dependents.rowCount,
              "Reabre primero las tareas que dependen de esta tarea",
            );
          }
          if (a.completed && task.requires_evidence)
            requireValue(a.evidence?.trim(), "Esta tarea requiere evidencia");
          if (task.quote_id) {
            const q = await linked(c, "quotes", task.quote_id, id);
            requireValue(q.status === "aprobado", "La tarea depende de una cotización no aprobada");
          }
          await c.query(
            "update work_order_tasks set completed_at=case when $2 then now() else null end,evidence=$3 where id=$1",
            [a.taskId, a.completed, a.evidence ?? null],
          );
          await c.query("update work_orders set qa_passed=false where id=$1", [id]);
          break;
        }
        case "note":
          await c.query("update work_orders set internal_notes=$2,public_notes=$3 where id=$1", [
            id,
            a.internalNotes,
            a.publicNotes,
          ]);
          break;
        case "eta":
          if (a.confidence !== "no_disponible")
            requireValue(
              a.from && a.to && new Date(a.from) <= new Date(a.to),
              "Indica un rango de fechas válido",
            );
          await c.query(
            "insert into eta_revisions(work_order_id,eta_from,eta_to,reason,actor) values($1,$2,$3,$4,'admin')",
            [
              id,
              a.confidence === "no_disponible" ? null : a.from,
              a.confidence === "no_disponible" ? null : a.to,
              a.reason,
            ],
          );
          await c.query(
            "update work_orders set eta_from=$2,eta_to=$3,eta_confidence=$4 where id=$1",
            [
              id,
              a.confidence === "no_disponible" ? null : a.from,
              a.confidence === "no_disponible" ? null : a.to,
              a.confidence,
            ],
          );
          break;
        case "blocker.add":
          requireValue(
            !["listo", "control_calidad"].includes(w.status),
            "Regresa a reparación con motivo antes de agregar un bloqueo",
          );
          await c.query(
            "insert into work_order_blockers(work_order_id,kind,reason) values($1,$2,$3)",
            [id, a.kind, a.reason],
          );
          await c.query("update work_orders set qa_passed=false where id=$1", [id]);
          break;
        case "blocker.resolve": {
          const b = await linked(c, "work_order_blockers", a.blockerId, id);
          requireValue(!b.resolved_at, "Este bloqueo ya fue resuelto");
          if (b.part_request_id) {
            const p = await linked(c, "part_requests", b.part_request_id, id);
            requireValue(
              p.status === "conforme",
              "El repuesto debe recibirse y aprobarse físicamente",
            );
          }
          await c.query(
            "update work_order_blockers set resolved_at=now(),resolution_reason=$2 where id=$1",
            [a.blockerId, a.reason],
          );
          break;
        }
        case "quote.create": {
          requireValue(
            ["diagnostico", "esperando_aprobacion", "reparacion"].includes(w.status),
            "Registra presupuestos antes de QA/entrega",
          );
          if (a.expiresAt)
            requireValue(new Date(a.expiresAt) > new Date(), "El vencimiento debe ser futuro");
          const q = await c.query(
            "insert into quotes(work_order_id,version,expires_at,sealed) select $1,coalesce(max(version),0)+1,$2,false from quotes where work_order_id=$1 returning id",
            [id, a.expiresAt ?? null],
          );
          for (const line of a.lines)
            await c.query(
              "insert into quote_lines(quote_id,description,kind,quantity,unit_price) values($1,$2,$3,$4,$5)",
              [q.rows[0].id, line.description, line.kind, line.quantity, line.unitPrice],
            );
          await c.query("update quotes set sealed=true where id=$1", [q.rows[0].id]);
          await c.query(
            "update work_orders set status='esperando_aprobacion',qa_passed=false where id=$1",
            [id],
          );
          break;
        }
        case "quote.decide": {
          const q = await linked(c, "quotes", a.quoteId, id);
          await decideQuote(c, id, q, a.decision, "presencial", a.evidence);
          break;
        }
        case "part.request": {
          requireValue(
            !["listo", "control_calidad"].includes(w.status),
            "Vuelve a reparación para solicitar repuestos adicionales",
          );
          const p = await c.query(
            "insert into part_requests(work_order_id,description,urgency,resolution,provider,promised_at,status) values($1,$2,$3,$4,$5,$6,'prometido') returning id",
            [id, a.description, a.urgency, a.resolution, a.provider ?? null, a.promisedAt ?? null],
          );
          await c.query(
            "insert into work_order_blockers(work_order_id,kind,reason,part_request_id) values($1,'esperando_repuesto',$2,$3)",
            [id, a.description, p.rows[0].id],
          );
          await c.query("update work_orders set qa_passed=false where id=$1", [id]);
          break;
        }
        case "part.promise": {
          const p = await linked(c, "part_requests", a.partId, id);
          requireValue(p.status !== "conforme", "El repuesto ya está conforme");
          await c.query(
            "update part_requests set resolution=$2,promised_at=$3,status='prometido' where id=$1",
            [a.partId, a.resolution, a.promisedAt ?? null],
          );
          break;
        }
        case "part.receive": {
          const p = await linked(c, "part_requests", a.partId, id);
          requireValue(
            p.status !== "conforme",
            "El repuesto ya fue recibido conforme. Registra otra solicitud para una incidencia posterior",
          );
          await c.query(
            "insert into part_receipts(part_request_id,accepted,note) values($1,$2,$3)",
            [a.partId, a.accepted, a.note],
          );
          await c.query("update part_requests set status=$2 where id=$1", [
            a.partId,
            a.accepted ? "conforme" : "rechazado",
          ]);
          if (a.accepted)
            await c.query(
              "update work_order_blockers set resolved_at=now(),resolution_reason='Recibido e inspeccionado conforme' where part_request_id=$1 and resolved_at is null",
              [a.partId],
            );
          break;
        }
        case "qa": {
          requireValue(
            w.status === "control_calidad",
            "Entra a control de calidad antes de registrar su resultado",
          );
          const passed = a.items.every((x) => x.passed);
          await c.query(
            "insert into inspections(work_order_id,items,passed,note) values($1,$2,$3,$4)",
            [id, JSON.stringify(a.items), passed, a.note],
          );
          for (const item of a.items.filter((x) => !x.passed))
            await c.query(
              "insert into work_order_tasks(work_order_id,title,requires_evidence) values($1,$2,true)",
              [id, `Retrabajo: ${item.title}`],
            );
          await c.query(
            "update work_orders set qa_passed=$2,status=case when $2 then status else 'reparacion' end where id=$1",
            [id, passed],
          );
          break;
        }
        case "deliver":
          requireValue(
            w.status === "listo" && w.qa_passed,
            "Se requiere orden lista y QA aprobado",
          );
          await assertCanRepair(c, id);
          await c.query(
            "update work_orders set status='entregado',delivery_summary=$2,warranty=$3,delivered_at=now() where id=$1",
            [id, a.summary, a.warranty],
          );
          break;
        case "media.visibility":
          await linked(c, "media_assets", a.mediaId, id);
          await c.query("update media_assets set visible_to_customer=$2 where id=$1", [
            a.mediaId,
            a.visibleToCustomer,
          ]);
          break;
      }
    },
    "reason" in a
      ? a.reason
      : a.action === "qa"
        ? a.items.every((x) => x.passed)
          ? "Control de calidad aprobado"
          : "Control de calidad no conforme; vuelve a reparación"
        : null,
    a.action !== "note" || !!a.publicNotes,
  );
}

export async function decideQuote(
  c: PoolClient,
  orderId: string,
  q: { id: string; status: string; version: number; expires_at: Date | null },
  decision: string,
  channel: "presencial" | "otp",
  evidence: string,
) {
  const latest = await c.query(
    "select max(version)::int version from quotes where work_order_id=$1",
    [orderId],
  );
  requireValue(
    q.status === "pendiente" && q.version === latest.rows[0].version,
    "Solo se decide la última versión pendiente",
  );
  requireValue(
    !q.expires_at || new Date(q.expires_at) > new Date(),
    "El presupuesto venció. Crea una nueva versión",
  );
  await c.query(
    "insert into quote_decisions(quote_id,decision,channel,actor,evidence) values($1,$2,$3,$4,$5)",
    [q.id, decision, channel, channel === "presencial" ? "admin" : "cliente_verificado", evidence],
  );
  await c.query("update quotes set status=$2 where id=$1", [q.id, decision]);
}
