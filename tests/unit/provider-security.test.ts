import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  query: vi.fn(),
  allowRequest: vi.fn(),
  mkdir: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  unlink: vi.fn(),
}));
vi.mock("../../apps/web/node_modules/next/headers.js", () => ({
  cookies: async () => ({ get: vi.fn(), set: vi.fn(), delete: vi.fn() }),
  headers: async () => new Headers(),
}));
vi.mock("../../apps/web/src/lib/db", () => ({ db: { query: mocks.query } }));
vi.mock("../../apps/web/src/lib/limits", () => ({ allowRequest: mocks.allowRequest }));
vi.mock("node:fs/promises", () => ({
  mkdir: mocks.mkdir,
  readFile: mocks.readFile,
  writeFile: mocks.writeFile,
  unlink: mocks.unlink,
}));

import { trustedSupabaseUrl } from "../../apps/web/src/lib/provider-url";
import { supabaseAuth } from "../../apps/web/src/lib/auth";
import { readMedia, removeMedia, saveMedia } from "../../apps/web/src/lib/media";

const mediaKey = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.webp";
const bytes = Buffer.from("synthetic-sanitized-media");
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("SUPABASE_URL", "https://provider.example.test");
  vi.stubEnv("SUPABASE_ANON_KEY", "synthetic-anon-key");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "synthetic-server-only-key");
  vi.stubEnv("SUPABASE_MEDIA_BUCKET", "synthetic-private-bucket");
  mocks.fetch.mockRejectedValue(new Error("Unexpected mocked network call"));
  mocks.mkdir.mockRejectedValue(new Error("Unexpected mocked filesystem call"));
  mocks.readFile.mockRejectedValue(new Error("Unexpected mocked filesystem call"));
  mocks.writeFile.mockRejectedValue(new Error("Unexpected mocked filesystem call"));
  mocks.unlink.mockRejectedValue(new Error("Unexpected mocked filesystem call"));
  vi.stubGlobal("fetch", mocks.fetch);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function noFilesTouched() {
  expect(mocks.mkdir).not.toHaveBeenCalled();
  expect(mocks.readFile).not.toHaveBeenCalled();
  expect(mocks.writeFile).not.toHaveBeenCalled();
  expect(mocks.unlink).not.toHaveBeenCalled();
}

describe("trusted provider URL boundary", () => {
  it.each(["https://provider.example.test", "https://provider.example.test/"])(
    "accepts a root HTTPS provider URL: %s",
    (url) => {
      vi.stubEnv("SUPABASE_URL", url);
      expect(trustedSupabaseUrl()).toBe("https://provider.example.test");
    },
  );
  it.each([
    "",
    "not-a-url",
    "//provider.example.test",
    "ftp://provider.example.test",
    "http://provider.example.test",
    "https://user:password@provider.example.test",
    "https://provider.example.test/nested",
    "https://provider.example.test/?secret=value",
    "https://provider.example.test/#fragment",
  ])("rejects an unsafe production URL before any I/O: %s", (url) => {
    vi.stubEnv("SUPABASE_URL", url);
    expect(trustedSupabaseUrl()).toBeNull();
    expect(mocks.fetch).not.toHaveBeenCalled();
    noFilesTouched();
  });
  it.each(["http://localhost:54321", "http://127.0.0.1:54321", "http://[::1]:54321"])(
    "allows HTTP loopback only outside production: %s",
    (url) => {
      vi.stubEnv("SUPABASE_URL", url);
      expect(trustedSupabaseUrl()).toBeNull();
      vi.stubEnv("NODE_ENV", "development");
      expect(trustedSupabaseUrl()).toBe(url);
    },
  );
  it.each([
    "http://provider.example.test",
    "http://localhost.example.test",
    "http://127.0.0.1.example.test",
    "http://192.168.1.10:54321",
  ])("rejects non-loopback HTTP even in development: %s", (url) => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("SUPABASE_URL", url);
    expect(trustedSupabaseUrl()).toBeNull();
  });
});

describe("auth and Storage fail closed before transporting credentials", () => {
  it.each([
    ["production", "http://provider.example.test"],
    ["production", "http://localhost:54321"],
    ["development", "http://provider.example.test"],
  ] as const)(
    "blocks %s provider URL %s with no network or local fallback",
    async (environment, url) => {
      vi.stubEnv("NODE_ENV", environment);
      vi.stubEnv("SUPABASE_URL", url);
      expect(
        await supabaseAuth("token?grant_type=password", {
          email: "admin@example.test",
          password: "synthetic-password",
        }),
      ).toBeNull();
      await expect(saveMedia(mediaKey, bytes)).rejects.toThrow();
      await expect(readMedia(mediaKey)).rejects.toThrow();
      await expect(removeMedia(mediaKey)).rejects.toThrow();
      expect(mocks.fetch).not.toHaveBeenCalled();
      noFilesTouched();
    },
  );

  it("uses HTTPS with redirect rejection for Auth", async () => {
    mocks.fetch.mockResolvedValue(Response.json({ id: "synthetic-user" }));
    expect(await supabaseAuth("user", undefined, "synthetic-user-token", "GET")).toEqual({
      id: "synthetic-user",
    });
    expect(mocks.fetch).toHaveBeenCalledExactlyOnceWith(
      "https://provider.example.test/auth/v1/user",
      expect.objectContaining({
        redirect: "error",
        headers: expect.objectContaining({ Authorization: "Bearer synthetic-user-token" }),
      }),
    );
    noFilesTouched();
  });

  it("uses HTTPS with redirect rejection for private media save, read and removal", async () => {
    mocks.fetch
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(new Response(new Uint8Array(bytes), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    await saveMedia(mediaKey, bytes);
    expect(await readMedia(mediaKey)).toEqual(bytes);
    await removeMedia(mediaKey);
    expect(mocks.fetch).toHaveBeenCalledTimes(3);
    expect(mocks.fetch.mock.calls.map((call) => call[1].method)).toEqual(["POST", "GET", "DELETE"]);
    for (const [url, options] of mocks.fetch.mock.calls) {
      expect(url).toBe(
        `https://provider.example.test/storage/v1/object/synthetic-private-bucket/${mediaKey}`,
      );
      expect(options).toMatchObject({
        redirect: "error",
        headers: {
          Authorization: "Bearer synthetic-server-only-key",
          apikey: "synthetic-server-only-key",
        },
      });
    }
    noFilesTouched();
  });

  it("does not follow a rejected redirect or switch to local files", async () => {
    mocks.fetch.mockRejectedValue(new TypeError("synthetic redirect rejected"));
    await expect(supabaseAuth("user", undefined, "synthetic-user-token", "GET")).rejects.toThrow(
      "synthetic redirect rejected",
    );
    await expect(saveMedia(mediaKey, bytes)).rejects.toThrow("synthetic redirect rejected");
    await expect(readMedia(mediaKey)).rejects.toThrow("synthetic redirect rejected");
    await expect(removeMedia(mediaKey)).rejects.toThrow("synthetic redirect rejected");
    expect(mocks.fetch).toHaveBeenCalledTimes(4);
    for (const [url, options] of mocks.fetch.mock.calls) {
      expect(String(url)).toMatch(/^https:\/\/provider\.example\.test\//);
      expect(options.redirect).toBe("error");
    }
    noFilesTouched();
  });
});
