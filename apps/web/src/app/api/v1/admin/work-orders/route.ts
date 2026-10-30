import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z, VehicleInput, WorkOrderInput } from "@chambi/domain";
import { isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { DomainError } from "@/lib/orders";
import { failure, privateHeaders } from "@/lib/http";
export const dynamic = "force-dynamic";
export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { rows } =
    await db.query(`select w.id,w.code,w.status,w.concern,w.version,w.created_at,w.updated_at,w.eta_to,c.name customer_name,v.plate,v.make,v.model,
 coalesce((select floor(sum(case when completed_at is not null then weight else 0 end)*100.0/nullif(sum(weight),0)) from work_order_tasks where work_order_id=w.id),0)::int progress,
 coalesce((select json_agg(json_build_object('id',b.id,'kind',b.kind,'reason',b.reason)) from work_order_blockers b where b.work_order_id=w.id and b.resolved_at is null),'[]') blockers
 from work_orders w join customers c on c.id=w.customer_id join vehicles v on v.id=w.vehicle_id order by w.updated_at desc limit 500`);
  return NextResponse.json({ workOrders: rows }, { headers: privateHeaders });
}
const inputSchema = WorkOrderInput.extend({
  vehicle: VehicleInput,
  idempotencyKey: z.string().uuid().optional(),
  intake: z
    .object({
      fuel: z.string().max(100).optional(),
      accessories: z.string().max(1000).optional(),
      damage: z.string().max(2000).optional(),
      checklist: z.array(z.string().max(200)).max(30).optional(),
    })
    .optional(),
});
export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const p = inputSchema.safeParse(await request.json().catch(() => null));
  if (!p.success)
    return NextResponse.json({ error: "Datos de orden o vehículo incompletos" }, { status: 400 });
  const s = p.data,
    hash = createHash("sha256")
      .update(JSON.stringify({ kind: "order.create", input: s }))
      .digest(),
    c = await db.connect();
  try {
    await c.query("begin");
    if (s.idempotencyKey) {
      await c.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [s.idempotencyKey]);
      const prior = await c.query("select * from api_idempotency where idempotency_key=$1", [
        s.idempotencyKey,
      ]);
      if (prior.rowCount) {
        if (!prior.rows[0].request_hash.equals(hash))
          throw new DomainError("La clave de reintento ya se usó con otros datos", 409);
        await c.query("commit");
        return NextResponse.json(prior.rows[0].response, { status: 201, headers: privateHeaders });
      }
    }
    if (!(await c.query("select id from customers where id=$1", [s.customerId])).rowCount)
      throw new DomainError("Cliente no encontrado", 404);
    let v = await c.query("select id from vehicles where customer_id=$1 and plate=$2", [
      s.customerId,
      s.vehicle.plate,
    ]);
    if (s.vehicleId && !v.rows.some((row) => row.id === s.vehicleId))
      throw new DomainError("El vehículo no pertenece al cliente o la placa no coincide");
    if (!v.rowCount)
      v = await c.query(
        "insert into vehicles(customer_id,plate,make,model,year,color,mileage,vin) values($1,$2,$3,$4,$5,$6,$7,$8) returning id",
        [
          s.customerId,
          s.vehicle.plate,
          s.vehicle.make,
          s.vehicle.model,
          s.vehicle.year ?? null,
          s.vehicle.color ?? null,
          s.vehicle.mileage ?? s.mileage ?? 0,
          s.vehicle.vin ?? null,
        ],
      );
    await c.query(
      "update vehicles set mileage=greatest(mileage,$2),vin=coalesce(nullif($3,''),vin) where id=$1",
      [v.rows[0].id, s.mileage ?? s.vehicle.mileage ?? 0, s.vehicle.vin ?? null],
    );
    const order = await c.query(
      "insert into work_orders(customer_id,vehicle_id,concern,mileage,intake) values($1,$2,$3,$4,$5) returning id,code,status,version,created_at",
      [
        s.customerId,
        v.rows[0].id,
        s.concern,
        s.mileage ?? s.vehicle.mileage ?? null,
        s.intake ?? {},
      ],
    );
    await c.query(
      "insert into work_order_events(work_order_id,event_type,to_status,visible_to_customer,actor) values($1,'work_order_created','recepcion',true,'admin')",
      [order.rows[0].id],
    );
    await c.query(
      "insert into audit_events(actor,action,entity_type,entity_id) values('admin','work_order_created','work_order',$1)",
      [order.rows[0].id],
    );
    const response = { workOrder: order.rows[0] };
    if (s.idempotencyKey)
      await c.query(
        "insert into api_idempotency(idempotency_key,request_hash,response) values($1,$2,$3)",
        [s.idempotencyKey, hash, response],
      );
    await c.query("commit");
    return NextResponse.json(response, { status: 201, headers: privateHeaders });
  } catch (e) {
    await c.query("rollback");
    return failure(e);
  } finally {
    c.release();
  }
}
