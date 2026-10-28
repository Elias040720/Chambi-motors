import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "@chambi/domain";
import { sameOrigin } from "@/lib/auth";
import { publicGrant, remoteApprovalEnabled } from "@/lib/public-order";
import { mutateOrder, decideQuote, DomainError } from "@/lib/orders";
import { otpHash, testOtpEnabled, twilioVerify } from "@/lib/verification";
import { allowRequest } from "@/lib/limits";
import { db } from "@/lib/db";
import { failure, privateHeaders } from "@/lib/http";
export async function POST(request: Request) {
  try {
    if (!(await sameOrigin())) throw new DomainError("Origen no permitido", 403);
    if (!remoteApprovalEnabled()) throw new DomainError("Aprobación remota no configurada", 503);
    const p = z
      .object({
        challengeId: z.string().uuid(),
        quoteId: z.string().uuid(),
        code: z.string().regex(/^\d{6}$/),
        decision: z.enum(["aprobado", "rechazado"]),
        expectedVersion: z.number().int().positive(),
        idempotencyKey: z.string().uuid(),
      })
      .safeParse(await request.json().catch(() => null));
    if (!p.success) throw new DomainError("Datos de confirmación no válidos", 400);
    const a = p.data,
      g = await publicGrant();
    if (!(await allowRequest("otp-check", g.id, 10, 900)))
      throw new DomainError("Demasiados intentos", 429);
    // Attempts are persisted outside the mutation transaction, including failed checks.
    const challenge = await db.query(
      "update verification_challenges set attempts=attempts+1 where id=$1 and grant_id=$2 and quote_id=$3 and attempts<5 and used_at is null and expires_at>now() returning *",
      [a.challengeId, g.id, a.quoteId],
    );
    const ch = challenge.rows[0];
    const result = await mutateOrder(
      g.work_order_id,
      a,
      "quote.decide.remote",
      async (c) => {
        const active = await c.query(
          "select id from access_grants where id=$1 and revoked_at is null and expires_at>clock_timestamp() for update",
          [g.id],
        );
        if (!active.rowCount) throw new DomainError("Enlace no válido o vencido", 404);
        if (!ch) throw new DomainError("Código vencido o agotado; solicita uno nuevo");
        const lock = await c.query(
          "select used_at,expires_at>clock_timestamp() as unexpired from verification_challenges where id=$1 for update",
          [a.challengeId],
        );
        if (!lock.rows[0]?.unexpired) throw new DomainError("Código vencido; solicita uno nuevo");
        if (lock.rows[0].used_at) throw new DomainError("El código ya fue utilizado");
        const contact = testOtpEnabled()
          ? null
          : await c.query(
              "select c.phone from customers c join work_orders w on w.customer_id=c.id where w.id=$1",
              [g.work_order_id],
            );
        const valid = testOtpEnabled()
          ? ch.code_hash && timingSafeEqual(ch.code_hash, otpHash(ch.id, a.code))
          : await twilioVerify(contact?.rows[0]?.phone ?? "", a.code);
        if (!valid) throw new DomainError("Código no válido");
        const quote = await c.query(
          "select * from quotes where id=$1 and work_order_id=$2 for update",
          [a.quoteId, g.work_order_id],
        );
        if (!quote.rows[0]) throw new DomainError("Presupuesto no encontrado", 404);
        const lease = await c.query(
          "select g.expires_at>clock_timestamp() and g.revoked_at is null grant_live,v.expires_at>clock_timestamp() and v.used_at is null challenge_live from access_grants g join verification_challenges v on v.grant_id=g.id where g.id=$1 and v.id=$2",
          [g.id, a.challengeId],
        );
        if (!lease.rows[0]?.grant_live) throw new DomainError("Enlace no válido o vencido", 404);
        if (!lease.rows[0].challenge_live)
          throw new DomainError("Código vencido; solicita uno nuevo");
        await decideQuote(
          c,
          g.work_order_id,
          quote.rows[0],
          a.decision,
          "otp",
          "Contacto verificado por código de un solo uso",
        );
        await c.query("update verification_challenges set used_at=now() where id=$1", [
          a.challengeId,
        ]);
      },
      null,
      true,
      "cliente_verificado",
    );
    return NextResponse.json(
      { ok: true, version: result.workOrder.version },
      { headers: privateHeaders },
    );
  } catch (e) {
    return failure(e);
  }
}
