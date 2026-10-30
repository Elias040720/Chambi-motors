import { cookies } from "next/headers";
import { db } from "./db";
import { tokenHash } from "./auth";
import { mediaSignature } from "./media";
import { DomainError } from "./orders";
import { commercialOtpAllowed } from "./verification";
export function remoteApprovalEnabled() {
  return (
    (commercialOtpAllowed() &&
      process.env.OTP_PROVIDER === "twilio" &&
      !!process.env.TWILIO_ACCOUNT_SID &&
      !!process.env.TWILIO_AUTH_TOKEN &&
      !!process.env.TWILIO_VERIFY_SERVICE_SID) ||
    (process.env.NODE_ENV !== "production" && process.env.ENABLE_TEST_OTP === "true")
  );
}
export async function publicGrant(orderId?: string) {
  const token = (await cookies()).get("cm_view")?.value;
  if (!token || token.length > 100) throw new DomainError("Enlace no válido o vencido", 404);
  const r = await db.query(
    `select g.id,g.work_order_id,g.expires_at from access_grants g
 where token_hash=$1 and expires_at>now() and revoked_at is null
 and (contact_id is null or exists(select 1 from work_order_contacts c where c.id=g.contact_id and c.work_order_id=g.work_order_id and c.revoked_at is null and c.verified_at<=now() and c.can_view_progress))
 and ($2::uuid is null or g.work_order_id=$2)`,
    [tokenHash(token), orderId ?? null],
  );
  if (!r.rows[0]) throw new DomainError("Enlace no válido o vencido", 404);
  return r.rows[0];
}
export async function getPublicOrder(orderId?: string) {
  const grant = await publicGrant(orderId),
    id = grant.work_order_id;
  const { rows } = await db.query(
    `select w.id,w.code,w.status,w.version,w.created_at,w.updated_at,w.eta_from,w.eta_to,w.eta_confidence,w.public_notes,w.delivery_summary,w.delivered_at,w.warranty,v.make,v.model,v.plate,
 (select reason from eta_revisions where work_order_id=w.id order by created_at desc limit 1) eta_reason,
 coalesce((select floor(sum(case when completed_at is not null then weight else 0 end)*100.0/nullif(sum(weight),0)) from work_order_tasks where work_order_id=w.id),0)::int progress,
 coalesce((select json_agg(json_build_object('title',title,'completed',completed_at is not null) order by created_at) from work_order_tasks where work_order_id=w.id and visible_to_customer),'[]') tasks,
 coalesce((select json_agg(json_build_object('kind',kind,'reason',reason)) from work_order_blockers where work_order_id=w.id and resolved_at is null),'[]') blockers,
 coalesce((select json_agg(json_build_object('type',event_type,'toStatus',to_status,'reason',reason,'createdAt',created_at) order by created_at desc) from work_order_events where work_order_id=w.id and visible_to_customer),'[]') events,
 coalesce((select json_agg(json_build_object('id',q.id,'version',q.version,'status',case when q.status='pendiente' and q.expires_at<now() then 'vencido' else q.status end,'expiresAt',q.expires_at,
 'lines',(select json_agg(json_build_object('description',description,'kind',kind,'quantity',quantity,'unitPrice',unit_price)) from quote_lines where quote_id=q.id),
 'total',(select sum(round(quantity*unit_price,2)) from quote_lines where quote_id=q.id),
 'decision',(select json_build_object('decision',decision,'channel',channel,'createdAt',created_at) from quote_decisions where quote_id=q.id)) order by q.version desc) from quotes q where work_order_id=w.id),'[]') quotes,
 coalesce((select json_agg(json_build_object('description',description,'status',status,'resolution',resolution,'promisedAt',promised_at)) from part_requests where work_order_id=w.id),'[]') parts,
 coalesce((select json_agg(json_build_object('id',id,'category',category,'caption',caption)) from media_assets where work_order_id=w.id and visible_to_customer),'[]') media
 from work_orders w join vehicles v on v.id=w.vehicle_id where w.id=$1`,
    [id],
  );
  const s = await db.query(
    "select name,phone,hours,privacy_notice from business_settings where id=true",
  );
  const diagnosis = await db.query(
    `select revision,effective_kind,public_summary,published_at from diagnosis_revisions
     where work_order_id=$1 and published_at is not null order by revision desc limit 1`,
    [id],
  );
  const result = rows[0];
  const expires = Math.floor(Date.now() / 1000) + 300;
  result.media = result.media.map(
    (m: { id: string; category: string; caption: string | null }) => ({
      ...m,
      url: `/api/v1/public/media/${m.id}?exp=${expires}&sig=${mediaSignature(m.id, grant.id, expires)}`,
    }),
  );
  const latestDiagnosis = diagnosis.rows[0];
  return {
    ...result,
    diagnosis: latestDiagnosis
      ? {
          revision: latestDiagnosis.revision,
          label:
            latestDiagnosis.effective_kind === "preliminary"
              ? "Evaluación inicial, pendiente de confirmar"
              : "Diagnóstico confirmado",
          summary: latestDiagnosis.public_summary,
          updatedAt: latestDiagnosis.published_at,
        }
      : null,
    business: s.rows[0],
    remoteApprovalEnabled: remoteApprovalEnabled(),
  };
}
