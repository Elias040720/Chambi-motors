import "./env";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Pool } from "pg";
import { databaseConnection } from "../apps/web/src/lib/db-config";
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required");
if (process.env.NODE_ENV === "production" && process.env.LOCAL_AUTH_STUB === "true")
  throw new Error("LOCAL_AUTH_STUB must never be enabled in production");
const pool = new Pool(databaseConnection());
async function main() {
  const c = await pool.connect();
  try {
    if (process.env.LOCAL_AUTH_STUB === "true")
      await c.query(await readFile(resolve("supabase/local-auth.sql"), "utf8"));
    await c.query(
      "create table if not exists public.schema_migrations(name text primary key, applied_at timestamptz not null default now())",
    );
    const files = (await readdir("supabase/migrations")).filter((x) => x.endsWith(".sql")).sort();
    for (const name of files) {
      const seen = await c.query("select 1 from public.schema_migrations where name=$1", [name]);
      if (seen.rowCount) continue;
      await c.query("begin");
      try {
        await c.query(await readFile(resolve("supabase/migrations", name), "utf8"));
        await c.query("insert into public.schema_migrations(name) values($1)", [name]);
        await c.query("commit");
        console.log(`APPLIED ${name}`);
      } catch (e) {
        await c.query("rollback");
        throw e;
      }
    }
  } finally {
    c.release();
  }
}
main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : "Migration failed");
    process.exitCode = 1;
  })
  .finally(() => pool.end());
