import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "dotenv";
import { evaluatePilotConfig, pilotEnvironment } from "./lib/pilot-config";
const path = resolve(process.argv[2] ?? ".env.pilot.local");
if (!existsSync(path)) {
  console.log(
    "BLOCKED configuración: falta el archivo local de piloto. Copia .env.pilot.example y completa valores fuera de Git.",
  );
  process.exitCode = 2;
} else {
  const values = parse(readFileSync(path));
  const result = evaluatePilotConfig(pilotEnvironment(values));
  for (const row of result) console.log(`${row.status} ${row.component}: ${row.message}`);
  console.log(
    "Comprobación offline: no conecta proveedores, no imprime valores secretos y no demuestra autenticación, permisos ni conectividad reales.",
  );
  if (result.some((r) => r.status === "BLOCKED")) process.exitCode = 2;
}
