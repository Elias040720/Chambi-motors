import type { PoolConfig } from "pg";

type Env = Record<string, string | undefined>;
export function databaseConnection(env: Env = process.env): PoolConfig {
  let connectionString = env.DATABASE_URL;
  const production = env.NODE_ENV === "production";
  if (production) {
    if (env.NODE_TLS_REJECT_UNAUTHORIZED === "0") throw new Error("TLS verification is required");
    if (connectionString) {
      let url: URL;
      try {
        url = new URL(connectionString);
      } catch {
        throw new Error("Invalid DATABASE_URL");
      }
      if (!["postgres:", "postgresql:"].includes(url.protocol))
        throw new Error("Invalid database protocol");
      for (const [key, value] of url.searchParams) {
        if (
          (key.startsWith("ssl") && !(key === "sslmode" && value === "verify-full")) ||
          key === "uselibpqcompat"
        )
          throw new Error(
            "DATABASE_URL must not override verified TLS; use sslmode=verify-full or no SSL query options",
          );
      }
      // pg parses URL options after Pool options. Remove the one permitted mode so
      // it cannot replace our explicit certificate and hostname verification.
      url.searchParams.delete("sslmode");
      connectionString = url.toString();
    }
  }
  return { connectionString, ssl: production ? { rejectUnauthorized: true } : undefined };
}
