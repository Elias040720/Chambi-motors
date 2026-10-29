import "./env";
import { Pool, type PoolClient } from "pg";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { databaseConnection } from "../apps/web/src/lib/db-config";
import { applicationTables, inspectPilotDatabase } from "./lib/pilot-inspection";
const pool = new Pool(databaseConnection());
async function fixtureAdmin(client: PoolClient) {
  const existing = await client.query(
    "select p.id,u.email from public.admin_profiles p join auth.users u on u.id=p.id limit 1",
  );
  if (existing.rows[0]) return existing.rows[0] as { id: string; email: string };
  const id = randomUUID(),
    email = `rls-${id}@example.test`;
  await client.query("insert into auth.users(id,email) values($1,$2)", [id, email]);
  await client.query("insert into public.admin_profiles(id) values($1)", [id]);
  return { id, email };
}
async function main() {
  const client = await pool.connect();
  let createdServiceRole = false;
  try {
    await client.query("begin");
    const serviceRole = await client.query(
      "select rolname from pg_roles where rolname='service_role'",
    );
    if (!serviceRole.rowCount) {
      const hostname = new URL(process.env.DATABASE_URL ?? "").hostname;
      if (!["localhost", "127.0.0.1", "[::1]"].includes(hostname))
        throw new Error("Temporary service_role creation is allowed only on loopback PostgreSQL");
      await client.query("create role service_role nologin bypassrls");
      createdServiceRole = true;
      await client.query("grant usage on schema public to service_role");
    }
    await client.query(
      await readFile(resolve("supabase/migrations/202610270007_backend_writes_only.sql"), "utf8"),
    );
    const owner = await fixtureAdmin(client);
    const admin = owner.id,
      outsider = randomUUID(),
      cust = randomUUID(),
      otherCustomer = randomUUID(),
      vehicle = randomUUID(),
      order = randomUUID(),
      quote = randomUUID(),
      line = randomUUID();
    await client.query("insert into auth.users(id,email) values($1,$2)", [
      outsider,
      `rls-${outsider}@example.test`,
    ]);
    if ((await fixtureAdmin(client)).id !== admin)
      throw new Error("Existing administrator must be preserved by RLS fixtures");
    await client.query("savepoint inspection_fixture");
    const storage = await client.query("select to_regclass('storage.buckets') as relation");
    if (!storage.rows[0]?.relation) {
      const host = new URL(process.env.DATABASE_URL ?? "").hostname;
      if (!["localhost", "127.0.0.1", "[::1]"].includes(host))
        throw new Error(
          "Storage inspection fixtures require local stub or existing Supabase Storage",
        );
      await client.query("create schema if not exists storage");
      await client.query(
        "create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[])",
      );
    }
    const inspectionBucket = `pilot-rls-${randomUUID()}`;
    await client.query(
      "insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values($1,$1,false,8388608,array['image/webp'])",
      [inspectionBucket],
    );
    const inspection = await inspectPilotDatabase((sql, values) => client.query(sql, values), {
      ADMIN_EMAIL: owner.email,
      SUPABASE_MEDIA_BUCKET: inspectionBucket,
    });
    if (inspection.length !== 5 || inspection.some((row) => row.status !== "PASS"))
      throw new Error("Metadata inspection SQL failed with synthetic transactional fixtures");
    await client.query("rollback to savepoint inspection_fixture");
    await client.query(
      "insert into customers(id,name,phone) values($1,'RLS test','999123456'),($2,'RLS other','999123457')",
      [cust, otherCustomer],
    );
    await client.query(
      "insert into vehicles(id,customer_id,plate,make,model) values($1,$2,'ZZ-100Z','Toyota','Yaris')",
      [vehicle, cust],
    );
    await client.query("savepoint mismatch");
    let mismatchRejected = false;
    try {
      await client.query(
        "insert into work_orders(id,customer_id,vehicle_id,concern) values($1,$2,$3,'mismatch fixture')",
        [randomUUID(), otherCustomer, vehicle],
      );
    } catch {
      mismatchRejected = true;
      await client.query("rollback to savepoint mismatch");
    }
    if (!mismatchRejected) throw new Error("vehicle/customer composite FK accepted a mismatch");
    await client.query(
      "insert into work_orders(id,customer_id,vehicle_id,concern) values($1,$2,$3,'RLS fixture')",
      [order, cust, vehicle],
    );
    await client.query(
      "insert into quotes(id,work_order_id,version,status,sealed) values($1,$2,1,'pendiente',false)",
      [quote, order],
    );
    await client.query(
      "insert into quote_lines(id,quote_id,description,kind,quantity,unit_price) values($1,$2,'Inspección','trabajo',1,50)",
      [line, quote],
    );
    await client.query("update quotes set sealed=true where id=$1", [quote]);
    const serverMissing = await client.query(
      `
      select c.relname,privilege from pg_class c
      join pg_namespace n on n.oid=c.relnamespace
      cross join (values('SELECT'),('INSERT'),('UPDATE'),('DELETE')) privileges(privilege)
      where n.nspname='public' and c.relname=any($1::text[])
        and not has_table_privilege('service_role',c.oid,privilege)
    `,
      [applicationTables],
    );
    if (serverMissing.rowCount)
      throw new Error(
        `Server role privileges missing: ${serverMissing.rows.map((row) => `${row.relname}:${row.privilege}`).join(", ")}`,
      );
    await client.query("savepoint service_access");
    await client.query("set local role service_role");
    await client.query("select set_config('request.jwt.claim.sub',$1,true)", [outsider]);
    const serverRead = await client.query("select id from customers where id=$1", [cust]);
    const serverCustomer = randomUUID();
    const serverInsert = await client.query(
      "insert into customers(id,name,phone) values($1,'Server role fixture','999123458') returning id",
      [serverCustomer],
    );
    const serverUpdate = await client.query(
      "update customers set name='Server role updated' where id=$1 returning id",
      [serverCustomer],
    );
    const serverDelete = await client.query("delete from customers where id=$1 returning id", [
      serverCustomer,
    ]);
    await client.query("rollback to savepoint service_access");
    if (
      [serverRead, serverInsert, serverUpdate, serverDelete].some((result) => result.rowCount !== 1)
    )
      throw new Error(
        "service_role must retain SELECT/INSERT/UPDATE/DELETE under the server grant branch",
      );
    const clientDml = await client.query(
      `
      select role_name,c.relname,privilege
      from pg_class c join pg_namespace n on n.oid=c.relnamespace
      cross join (values('authenticated'),('anon')) roles(role_name)
      cross join (values('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER')) privileges(privilege)
      where n.nspname='public' and c.relkind in ('r','p')
        and (c.relname=any($1::text[]) or exists(
          select 1 from pg_policy p where p.polrelid=c.oid
            and coalesce(pg_get_expr(p.polqual,p.polrelid),'') like '%is_workshop_admin%'
        ))
        and (has_table_privilege(role_name::name,c.oid,privilege) or
          case when privilege in ('INSERT','UPDATE','REFERENCES')
            then has_any_column_privilege(role_name::name,c.oid,privilege) else false end)
    `,
      [applicationTables],
    );
    if (clientDml.rowCount)
      throw new Error(
        `Client DML privileges remain: ${clientDml.rows.map((row) => `${row.role_name}:${row.relname}:${row.privilege}`).join(", ")}`,
      );
    async function rejectsDirectWrite(label: string, sql: string, values: unknown[]) {
      await client.query("savepoint direct_write");
      await client.query("set local role authenticated");
      await client.query("select set_config('request.jwt.claim.sub',$1,true)", [admin]);
      let sqlState: string | undefined;
      try {
        await client.query(sql, values);
      } catch (error) {
        sqlState =
          typeof error === "object" && error !== null && "code" in error
            ? String(error.code)
            : undefined;
      } finally {
        await client.query("rollback to savepoint direct_write");
      }
      if (sqlState !== "42501")
        throw new Error(
          `${label} must fail with SQLSTATE 42501; received ${sqlState ?? "success"}`,
        );
    }
    await rejectsDirectWrite(
      "Direct delivery bypass",
      "update work_orders set status='entregado',qa_passed=true where id=$1",
      [order],
    );
    await rejectsDirectWrite(
      "Direct quote approval bypass",
      "update quotes set status='aprobado' where id=$1",
      [quote],
    );
    await rejectsDirectWrite(
      "Forged QA inspection",
      "insert into inspections(work_order_id,items,passed,note) values($1,$2,true,'Forged client inspection')",
      [order, JSON.stringify([{ title: "Synthetic check", passed: true }])],
    );
    await rejectsDirectWrite(
      "Forged client quote decision",
      "insert into quote_decisions(quote_id,decision,channel,actor,evidence) values($1,'aprobado','otp','cliente_verificado','Forged client decision')",
      [quote],
    );
    await client.query("savepoint admin_access");
    await client.query("set local role authenticated");
    await client.query("select set_config('request.jwt.claim.sub',$1,true)", [admin]);
    const allow = await client.query("select id from customers where id=$1", [cust]);
    await client.query("rollback to savepoint admin_access");
    await client.query("savepoint outsider_access");
    await client.query("set local role authenticated");
    await client.query("select set_config('request.jwt.claim.sub',$1,true)", [outsider]);
    const deny = await client.query("select id from customers where id=$1", [cust]);
    await client.query("rollback to savepoint outsider_access");
    await client.query("savepoint anon_access");
    await client.query("set local role anon");
    let anonDenied = false;
    try {
      const anonymous = await client.query("select id from customers where id=$1", [cust]);
      anonDenied = anonymous.rowCount === 0;
    } catch (error) {
      anonDenied =
        typeof error === "object" && error !== null && "code" in error && error.code === "42501";
    }
    await client.query("rollback to savepoint anon_access");
    await client.query("update quotes set status='aprobado' where id=$1", [quote]);
    await client.query("savepoint quote_change");
    let quoteLocked = false;
    try {
      await client.query("update quote_lines set unit_price=55 where id=$1", [line]);
    } catch {
      quoteLocked = true;
      await client.query("rollback to savepoint quote_change");
    }
    const event = await client.query(
      "insert into work_order_events(work_order_id,event_type,actor) values($1,'test','admin') returning id",
      [order],
    );
    await client.query("savepoint event_change");
    let eventLocked = false;
    try {
      await client.query("update work_order_events set event_type='changed' where id=$1", [
        event.rows[0].id,
      ]);
    } catch {
      eventLocked = true;
      await client.query("rollback to savepoint event_change");
    }
    if (
      allow.rowCount !== 1 ||
      deny.rowCount !== 0 ||
      !anonDenied ||
      !mismatchRejected ||
      !quoteLocked ||
      !eventLocked
    )
      throw new Error(
        `Security/integrity failed: admin=${allow.rowCount}, outsider=${deny.rowCount}, anon=${anonDenied}, vehicle=${mismatchRejected}, quote=${quoteLocked}, event=${eventLocked}`,
      );
  } finally {
    let rolledBack = false;
    try {
      await client.query("rollback");
      rolledBack = true;
    } finally {
      client.release(!rolledBack);
    }
    if (createdServiceRole) {
      const remaining = await pool.query("select 1 from pg_roles where rolname='service_role'");
      if (remaining.rowCount)
        throw new Error("Temporary service_role unexpectedly persisted after rollback");
      console.log(
        "PASS: temporary service_role is absent in a catalog query outside the rolled-back transaction.",
      );
    }
  }
  console.log(
    "PASS (rolled back fixtures): service_role SELECT/INSERT/UPDATE/DELETE and all explicit server grants; admin SELECT allowed, outsider/anon denied; client roles have no DML; delivery/quote/inspection/decision bypasses reject SQLSTATE 42501; owner writes, vehicle FK, quote immutability and append-only history preserved.",
  );
}
main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
