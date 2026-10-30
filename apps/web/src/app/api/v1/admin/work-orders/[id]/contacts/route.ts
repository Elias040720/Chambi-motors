import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "@chambi/domain";
import { isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { DomainError } from "@/lib/orders";
import { failure, privateHeaders, validId } from "@/lib/http";

const contactInput = z
  .object({
    name: z.string().trim().min(2).max(160),
    phone: z.string().regex(/^\+519\d{8}$/),
    relationType: z.enum(["client", "representative"]),
    canViewProgress: z.boolean(),
    canApproveQuote: z.boolean(),
    verifiedInPerson: z.literal(true),
    verificationNote: z.string().trim().min(3).max(500),
    delegationNote: z.string().trim().min(3).max(500).optional(),
  })
  .strict()
  .refine((v) => v.canViewProgress || v.canApproveQuote, "Asigna al menos un permiso")
  .refine(
    (v) => v.relationType !== "representative" || !v.canApproveQuote || Boolean(v.delegationNote),
    "Registra la delegación antes de autorizar presupuestos",
  );

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const id = validId((await params).id);
    const result = await db.query(
      `select id,name,phone_e164,relation_type,can_view_progress,can_approve_quote,verified_at,
        verified_method,verification_note,delegation_verified_at,delegation_note,revoked_at,created_at
       from work_order_contacts where work_order_id=$1 order by created_at`,
      [id],
    );
    return NextResponse.json({ contacts: result.rows }, { headers: privateHeaders });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const parsed = contactInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Revisa la verificación y los permisos del contacto" },
      { status: 400, headers: privateHeaders },
    );
  let orderId: string;
  try {
    orderId = validId((await params).id);
  } catch (error) {
    return failure(error);
  }
  const input = parsed.data;
  const client = await db.connect();
  try {
    await client.query("begin");
    if (
      !(await client.query("select id from work_orders where id=$1 for update", [orderId])).rowCount
    )
      throw new DomainError("Orden no encontrada", 404);
    let replacedContactIds: string[] = [];
    if (input.relationType === "client") {
      const replaced = await client.query(
        "update work_order_contacts set revoked_at=now() where work_order_id=$1 and relation_type='client' and revoked_at is null returning id",
        [orderId],
      );
      replacedContactIds = replaced.rows.map((row) => row.id as string);
      if (replacedContactIds.length) {
        await client.query(
          "update portal_recovery_challenges set consumed_at=coalesce(consumed_at,now()) where work_order_id=$1 and contact_id=any($2::uuid[]) and consumed_at is null",
          [orderId, replacedContactIds],
        );
        await client.query(
          "update access_grants set revoked_at=coalesce(revoked_at,now()) where work_order_id=$1 and revoked_at is null",
          [orderId],
        );
      }
    }
    const contactId = randomUUID();
    await client.query(
      `insert into work_order_contacts
       (id,work_order_id,name,phone_e164,relation_type,can_view_progress,can_approve_quote,
        verified_at,verified_method,verified_by,verification_note,delegation_verified_at,delegation_note)
       values($1,$2,$3,$4,$5,$6,$7,now(),'in_person','admin',$8,case when $7 then now() else null end,$9)`,
      [
        contactId,
        orderId,
        input.name,
        input.phone,
        input.relationType,
        input.canViewProgress,
        input.canApproveQuote,
        input.verificationNote,
        input.delegationNote ?? null,
      ],
    );
    await client.query(
      "insert into work_order_events(work_order_id,event_type,reason,visible_to_customer,actor) values($1,'contact.registered','Se verificó un contacto autorizado',false,'admin')",
      [orderId],
    );
    await client.query(
      "insert into audit_events(actor,action,entity_type,entity_id,details) values('admin','contact_registered','work_order',$1,$2)",
      [
        orderId,
        {
          contactId,
          relationType: input.relationType,
          canViewProgress: input.canViewProgress,
          canApproveQuote: input.canApproveQuote,
          verificationMethod: "in_person",
          replacedContactCount: replacedContactIds.length,
        },
      ],
    );
    await client.query("update work_orders set version=version+1,updated_at=now() where id=$1", [
      orderId,
    ]);
    await client.query("commit");
    return NextResponse.json({ contactId }, { status: 201, headers: privateHeaders });
  } catch (error) {
    await client.query("rollback");
    return failure(error);
  } finally {
    client.release();
  }
}
