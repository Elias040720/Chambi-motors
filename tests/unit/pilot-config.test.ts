import { describe, it, expect } from "vitest";
import { evaluatePilotConfig, pilotEnvironment } from "../../scripts/lib/pilot-config";
const ready = {
  APP_ENV: "pilot",
  NODE_ENV: "production",
  PILOT_SYNTHETIC_ONLY: "true",
  PILOT_ALLOW_COMMERCIAL_MESSAGES: "false",
  LOCAL_AUTH_STUB: "false",
  ENABLE_TEST_OTP: "false",
  NEXT_PUBLIC_APP_URL: "https://pilot.example.test",
  EXPO_PUBLIC_API_URL: "https://pilot.example.test",
  DATABASE_URL: "postgresql://synthetic:synthetic@db.example.test/pilot",
  SUPABASE_URL: "https://project.example.test",
  SUPABASE_ANON_KEY: "synthetic-public-key",
  ADMIN_EMAIL: "owner@example.test",
  SUPABASE_SERVICE_ROLE_KEY: "synthetic-server-key",
  SUPABASE_MEDIA_BUCKET: "pilot-media",
  MEDIA_SIGNING_SECRET: "synthetic-signing-key-that-is-longer-than-32-characters",
  EAS_PROJECT_ID: "11111111-1111-4111-8111-111111111111",
  OTP_PROVIDER: "",
};
describe("offline pilot readiness gates", () => {
  it("does not borrow another project's database, service key or OTP settings from the shell", () => {
    const values = { ...ready } as Record<string, string>;
    delete values.DATABASE_URL;
    delete values.SUPABASE_SERVICE_ROLE_KEY;
    delete values.OTP_PROVIDER;
    const env = pilotEnvironment(values, {
      ...ready,
      PATH: "runtime-path",
      OTP_PROVIDER: "twilio",
      TWILIO_AUTH_TOKEN: "other-project-secret",
      NODE_TLS_REJECT_UNAUTHORIZED: "0",
    });
    expect(env.DATABASE_URL).toBeUndefined();
    expect(env.SUPABASE_SERVICE_ROLE_KEY).toBeUndefined();
    expect(env.OTP_PROVIDER).toBeUndefined();
    expect(env.TWILIO_AUTH_TOKEN).toBeUndefined();
    expect(env.PATH).toBe("runtime-path");
    expect(env.NODE_TLS_REJECT_UNAUTHORIZED).toBe("0");
    expect(evaluatePilotConfig(env, "database").some((r) => r.status === "BLOCKED")).toBe(true);
  });
  it("accepts complete isolated configuration without claiming live connectivity", () => {
    expect(evaluatePilotConfig(ready).every((r) => r.status === "PASS")).toBe(true);
  });
  it("does not block backend preparation on an unavailable EAS account", () => {
    const backend = { ...ready, EAS_PROJECT_ID: "", EXPO_PUBLIC_API_URL: "" };
    expect(evaluatePilotConfig(backend, "server").every((r) => r.status === "PASS")).toBe(true);
    expect(evaluatePilotConfig(backend).some((r) => r.status === "BLOCKED")).toBe(true);
  });
  it("allows database inspection before the web host or EAS project exists", () => {
    const database = {
      ...ready,
      NEXT_PUBLIC_APP_URL: "",
      EXPO_PUBLIC_API_URL: "",
      EAS_PROJECT_ID: "",
    };
    expect(evaluatePilotConfig(database, "database").every((r) => r.status === "PASS")).toBe(true);
    expect(
      evaluatePilotConfig(
        { ...database, DATABASE_URL: ready.DATABASE_URL + "?sslmode=disable" },
        "database",
      ).some((r) => r.status === "BLOCKED"),
    ).toBe(true);
  });
  it.each([
    { LOCAL_AUTH_STUB: "true" },
    { ENABLE_TEST_OTP: "true" },
    { PILOT_SYNTHETIC_ONLY: "false" },
    { NODE_TLS_REJECT_UNAUTHORIZED: "0" },
    { DATABASE_URL: ready.DATABASE_URL + "?sslmode=disable" },
    { EXPO_PUBLIC_API_URL: "http://pilot.example.test" },
    { SUPABASE_MEDIA_BUCKET: "production-media" },
    { MEDIA_SIGNING_SECRET: "short" },
    { EAS_PROJECT_ID: "" },
  ])("blocks unsafe or missing settings %j", (override) => {
    expect(evaluatePilotConfig({ ...ready, ...override }).some((r) => r.status === "BLOCKED")).toBe(
      true,
    );
  });
  it("blocks commercial SMS unless the owner explicitly authorizes that provider", () => {
    const e = {
      ...ready,
      OTP_PROVIDER: "twilio",
      TWILIO_ACCOUNT_SID: "synthetic",
      TWILIO_AUTH_TOKEN: "synthetic",
      TWILIO_VERIFY_SERVICE_SID: "synthetic",
    };
    expect(evaluatePilotConfig(e).find((r) => r.component === "Mensajes comerciales")?.status).toBe(
      "BLOCKED",
    );
    expect(
      evaluatePilotConfig({ ...e, PILOT_ALLOW_COMMERCIAL_MESSAGES: "true" }).find(
        (r) => r.component === "Mensajes comerciales",
      )?.status,
    ).toBe("PASS");
  });
});
