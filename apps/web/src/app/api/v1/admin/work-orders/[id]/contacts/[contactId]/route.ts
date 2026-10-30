import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { DomainError } from "@/lib/orders";
import { failure, privateHeaders, validId } from "@/lib/http";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; contactId: string }> },
) {
  if (!(await isAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id, contactId } = await params;
  const workOrderId = validId(id);
  const client = await db.connect();
  try {
    await client.query("begin");
    if (
      !(await client.query("select id from work_orders where id=$1 for update", [workOrderId]))
        .rowCount
    )
      throw new DomainError("Orden no encontrada", 404);
    const target = await client.query(
      "select relation_type from work_order_contacts where id=$1 and work_order_id=$2 for update",
      [validId(contactId), workOrderId],
    );
    if (!target.rowCount) throw new DomainError("Contacto no encontrado", 404);
    const revoked = await client.query(
      "update work_order_contacts set revoked_at=coalesce(revoked_at,now()) where id=$1 and work_order_id=$2 returning id",
      [validId(contactId), workOrderId],
    );
    if (!revoked.rowCount) throw new DomainError("Contacto no encontrado", 404);
    await client.query(
      "update portal_recovery_challenges set consumed_at=coalesce(consumed_at,now()) where contact_id=$1 and work_order_id=$2 and consumed_at is null",
      [contactId, workOrderId],
    );
    const grants =
      target.rows[0].relation_type === "client"
        ? await client.query(
            "update access_grants set revoked_at=coalesce(revoked_at,now()) where work_order_id=$1 and revoked_at is null returning id",
            [workOrderId],
          )
        : await client.query(
            "update access_grants set revoked_at=coalesce(revoked_at,now()) where contact_id=$1 and work_order_id=$2 and revoked_at is null returning id",
            [contactId, workOrderId],
          );
    await client.query(
      "insert into work_order_events(work_order_id,event_type,reason,visible_to_customer,actor) values($1,'contact.revoked','Se revocó un contacto autorizado',false,'admin')",
      [workOrderId],
    );
    await client.query(
      "insert into audit_events(actor,action,entity_type,entity_id,details) values('admin','contact_revoked','work_order',$1,$2)",
      [workOrderId, { contactId, revokedGrantCount: grants.rowCount }],
    );
    await client.query("update work_orders set version=version+1,updated_at=now() where id=$1", [
      workOrderId,
    ]);
    await client.query("commit");
    return NextResponse.json(
      { revoked: true, sessionsRevoked: grants.rowCount },
      { headers: privateHeaders },
    );
  } catch (error) {
    await client.query("rollback");
    return failure(error);
  } finally {
    client.release();
  }
}
