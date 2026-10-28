import "./env";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { Pool } from "pg";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname, resolve, basename } from "node:path";
const url = new URL(
  process.env.DATABASE_URL ?? "postgresql://chambi:chambi_local_dev@localhost:54329/chambi",
);
if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))
  throw new Error("E2E requires a local disposable PostgreSQL server");
const database = `cm_test_${randomUUID().replaceAll("-", "")}`,
  admin = new Pool({ connectionString: url.toString() });
const run = (args: string[], env: NodeJS.ProcessEnv) =>
  new Promise<void>((resolve, reject) => {
    const child = spawn("pnpm", args, {
      env,
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`${args[0]} exited ${code}`)),
    );
  });
async function main() {
  const media = await mkdtemp(join(tmpdir(), "chambi-e2e-"));
  await admin.query(`create database "${database}"`);
  try {
    url.pathname = `/${database}`;
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      DATABASE_URL: url.toString(),
      LOCAL_AUTH_STUB: "true",
      ENABLE_TEST_OTP: "true",
      SUPABASE_URL: "",
      SUPABASE_ANON_KEY: "",
      SUPABASE_SERVICE_ROLE_KEY: "",
      NEXT_TELEMETRY_DISABLED: "1",
      MEDIA_STORAGE_PATH: media,
    };
    if (env.FORCE_COLOR) delete env.NO_COLOR;
    await run(["db:migrate"], env);
    await run(["exec", "playwright", "test"], env);
  } finally {
    await admin.query(`drop database if exists "${database}" with (force)`);
    if (dirname(resolve(media)) !== resolve(tmpdir()) || !basename(media).startsWith("chambi-e2e-"))
      throw new Error("Unexpected test-media directory");
    await rm(media, { recursive: true, force: true });
  }
}
main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "E2E failed");
    process.exitCode = 1;
  })
  .finally(() => admin.end());
