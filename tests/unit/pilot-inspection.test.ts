import { describe, expect, it, vi } from "vitest";
import {
  applicationTables,
  inspectAuthSettings,
  inspectPilotDatabase,
} from "../../scripts/lib/pilot-inspection";
const env = {
  SUPABASE_URL: "https://synthetic.example.test",
  SUPABASE_ANON_KEY: "synthetic-anon",
  ADMIN_EMAIL: "synthetic@example.test",
  SUPABASE_MEDIA_BUCKET: "pilot-media",
};
function metadata(
  overrides: {
    rls?: boolean;
    dml?: boolean;
    bucket?: Record<string, unknown>[];
    missing?: boolean;
  } = {},
) {
  return vi.fn(async (sql: string) => {
    if (sql.includes("has_table_privilege"))
      return { rows: overrides.dml ? [{ privilege: "UPDATE" }] : [] };
    if (sql.includes("from pg_class"))
      return {
        rows: (overrides.missing ? applicationTables.slice(1) : applicationTables).map(
          (relname) => ({
            relname,
            relrowsecurity: relname !== "schema_migrations" && overrides.rls !== false,
          }),
        ),
      };
    if (sql.includes("schema_migrations"))
      return { rows: [{ name: "202610270007_backend_writes_only.sql" }] };
    if (sql.includes("admin_profiles")) return { rows: [{ total: 1, matching: 1 }] };
    return {
      rows: overrides.bucket ?? [
        { public: false, file_size_limit: 8388608, allowed_mime_types: ["image/webp"] },
      ],
    };
  });
}
describe("read-only pilot inspection contract", () => {
  it("reports only metadata without reading customer contents or writing", async () => {
    const query = metadata();
    const result = await inspectPilotDatabase(query, env);
    expect(result).toHaveLength(5);
    expect(result.every((row) => row.status === "PASS")).toBe(true);
    expect(query.mock.calls.every(([sql]) => sql.trim().startsWith("select"))).toBe(true);
    expect(query.mock.calls.some(([sql]) => /select.*from public\.customers/i.test(sql))).toBe(
      false,
    );
  });
  it.each([
    { rls: false },
    { dml: true },
    { bucket: [{ public: true, file_size_limit: 8388608, allowed_mime_types: ["image/webp"] }] },
  ])("rejects unsafe metadata %j", async (override) => {
    expect(
      (await inspectPilotDatabase(metadata(override), env)).some((r) => r.status === "FAIL"),
    ).toBe(true);
  });
  it("blocks incomplete setup rather than claiming a functional test passed", async () => {
    expect(
      (await inspectPilotDatabase(metadata({ bucket: [] }), env)).some(
        (r) => r.status === "BLOCKED",
      ),
    ).toBe(true);
    const query = metadata({ missing: true });
    expect((await inspectPilotDatabase(query, env))[0].status).toBe("BLOCKED");
    expect(query).toHaveBeenCalledTimes(1);
  });
  it("does not publish database exception details", async () => {
    const result = await inspectPilotDatabase(async () => {
      throw new Error("secret-connection-string");
    }, env);
    expect(result[0].status).toBe("BLOCKED");
    expect(JSON.stringify(result)).not.toContain("secret-connection-string");
  });
  it("checks public Auth settings with GET, no admin key, redirects or email", async () => {
    const request = vi.fn<typeof fetch>(async () =>
      Response.json({ disable_signup: true, external: { email: true, anonymous_users: false } }),
    );
    expect(
      (await inspectAuthSettings({ ...env, SUPABASE_SERVICE_ROLE_KEY: "never-send-this" }, request))
        .status,
    ).toBe("PASS");
    const [url, options] = request.mock.calls[0];
    expect(url).toBe("https://synthetic.example.test/auth/v1/settings");
    expect(options).toMatchObject({
      method: "GET",
      redirect: "error",
      headers: { apikey: "synthetic-anon" },
    });
    expect(options?.signal).toBeInstanceOf(AbortSignal);
    expect(JSON.stringify(options)).not.toContain("never-send-this");
  });
  it.each([
    { disable_signup: false, external: { email: true, anonymous_users: false } },
    { disable_signup: true, external: { email: true, anonymous_users: true } },
  ])("fails unsafe Auth settings %j", async (settings) => {
    expect(
      (
        await inspectAuthSettings(
          env,
          vi.fn(async () => Response.json(settings)),
        )
      ).status,
    ).toBe("FAIL");
  });
  it.each([
    "http://synthetic.example.test",
    "https://user:password@synthetic.example.test",
    "https://synthetic.example.test/path",
  ])("does not send keys to invalid endpoint %s", async (SUPABASE_URL) => {
    const request = vi.fn<typeof fetch>();
    expect((await inspectAuthSettings({ ...env, SUPABASE_URL }, request)).status).toBe("BLOCKED");
    expect(request).not.toHaveBeenCalled();
  });
  it("treats unavailable or unknown Auth contracts as blocked without logging response", async () => {
    const request = vi.fn(async () => new Response("secret-response", { status: 500 }));
    const result = await inspectAuthSettings(env, request);
    expect(result.status).toBe("BLOCKED");
    expect(JSON.stringify(result)).not.toContain("secret-response");
    expect(
      (
        await inspectAuthSettings(
          env,
          vi.fn(async () => Response.json({})),
        )
      ).status,
    ).toBe("BLOCKED");
  });
});
