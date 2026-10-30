import { NextResponse } from "next/server";
import { z } from "@chambi/domain";
import { isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { DomainError } from "@/lib/orders";
import { failure, privateHeaders, validId } from "@/lib/http";

const diagnosisInput = z
  .object({
    expectedVersion: z.number().int().positive(),
    kind: z.enum(["preliminary", "confirmed", "correction"]),
    supersedesId: z.string().uuid().optional(),
    internalNotes: z.string().max(4000).default(""),
    publicSummary: z.string().max(1200).default(""),
    evidenceIds: z.array(z.string().uuid()).max(10).default([]),
    publish: z.boolean().default(false),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.kind === "correction" && (!value.supersedesId || !value.internalNotes.trim()))
      context.addIssue({ code: "custom", message: "Indica la revisión que corriges y el motivo" });
    if (value.publish && !value.publicSummary.trim())
      context.addIssue({ code: "custom", message: "Escribe el resumen que verá el cliente" });
    if (value.kind === "confirmed" && value.evidenceIds.length === 0)
      context.addIssue({
        code: "custom",
        message: "Adjunta evidencia para confirmar el diagnóstico",
      });
  });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const parsed = diagnosisInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Revisa el diagnóstico, su evidencia y publicación" },
      { status: 400, headers: privateHeaders },
    );
  let workOrderId: string;
  try {
    workOrderId = validId((await params).id);
  } catch (error) {
    return failure(error);
  }
  const input = parsed.data;
  const client = await db.connect();
  try {
    await client.query("begin");
    const order = await client.query("select version from work_orders where id=$1 for update", [
      workOrderId,
    ]);
    if (!order.rowCount) throw new DomainError("Orden no encontrada", 404);
    if (order.rows[0].version !== input.expectedVersion)
      throw new DomainError("La orden cambió. Actualiza antes de guardar el diagnóstico.", 409);
    if (input.kind === "correction") {
      const previous = await client.query(
        "select id,effective_kind,revision from diagnosis_revisions where id=$1 and work_order_id=$2 for update",
        [input.supersedesId, workOrderId],
      );
      if (!previous.rowCount)
        throw new DomainError("La revisión que intentas corregir no pertenece a esta orden", 404);
      const latest = await client.query(
        "select max(revision)::int revision from diagnosis_revisions where work_order_id=$1",
        [workOrderId],
      );
      if (previous.rows[0].revision !== latest.rows[0].revision)
        throw new DomainError(
          "Solo puedes corregir la revisión vigente; crea una nueva revisión",
          409,
        );
    }
    if (input.evidenceIds.length) {
      const evidence = await client.query(
        "select count(*)::int total from media_assets where work_order_id=$1 and id=any($2::uuid[])",
        [workOrderId, input.evidenceIds],
      );
      if (evidence.rows[0].total !== new Set(input.evidenceIds).size)
        throw new DomainError("La evidencia debe pertenecer a esta orden", 404);
    }
    const nextRevision = await client.query(
      "select coalesce(max(revision),0)+1 revision from diagnosis_revisions where work_order_id=$1",
      [workOrderId],
    );
    const effectiveKind =
      input.kind === "correction"
        ? (
            await client.query(
              "select effective_kind from diagnosis_revisions where id=$1 and work_order_id=$2",
              [input.supersedesId, workOrderId],
            )
          ).rows[0].effective_kind
        : input.kind;
    if (effectiveKind === "confirmed" && input.evidenceIds.length === 0)
      throw new DomainError("La revisión confirmada requiere evidencia de esta orden");
    const inserted = await client.query(
      `insert into diagnosis_revisions
       (work_order_id,revision,kind,effective_kind,supersedes_id,internal_notes,public_summary,evidence_ids,author_id,published_at)
       values($1,$2,$3,$4,$5,$6,$7,$8,'admin',case when $9 then now() else null end) returning id,revision,kind,effective_kind,published_at,created_at`,
      [
        workOrderId,
        nextRevision.rows[0].revision,
        input.kind,
        effectiveKind,
        input.supersedesId ?? null,
        input.internalNotes,
        input.publicSummary,
        input.evidenceIds,
        input.publish,
      ],
    );
    await client.query("update work_orders set version=version+1,updated_at=now() where id=$1", [
      workOrderId,
    ]);
    await client.query(
      "insert into work_order_events(work_order_id,event_type,reason,visible_to_customer,actor) values($1,'diagnosis.revised',$2,$3,'admin')",
      [
        workOrderId,
        input.publish
          ? "Se actualizó el diagnóstico compartido"
          : "Diagnóstico interno actualizado",
        input.publish,
      ],
    );
    await client.query(
      "insert into audit_events(actor,action,entity_type,entity_id,details) values('admin','diagnosis_revision_created','work_order',$1,$2)",
      [
        workOrderId,
        {
          revisionId: inserted.rows[0].id,
          revision: inserted.rows[0].revision,
          kind: inserted.rows[0].kind,
          published: input.publish,
          evidenceCount: input.evidenceIds.length,
        },
      ],
    );
    await client.query("commit");
    return NextResponse.json(
      { diagnosis: inserted.rows[0] },
      { status: 201, headers: privateHeaders },
    );
  } catch (error) {
    await client.query("rollback");
    return failure(error);
  } finally {
    client.release();
  }
}
