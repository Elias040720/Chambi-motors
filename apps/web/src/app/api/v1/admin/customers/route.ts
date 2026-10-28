import { NextResponse } from "next/server";
import { CustomerInput } from "@chambi/domain";
import { isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { privateHeaders } from "@/lib/http";
export const dynamic = "force-dynamic";
export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { rows } =
    await db.query(`select c.id,c.name,c.phone,c.email,c.contact_preference,c.created_at,
 coalesce((select json_agg(v) from (select id,plate,make,model,year,color,vin,mileage from vehicles where customer_id=c.id) v),'[]') vehicles,
 coalesce((select json_agg(w) from (select id,code,status,created_at from work_orders where customer_id=c.id order by created_at desc limit 20) w),'[]') history
 from customers c order by name limit 500`);
  return NextResponse.json({ customers: rows }, { headers: privateHeaders });
}
export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const p = CustomerInput.safeParse(await request.json().catch(() => null));
  if (!p.success)
    return NextResponse.json({ error: "Revisa nombre y teléfono peruano" }, { status: 400 });
  const { name, email } = p.data,
    phone = "+51" + p.data.phone.replace(/^(?:\+?51)/, "");
  const c = await db.connect();
  try {
    await c.query("begin");
    await c.query("select pg_advisory_xact_lock(hashtextextended($1,1))", [phone]);
    const existing = await c.query(
      "select id,name,phone,email,contact_preference from customers where regexp_replace(phone,'[^0-9]','','g') in ($1,$2) limit 1",
      [phone.slice(1), phone.slice(3)],
    );
    const r = existing.rowCount
      ? existing
      : await c.query(
          "insert into customers(name,phone,email,contact_preference) values($1,$2,$3,$4) returning id,name,phone,email,contact_preference",
          [name, phone, email || null, p.data.contactPreference ?? "whatsapp"],
        );
    await c.query("commit");
    return NextResponse.json({ customer: r.rows[0] }, { status: 201, headers: privateHeaders });
  } catch {
    await c.query("rollback");
    return NextResponse.json({ error: "No se pudo guardar el cliente" }, { status: 500 });
  } finally {
    c.release();
  }
}
