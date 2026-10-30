import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  allowRequest: vi.fn(),
  fetch: vi.fn(),
  get: vi.fn(),
  set: vi.fn(),
  remove: vi.fn(),
  headers: vi.fn(),
}));

// Resolve the same Next module used by apps/web without adding a root dependency.
vi.mock("../../apps/web/node_modules/next/headers.js", () => ({
  cookies: async () => ({ get: mocks.get, set: mocks.set, delete: mocks.remove }),
  headers: mocks.headers,
}));
vi.mock("../../apps/web/src/lib/db", () => ({ db: { query: mocks.query } }));
vi.mock("../../apps/web/src/lib/limits", () => ({ allowRequest: mocks.allowRequest }));

import {
  isAdmin,
  signIn,
  supabaseAuth,
  tokenHash,
  verifyDevPassword,
} from "../../apps/web/src/lib/auth";
import { remoteApprovalEnabled } from "../../apps/web/src/lib/public-order";

const userId = "11111111-1111-4111-8111-111111111111";
const password = "synthetic-local-password";

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("SUPABASE_URL", "https://auth.example.test");
  vi.stubEnv("SUPABASE_ANON_KEY", "synthetic-anon-key");
  vi.stubEnv("ADMIN_EMAIL", "admin@example.test");
  vi.stubEnv("ADMIN_PASSWORD", password);
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://taller.example.test");
  vi.stubEnv("ENABLE_TEST_OTP", "true");
  vi.stubEnv("LOCAL_AUTH_STUB", "true");
  vi.stubEnv("OTP_PROVIDER", "");
  vi.stubEnv("TWILIO_ACCOUNT_SID", "");
  vi.stubEnv("TWILIO_AUTH_TOKEN", "");
  vi.stubEnv("TWILIO_VERIFY_SERVICE_SID", "");
  mocks.headers.mockResolvedValue(
    new Headers({ origin: "https://taller.example.test", host: "taller.example.test" }),
  );
  mocks.allowRequest.mockResolvedValue(true);
  mocks.query.mockResolvedValue({ rows: [], rowCount: 0 });
  mocks.fetch.mockRejectedValue(new Error("Unexpected mocked provider request"));
  vi.stubGlobal("fetch", mocks.fetch);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("production authentication boundaries", () => {
  it("rejects the development password even when local flags and the correct password are present", async () => {
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_ANON_KEY", "");
    expect(await verifyDevPassword(password)).toBe(false);
    expect(await signIn(undefined, password)).toBeNull();
    expect(mocks.query).not.toHaveBeenCalled();
    expect(mocks.set).not.toHaveBeenCalled();
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("does not enable remote approval from the test OTP flag in production", () => {
    expect(remoteApprovalEnabled()).toBe(false);
  });

  it("allows the correct local password only in development with no configured identity provider", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_ANON_KEY", "");
    expect(await verifyDevPassword(password)).toBe(true);
    expect(await verifyDevPassword("wrong-synthetic-password")).toBe(false);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("rejects a session created without a provisioned user in production", async () => {
    mocks.headers.mockResolvedValue(
      new Headers({ authorization: "Bearer synthetic-development-session" }),
    );
    mocks.query.mockResolvedValue({ rows: [{ user_id: null }], rowCount: 1 });
    expect(await isAdmin()).toBe(false);
  });

  it("rejects another email before contacting the provider or creating a session", async () => {
    expect(await signIn("outsider@example.test", password)).toBeNull();
    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it("rejects a cross-site request before sending credentials to the provider", async () => {
    mocks.headers.mockResolvedValue(
      new Headers({ origin: "https://outside.example.test", "sec-fetch-site": "cross-site" }),
    );
    expect(await signIn("admin@example.test", password)).toBeNull();
    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(mocks.allowRequest).not.toHaveBeenCalled();
  });

  it("rejects a rate-limited login before contacting the provider", async () => {
    mocks.allowRequest.mockResolvedValue(false);
    expect(await signIn("admin@example.test", password)).toBeNull();
    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it("requires a fresh remote user response instead of trusting the user field in the password response", async () => {
    mocks.fetch
      .mockResolvedValueOnce(
        Response.json({ access_token: "synthetic-access-token", user: { id: userId } }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 401 }));
    expect(await signIn("admin@example.test", password)).toBeNull();
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
    expect(mocks.fetch.mock.calls[1][0]).toBe("https://auth.example.test/auth/v1/user");
    expect(mocks.query).not.toHaveBeenCalled();
    expect(mocks.set).not.toHaveBeenCalled();
  });

  it("rejects a remotely authenticated user who has no admin profile", async () => {
    const outsider = "22222222-2222-4222-8222-222222222222";
    mocks.fetch
      .mockResolvedValueOnce(
        Response.json({ access_token: "synthetic-access-token", user: { id: userId } }),
      )
      .mockResolvedValueOnce(Response.json({ id: outsider }));
    expect(await signIn("admin@example.test", password)).toBeNull();
    expect(mocks.query).toHaveBeenCalledExactlyOnceWith(
      "select id from admin_profiles where id=$1",
      [outsider],
    );
    expect(mocks.set).not.toHaveBeenCalled();
  });

  it("creates an opaque hashed session only after provider verification and the provisioned profile", async () => {
    mocks.fetch
      .mockResolvedValueOnce(Response.json({ access_token: "synthetic-access-token" }))
      .mockResolvedValueOnce(Response.json({ id: userId }));
    mocks.query
      .mockResolvedValueOnce({ rows: [{ id: userId }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 });
    const token = await signIn("admin@example.test", password);
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(mocks.fetch.mock.calls[0][0]).toBe(
      "https://auth.example.test/auth/v1/token?grant_type=password",
    );
    expect(mocks.fetch.mock.calls[1][1]).toMatchObject({
      method: "GET",
      headers: { Authorization: "Bearer synthetic-access-token" },
    });
    expect(mocks.query.mock.calls[1][0]).toContain("insert into admin_sessions");
    expect(mocks.query.mock.calls[1][1]).toEqual([tokenHash(token!), 3600, userId]);
    expect(mocks.query.mock.invocationCallOrder[0]).toBeGreaterThan(
      mocks.fetch.mock.invocationCallOrder[1],
    );
    expect(mocks.set).toHaveBeenCalledWith(
      "cm_admin",
      token,
      expect.objectContaining({ httpOnly: true, secure: true, sameSite: "lax", maxAge: 3600 }),
    );
  });

  it("rejects provider HTTP errors and insecure provider URLs in production", async () => {
    mocks.fetch.mockResolvedValueOnce(new Response(null, { status: 401 }));
    expect(await signIn("admin@example.test", password)).toBeNull();
    expect(mocks.query).not.toHaveBeenCalled();
    mocks.fetch.mockClear();
    vi.stubEnv("SUPABASE_URL", "http://auth.example.test");
    expect(
      await supabaseAuth("token?grant_type=password", { email: "admin@example.test", password }),
    ).toBeNull();
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
});
