import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "@chambi/domain";
import { allowRequest } from "@/lib/limits";
import { sameOrigin } from "@/lib/auth";
import { db } from "@/lib/db";
import { newOtp, otpHash, testOtpEnabled } from "@/lib/verification";
import { privateHeaders } from "@/lib/http";

const genericMessage =
  "Si existe una orden elegible, enviaremos instrucciones al contacto registrado.";
const normalizePlate = (value: string) => value.toUpperCase().replace(/[\s-]/g, "");
const activeStatuses = "'entregado','cancelado'";

function clientKey(request: Request) {
  const forwarded =
    process.env.TRUST_PROXY === "true"
      ? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      : "local";
  return forwarded && forwarded.length <= 100 ? forwarded : "unknown";
}

export async function POST(request: Request) {
  const fallbackId = randomUUID();
  const fallbackCode = testOtpEnabled() ? newOtp() : undefined;
  const generic = {
    requestId: fallbackId,
    message: genericMessage,
    ...(fallbackCode ? { testCode: fallbackCode } : {}),
  };
  if (!testOtpEnabled())
    return NextResponse.json(
      { error: "La recuperación en línea aún no está habilitada. Contacta al taller." },
      { status: 503, headers: privateHeaders },
    );
  if (!(await sameOrigin())) return NextResponse.json(generic, { headers: privateHeaders });

  const parsed = z
    .object({ plate: z.string().max(32) })
    .strict()
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json(generic, { headers: privateHeaders });
  const plate = normalizePlate(parsed.data.plate);
  if (!/^[A-Z0-9]{4,9}$/.test(plate))
    return NextResponse.json(generic, { headers: privateHeaders });

  const ip = clientKey(request);
  let sourceAllowed = false;
  let plateAllowed = false;
  try {
    sourceAllowed = await allowRequest("portal-recovery-source", ip, 20, 900);
    plateAllowed = await allowRequest("portal-recovery-plate", plate, 3, 900);
  } catch {
    return NextResponse.json(generic, { headers: privateHeaders });
  }
  if (!sourceAllowed || !plateAllowed)
    return NextResponse.json(generic, { headers: privateHeaders });

  try {
    const match = await db.query(
      `select w.id as work_order_id,c.id as contact_id
       from work_orders w
       join vehicles v on v.id=w.vehicle_id
       join work_order_contacts c on c.work_order_id=w.id
       where regexp_replace(upper(v.plate),'[^A-Z0-9]','','g')=$1
         and w.status not in (${activeStatuses})
         and c.relation_type='client' and c.can_view_progress
         and c.verified_at<=now() and c.revoked_at is null
         and (select count(*) from work_orders w2 join vehicles v2 on v2.id=w2.vehicle_id
              where regexp_replace(upper(v2.plate),'[^A-Z0-9]','','g')=$1
                and w2.status not in (${activeStatuses}))=1
         and (select count(*) from work_order_contacts c2
              where c2.work_order_id=w.id and c2.relation_type='client'
                and c2.can_view_progress and c2.verified_at<=now() and c2.revoked_at is null)=1
       limit 2`,
      [plate],
    );
    if (match.rows.length === 1) {
      const code = newOtp();
      const ipHash = createHash("sha256").update(ip).digest();
      await db.query(
        `insert into portal_recovery_challenges
         (id,work_order_id,contact_id,code_hash,expires_at,created_ip_hash)
         values($1,$2,$3,$4,now()+interval '5 minutes',$5)`,
        [
          fallbackId,
          match.rows[0].work_order_id,
          match.rows[0].contact_id,
          otpHash(fallbackId, code, "portal_recovery"),
          ipHash,
        ],
      );
      // This fake delivery is available only in local test mode. Production and
      // pilot builds return no code and fail closed until a provider is approved.
      return NextResponse.json({ ...generic, testCode: code }, { headers: privateHeaders });
    }
  } catch {
    // Keep invalid, ambiguous and transiently unavailable orders non-enumerable.
  }
  return NextResponse.json(generic, { headers: privateHeaders });
}
