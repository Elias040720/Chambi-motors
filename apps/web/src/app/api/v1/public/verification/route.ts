import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "@chambi/domain";
import { sameOrigin } from "@/lib/auth";
import { publicGrant, remoteApprovalEnabled } from "@/lib/public-order";
import { allowRequest } from "@/lib/limits";
import { db } from "@/lib/db";
import { newOtp, otpHash, testOtpEnabled, twilioVerify } from "@/lib/verification";
import { DomainError } from "@/lib/orders";
import { failure, privateHeaders } from "@/lib/http";
export async function POST(request: Request) {
  try {
    if (!(await sameOrigin())) throw new DomainError("Origen no permitido", 403);
    if (!remoteApprovalEnabled())
      throw new DomainError(
        "La aprobación remota no está configurada. Coordina con el taller.",
        503,
      );
    const p = z
      .object({ quoteId: z.string().uuid() })
      .safeParse(await request.json().catch(() => null));
    if (!p.success) throw new DomainError("Presupuesto no válido", 400);
    const g = await publicGrant();
    let verifiedPhone: string | undefined;
    if (g.contact_id) {
      const authorization = await db.query(
        `select phone_e164 from work_order_contacts
         where id=$1 and work_order_id=$2 and relation_type='client'
           and can_approve_quote and can_view_progress and verified_at<=now() and revoked_at is null`,
        [g.contact_id, g.work_order_id],
      );
      if (!authorization.rowCount)
        throw new DomainError("Este contacto no está autorizado para aprobar presupuestos", 403);
      verifiedPhone = authorization.rows[0].phone_e164;
    }
    if (!(await allowRequest("otp", g.id, 3, 900)))
      throw new DomainError("Espera antes de solicitar otro código", 429);
    const q = await db.query(
      "select id from quotes where id=$1 and work_order_id=$2 and status='pendiente' and (expires_at is null or expires_at>now()) and version=(select max(version) from quotes where work_order_id=$2)",
      [p.data.quoteId, g.work_order_id],
    );
    if (!q.rowCount) throw new DomainError("Presupuesto no disponible", 404);
    const id = randomUUID(),
      test = testOtpEnabled(),
      code = test ? newOtp() : null;
    if (!test) {
      if (!verifiedPhone) {
        const contact = await db.query(
          "select c.phone from customers c join work_orders w on w.customer_id=c.id where w.id=$1",
          [g.work_order_id],
        );
        verifiedPhone = contact.rows[0]?.phone;
      }
      if (!(await twilioVerify(verifiedPhone ?? "")))
        throw new DomainError("No pudimos enviar el código. Coordina con el taller.", 503);
    }
    await db.query(
      "insert into verification_challenges(id,grant_id,quote_id,code_hash) values($1,$2,$3,$4)",
      [id, g.id, p.data.quoteId, code ? otpHash(id, code) : null],
    );
    return NextResponse.json(
      {
        challengeId: id,
        message: test
          ? "Código de prueba local, no se envió SMS"
          : "Enviamos un código al celular registrado",
        ...(code ? { testCode: code } : {}),
      },
      { headers: privateHeaders },
    );
  } catch (e) {
    return failure(e);
  }
}
