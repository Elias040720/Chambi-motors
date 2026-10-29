import { Pool } from "pg";
import { databaseConnection } from "../apps/web/src/lib/db-config";
import { evaluatePilotConfig } from "./lib/pilot-config";
import { inspectAuthSettings, inspectPilotDatabase, type Inspection } from "./lib/pilot-inspection";

async function main() {
  const env = process.env;
  const gates = evaluatePilotConfig(env, "database").filter((gate) => gate.status === "BLOCKED");
  if (gates.length) {
    for (const gate of gates) console.log(`BLOCKED ${gate.component}: ${gate.message}`);
    process.exitCode = 2;
    return;
  }
  const results: Inspection[] = [];
  const pool = new Pool({ ...databaseConnection(env), connectionTimeoutMillis: 5000 });
  let client;
  try {
    client = await pool.connect();
    await client.query("begin read only");
    await client.query("set local statement_timeout='8s'");
    await client.query("set local lock_timeout='2s'");
    results.push(...(await inspectPilotDatabase((sql, values) => client!.query(sql, values), env)));
  } catch {
    results.push({
      component: "PostgreSQL",
      status: "BLOCKED",
      message:
        "Conexión/lectura no disponible; confirmar red, TLS y permisos sin publicar la cadena de conexión.",
    });
  } finally {
    if (client) {
      try {
        await client.query("rollback");
        client.release();
      } catch {
        client.release(true);
      }
    }
    await pool.end();
  }
  results.push(await inspectAuthSettings(env));
  for (const row of results) console.log(`${row.status} ${row.component}: ${row.message}`);
  console.log(
    "Solo metadatos y GET settings: no crea usuarios, órdenes, objetos, proyectos ni envía correo/SMS. Login, recuperación, fotos y aislamiento funcional siguen pendientes.",
  );
  process.exitCode = results.some((row) => row.status === "FAIL")
    ? 1
    : results.some((row) => row.status === "BLOCKED")
      ? 2
      : 0;
}
main().catch(() => {
  console.error("BLOCKED inspección: error de preparación sin exponer credenciales.");
  process.exitCode = 2;
});
