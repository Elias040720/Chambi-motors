import { NextResponse } from "next/server";
import { z, taskTemplates } from "@chambi/domain";
import { authMode, isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { privateHeaders } from "@/lib/http";
export const dynamic = "force-dynamic";
export async function GET() {
  const { rows } = await db.query("select * from business_settings where id=true");
  const s = rows[0];
  return NextResponse.json(
    {
      authMode: authMode(),
      business: {
        name: s.name,
        phone: s.phone,
        hours: s.hours,
        privacyNotice: s.privacy_notice,
        retentionDays: s.retention_days,
        linkDays: s.link_days,
      },
      templates: s.task_templates ?? taskTemplates,
    },
    { headers: privateHeaders },
  );
}
export async function PATCH(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const p = z
    .object({
      name: z.string().trim().min(2).max(120),
      phone: z.string().regex(/^(?:\+?51)?9\d{8}$|^$/),
      hours: z.string().max(200),
      privacyNotice: z.string().max(3000).optional(),
      retentionDays: z.number().int().min(30).max(3650).optional(),
      linkDays: z.number().int().min(1).max(30).optional(),
      templates: z.array(z.string().trim().min(3).max(200)).min(1).max(30).optional(),
    })
    .safeParse(await request.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "Configuración no válida" }, { status: 400 });
  const s = p.data;
  await db.query(
    "update business_settings set name=$1,phone=$2,hours=$3,privacy_notice=coalesce($4,privacy_notice),retention_days=coalesce($5,retention_days),link_days=coalesce($6,link_days),task_templates=coalesce($7,task_templates) where id=true",
    [s.name, s.phone, s.hours, s.privacyNotice, s.retentionDays, s.linkDays, s.templates],
  );
  return GET();
}
