import { Pool } from "pg";
import { databaseConnection } from "./db-config";

declare global {
  var chambiPool: Pool | undefined;
}
export const db =
  globalThis.chambiPool ??
  new Pool({
    ...databaseConnection(),
    max: 10,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 4_000,
  });
if (process.env.NODE_ENV !== "production") globalThis.chambiPool = db;
