import { it, expect } from "vitest";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve, basename } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
it("EAS ignore rules exclude secrets, agent sources and local artifacts while retaining build inputs", () => {
  const dir = mkdtempSync(join(tmpdir(), "chambi-eas-ignore-"));
  try {
    execFileSync("git", ["init", "-q", dir]);
    writeFileSync(join(dir, ".gitignore"), readFileSync(".easignore"));
    const ignored = [
      "nested/.git",
      "credentials.json",
      "apps/mobile/pilot.jks",
      ".env.local",
      ".env.pilot.local",
      "apps/mobile/.env",
      "apps/web/.env.production",
      "agentes/source.txt",
      ".agents/skills/tech-lead/SKILL.md",
      "dev.log",
      ".data/evidence/a.png",
      "apps/mobile/android/app/build/a.apk",
    ];
    const included = [
      "apps/mobile/app.config.ts",
      "apps/mobile/app/index.tsx",
      "apps/mobile/eas.json",
      "packages/domain/src/index.ts",
      "pnpm-lock.yaml",
      "pnpm-workspace.yaml",
      "apps/web/package.json",
    ];
    for (const path of ignored)
      expect(
        spawnSync("git", ["-c", "core.excludesfile=", "check-ignore", "--no-index", path], {
          cwd: dir,
        }).status,
        path,
      ).toBe(0);
    for (const path of included)
      expect(
        spawnSync("git", ["-c", "core.excludesfile=", "check-ignore", "--no-index", path], {
          cwd: dir,
        }).status,
        path,
      ).toBe(1);
  } finally {
    if (
      dirname(resolve(dir)) !== resolve(tmpdir()) ||
      !basename(dir).startsWith("chambi-eas-ignore-")
    )
      throw new Error("Unexpected test fixture path");
    rmSync(dir, { recursive: true, force: true });
  }
});
