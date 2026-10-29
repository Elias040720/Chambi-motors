export const applicationTables = [
  "admin_profiles",
  "customers",
  "vehicles",
  "work_orders",
  "work_order_tasks",
  "quotes",
  "quote_lines",
  "quote_decisions",
  "part_requests",
  "part_receipts",
  "media_assets",
  "work_order_events",
  "access_grants",
  "notification_outbox",
  "audit_events",
  "eta_revisions",
  "admin_sessions",
  "api_idempotency",
  "work_order_blockers",
  "inspections",
  "business_settings",
  "request_limits",
  "verification_challenges",
  "schema_migrations",
];
export type Inspection = {
  component: string;
  status: "PASS" | "FAIL" | "BLOCKED";
  message: string;
};
type Env = Record<string, string | undefined>;
type Query = (sql: string, values?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;

// Caller must open a READ ONLY transaction. Never select customer/order contents.
export async function inspectPilotDatabase(query: Query, env: Env): Promise<Inspection[]> {
  const results: Inspection[] = [];
  const add = (component: string, ok: boolean, message: string) =>
    results.push({ component, status: ok ? "PASS" : "FAIL", message });
  try {
    const tables = await query(
      "select c.relname,c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and c.relname=any($1::text[])",
      [applicationTables],
    );
    if (tables.rows.length !== applicationTables.length)
      return [
        {
          component: "Esquema",
          status: "BLOCKED",
          message:
            "Faltan tablas de la aplicación; aplicar migraciones autorizadas antes de verificar.",
        },
      ];
    add(
      "RLS configurado",
      tables.rows.every((r) => r.relname === "schema_migrations" || r.relrowsecurity === true),
      "RLS habilitado en las tablas operativas; no prueba autorización HTTP.",
    );
    const migrations = await query(
      "select name from public.schema_migrations where name='202610270007_backend_writes_only.sql'",
    );
    add("Migración 007", migrations.rows.length === 1, "Revocación de DML cliente registrada.");
    const dml = await query(
      `select c.relname,role_name,privilege from pg_class c
      join pg_namespace n on n.oid=c.relnamespace
      cross join (values('authenticated'),('anon')) roles(role_name)
      cross join (values('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER')) rights(privilege)
      where n.nspname='public' and c.relname=any($1::text[])
      and (has_table_privilege(role_name,c.oid,privilege) or
        case when privilege in ('INSERT','UPDATE','REFERENCES') then has_any_column_privilege(role_name,c.oid,privilege) else false end)`,
      [applicationTables],
    );
    add(
      "DML cliente",
      dml.rows.length === 0,
      "Sin privilegios efectivos de escritura de tabla/columna para anon/authenticated.",
    );
    const profile = await query(
      "select count(*)::int as total,count(*) filter(where lower(u.email)=lower($1))::int as matching from public.admin_profiles p join auth.users u on u.id=p.id",
      [env.ADMIN_EMAIL],
    );
    add(
      "Perfil administrador",
      profile.rows[0]?.total === 1 && profile.rows[0]?.matching === 1,
      "Un solo perfil coincide con la cuenta configurada; no se muestran correos ni UUID.",
    );
    const bucket = await query(
      "select public,file_size_limit,allowed_mime_types from storage.buckets where id=$1",
      [env.SUPABASE_MEDIA_BUCKET],
    );
    if (!bucket.rows.length)
      results.push({
        component: "Bucket",
        status: "BLOCKED",
        message: "Falta provisionar el bucket privado de piloto.",
      });
    else {
      const b = bucket.rows[0];
      add(
        "Bucket",
        b.public === false &&
          Number(b.file_size_limit) > 0 &&
          Number(b.file_size_limit) <= 8388608 &&
          Array.isArray(b.allowed_mime_types) &&
          b.allowed_mime_types.length === 1 &&
          b.allowed_mime_types[0] === "image/webp",
        "Bucket privado, hasta 8 MB y solo WebP; carga/lectura real aún requieren prueba funcional.",
      );
    }
  } catch {
    results.push({
      component: "SQL de inspección",
      status: "BLOCKED",
      message:
        "No se pudo completar la lectura de metadatos; revisar acceso, migraciones y esquema Storage sin publicar errores con secretos.",
    });
  }
  return results;
}

export async function inspectAuthSettings(
  env: Env,
  request: typeof fetch = fetch,
): Promise<Inspection> {
  try {
    const url = new URL(env.SUPABASE_URL ?? "");
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== "/" ||
      !env.SUPABASE_ANON_KEY
    )
      throw new Error("Invalid provider configuration");
    const response = await request(`${url.origin}/auth/v1/settings`, {
      method: "GET",
      headers: { apikey: env.SUPABASE_ANON_KEY },
      redirect: "error",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error("Unavailable settings");
    const settings = await response.json();
    if (
      typeof settings?.disable_signup !== "boolean" ||
      typeof settings?.external?.email !== "boolean" ||
      typeof settings?.external?.anonymous_users !== "boolean"
    )
      throw new Error("Unknown settings contract");
    return {
      component: "Auth configuración",
      status:
        settings.disable_signup && settings.external.email && !settings.external.anonymous_users
          ? "PASS"
          : "FAIL",
      message:
        "Signup cerrado, proveedor email activo y acceso anónimo deshabilitado; no inicia sesión ni envía recuperación.",
    };
  } catch {
    return {
      component: "Auth configuración",
      status: "BLOCKED",
      message:
        "No se pudo verificar GET settings mediante HTTPS; sin mostrar respuesta, claves o detalles del proveedor.",
    };
  }
}
