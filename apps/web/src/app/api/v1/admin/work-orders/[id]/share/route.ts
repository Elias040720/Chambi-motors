import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "@chambi/domain";
import { isAdmin, tokenHash } from "@/lib/auth";
import { db } from "@/lib/db";
import { failure, privateHeaders, validId } from "@/lib/http";
import { DomainError } from "@/lib/orders";
export const dynamic = "force-dynamic";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const s = await db.query("select link_days from business_settings where id=true");
  const days = z
    .number()
    .int()
    .min(1)
    .max(30)
    .safeParse((await request.json().catch(() => ({})))?.days ?? s.rows[0].link_days);
  if (!days.success) return NextResponse.json({ error: "Duración no válida" }, { status: 400 });
  const c = await db.connect();
  try {
    const id = validId((await params).id),
      token = randomBytes(32).toString("base64url");
    await c.query("begin");
    if (!(await c.query("select id from work_orders where id=$1 for update", [id])).rowCount)
      throw new DomainError("Orden no encontrada", 404);
    await c.query(
      "update access_grants set revoked_at=now() where work_order_id=$1 and revoked_at is null",
      [id],
    );
    const r = await c.query(
      "insert into access_grants(work_order_id,token_hash,expires_at) values($1,$2,now()+($3*interval '1 day')) returning expires_at",
      [id, tokenHash(token), days.data],
    );
    await c.query(
      "insert into audit_events(actor,action,entity_type,entity_id) values('admin','link_rotated','work_order',$1)",
      [id],
    );
    await c.query("commit");
    return NextResponse.json(
      {
        url: `${process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin}/t/${token}`,
        expiresAt: r.rows[0].expires_at,
      },
      { headers: privateHeaders },
    );
  } catch (e) {
    await c.query("rollback");
    return failure(e);
  } finally {
    c.release();
  }
}
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const c = await db.connect();
  try {
    const id = validId((await params).id);
    await c.query("begin");
    await c.query("select id from work_orders where id=$1 for update", [id]);
    const r = await c.query(
      "update access_grants set revoked_at=now() where work_order_id=$1 and revoked_at is null returning id",
      [id],
    );
    await c.query(
      "insert into audit_events(actor,action,entity_type,entity_id) values('admin','links_revoked','work_order',$1)",
      [id],
    );
    await c.query("commit");
    return NextResponse.json({ revoked: r.rowCount }, { headers: privateHeaders });
  } catch (e) {
    await c.query("rollback");
    return failure(e);
  } finally {
    c.release();
  }
}
