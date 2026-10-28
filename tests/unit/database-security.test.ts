import { Client } from "pg";
import { describe, expect, it } from "vitest";
import { databaseConnection } from "../../apps/web/src/lib/db-config";
const url = "postgresql://synthetic:synthetic@db.example.test/pilot";
describe("verified PostgreSQL transport", () => {
  it.each(["", "?sslmode=verify-full"])(
    "retains verified TLS after pg parses the URL %s",
    (suffix) => {
      const client = new Client(
        databaseConnection({ NODE_ENV: "production", DATABASE_URL: url + suffix }),
      );
      expect(client).toHaveProperty("connectionParameters.ssl", { rejectUnauthorized: true });
    },
  );
  it.each([
    "sslmode=disable",
    "sslmode=no-verify",
    "ssl=0",
    "sslmode=require&uselibpqcompat=true",
    "sslrootcert=untrusted.pem",
  ])("rejects TLS override %s before constructing a connection", (query) => {
    expect(() =>
      databaseConnection({ NODE_ENV: "production", DATABASE_URL: url + "?" + query }),
    ).toThrow(/TLS/);
  });
  it("rejects the global TLS bypass without disclosing credentials", () => {
    expect(() =>
      databaseConnection({
        NODE_ENV: "production",
        DATABASE_URL: url,
        NODE_TLS_REJECT_UNAUTHORIZED: "0",
      }),
    ).toThrow("TLS verification is required");
  });
  it("keeps the synthetic local development connection available", () => {
    expect(
      databaseConnection({ NODE_ENV: "development", DATABASE_URL: "postgresql://localhost/local" })
        .ssl,
    ).toBeUndefined();
  });
});
