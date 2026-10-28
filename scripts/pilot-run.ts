import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { parse } from "dotenv";
import { evaluatePilotConfig } from "./lib/pilot-config";

const mode = process.argv[2];
const file = resolve(process.argv[3] ?? ".env.pilot.local");
if (!["migrate", "rls", "build", "start"].includes(mode) || !existsSync(file)) {
  console.error("BLOCKED: usa migrate/rls/build/start y un archivo local de piloto completo.");
  process.exitCode = 2;
} else {
  const env = { ...process.env, ...parse(readFileSync(file)) };
  const blocked = evaluatePilotConfig(env).filter((gate) => gate.status === "BLOCKED");
  if (blocked.length) {
    for (const gate of blocked) console.error(`BLOCKED ${gate.component}: ${gate.message}`);
    process.exitCode = 2;
  } else {
    const databaseTask = mode === "migrate" || mode === "rls";
    const command = databaseTask
      ? [
          resolve("node_modules/tsx/dist/cli.mjs"),
          resolve(mode === "rls" ? "scripts/test-rls.ts" : "scripts/migrate.ts"),
        ]
      : [resolve("apps/web/node_modules/next/dist/bin/next"), mode];
    const result = spawnSync(process.execPath, command, {
      env,
      cwd: databaseTask ? process.cwd() : resolve("apps/web"),
      stdio: "inherit",
    });
    if (result.error) console.error("No se pudo iniciar el comando de piloto.");
    process.exitCode = result.status ?? 1;
  }
}
