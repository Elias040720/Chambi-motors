import { NextResponse } from "next/server";
import { z, CustomerInput } from "@chambi/domain";
import { isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { failure, privateHeaders, validId } from "@/lib/http";
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const p = CustomerInput.extend({
    contactPreference: z.enum(["whatsapp", "phone", "email"]).optional(),
  }).safeParse(await request.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "Revisa nombre y teléfono" }, { status: 400 });
  try {
    const s = p.data;
    const r = await db.query(
      "update customers set name=$2,phone=$3,email=$4,contact_preference=coalesce($5,contact_preference),updated_at=now() where id=$1 returning id,name,phone,email",
      [
        validId((await params).id),
        s.name,
        s.phone.replace(/^(?:\+?51)?/, "+51"),
        s.email || null,
        s.contactPreference,
      ],
    );
    return NextResponse.json(
      { customer: r.rows[0] },
      { status: r.rowCount ? 200 : 404, headers: privateHeaders },
    );
  } catch (e) {
    return failure(e);
  }
}
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const r = await db.query("delete from customers where id=$1 returning id", [
      validId((await params).id),
    ]);
    return NextResponse.json({ deleted: !!r.rowCount }, { headers: privateHeaders });
  } catch {
    return NextResponse.json(
      {
        error:
          "El cliente tiene vehículos o historial. Conserva el registro y aplica tu política de retención.",
      },
      { status: 409 },
    );
  }
}
