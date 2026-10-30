import { randomBytes, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "@chambi/domain";
import { sameOrigin, tokenHash } from "@/lib/auth";
import { allowRequest } from "@/lib/limits";
import { db } from "@/lib/db";
import { otpHash, testOtpEnabled } from "@/lib/verification";
import { privateHeaders } from "@/lib/http";

const invalidMessage = "El código no es válido o venció. Solicita otro e inténtalo nuevamente.";

function clientKey(request: Request) {
  const forwarded =
    process.env.TRUST_PROXY === "true"
      ? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      : "local";
  return forwarded && forwarded.length <= 100 ? forwarded : "unknown";
}

export async function POST(request: Request) {
  if (!(await sameOrigin()))
    return NextResponse.json(
      { error: "Origen no permitido" },
      { status: 403, headers: privateHeaders },
    );
  if (!testOtpEnabled())
    return NextResponse.json(
      { error: "La recuperación en línea aún no está habilitada." },
      { status: 503, headers: privateHeaders },
    );
  const parsed = z
    .object({ requestId: z.string().uuid(), code: z.string().regex(/^\d{6}$/) })
    .strict()
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: invalidMessage }, { status: 400, headers: privateHeaders });

  const source = clientKey(request);
  if (
    !(await allowRequest("portal-recovery-verify-source", source, 20, 900)) ||
    !(await allowRequest("portal-recovery-verify-request", parsed.data.requestId, 5, 900))
  )
    return NextResponse.json(
      { error: invalidMessage },
      { status: 400, headers: { ...privateHeaders, "Retry-After": "900" } },
    );

  const client = await db.connect();
  try {
    await client.query("begin");
    const ref = await client.query(
      "select work_order_id,contact_id from portal_recovery_challenges where id=$1",
      [parsed.data.requestId],
    );
    if (!ref.rowCount) {
      await client.query("commit");
      return NextResponse.json({ error: invalidMessage }, { status: 400, headers: privateHeaders });
    }
    const order = await client.query("select status from work_orders where id=$1 for update", [
      ref.rows[0].work_order_id,
    ]);
    const contact = await client.query(
      `select id from work_order_contacts where id=$1 and work_order_id=$2 and revoked_at is null
       and verified_at<=now() and can_view_progress and relation_type='client' for update`,
      [ref.rows[0].contact_id, ref.rows[0].work_order_id],
    );
    const challenge = await client.query(
      `select id,code_hash,expires_at,attempts,consumed_at from portal_recovery_challenges
       where id=$1 and work_order_id=$2 and contact_id=$3 for update`,
      [parsed.data.requestId, ref.rows[0].work_order_id, ref.rows[0].contact_id],
    );
    const row = challenge.rows[0];
    if (
      !order.rowCount ||
      !contact.rowCount ||
      !row ||
      ["entregado", "cancelado"].includes(order.rows[0].status) ||
      row.consumed_at ||
      new Date(row.expires_at).getTime() <= Date.now() ||
      row.attempts >= 5
    ) {
      await client.query("commit");
      return NextResponse.json({ error: invalidMessage }, { status: 400, headers: privateHeaders });
    }
    await client.query("update portal_recovery_challenges set attempts=attempts+1 where id=$1", [
      parsed.data.requestId,
    ]);
    const candidate = otpHash(parsed.data.requestId, parsed.data.code, "portal_recovery");
    if (!timingSafeEqual(candidate, row.code_hash)) {
      await client.query("commit");
      return NextResponse.json({ error: invalidMessage }, { status: 400, headers: privateHeaders });
    }
    const token = randomBytes(32).toString("base64url");
    await client.query("update portal_recovery_challenges set consumed_at=now() where id=$1", [
      parsed.data.requestId,
    ]);
    await client.query(
      `insert into access_grants(work_order_id,contact_id,scope,token_hash,expires_at)
       values($1,$2,'view_progress',$3,now()+interval '30 minutes')`,
      [ref.rows[0].work_order_id, ref.rows[0].contact_id, tokenHash(token)],
    );
    await client.query(
      "insert into work_order_events(work_order_id,event_type,reason,visible_to_customer,actor) values($1,'portal.recovered','Se recuperó el acceso de seguimiento',false,'verified_contact')",
      [ref.rows[0].work_order_id],
    );
    await client.query(
      "insert into audit_events(actor,action,entity_type,entity_id) values('verified_contact','portal_link_recovered','work_order',$1)",
      [ref.rows[0].work_order_id],
    );
    await client.query("commit");
    const response = NextResponse.json(
      { redirectTo: `/seguimiento/${ref.rows[0].work_order_id}` },
      { headers: privateHeaders },
    );
    response.cookies.set("cm_view", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 60,
    });
    return response;
  } catch {
    await client.query("rollback").catch(() => {});
    return NextResponse.json({ error: invalidMessage }, { status: 400, headers: privateHeaders });
  } finally {
    client.release();
  }
}
