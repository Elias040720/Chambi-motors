import { createHash } from "node:crypto";
import { db } from "./db";
export async function allowRequest(bucket: string, key: string, max: number, seconds = 60) {
  const hash = createHash("sha256").update(key).digest("hex");
  const r = await db.query(
    `insert into request_limits(bucket,key_hash) values($1,$2)
    on conflict(bucket,key_hash) do update set count=case when request_limits.window_start<now()-($3*interval '1 second') then 1 else request_limits.count+1 end,
    window_start=case when request_limits.window_start<now()-($3*interval '1 second') then now() else request_limits.window_start end returning count`,
    [bucket, hash, seconds],
  );
  return r.rows[0].count <= max;
}
