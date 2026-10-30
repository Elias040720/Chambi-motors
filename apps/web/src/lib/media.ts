import { createHmac, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import { resolve, join } from "node:path";
import { trustedSupabaseUrl } from "./provider-url";
export const mediaRoot = () => resolve(process.env.MEDIA_STORAGE_PATH || ".data/media");
const remote = () =>
  !!(
    process.env.SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.SUPABASE_MEDIA_BUCKET
  );
async function storage(path: string, method: string, body?: Buffer) {
  const url = trustedSupabaseUrl();
  if (!url) throw new Error("Private Storage requires a trusted HTTPS configuration");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return fetch(`${url}/storage/v1/object/${process.env.SUPABASE_MEDIA_BUCKET}/${path}`, {
    method,
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "image/webp" },
    body: body ? new Uint8Array(body) : undefined,
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(15000),
  });
}
export async function saveMedia(key: string, bytes: Buffer) {
  if (remote()) {
    const r = await storage(key, "POST", bytes);
    if (!r.ok) throw new Error("Storage unavailable");
    return;
  }
  if (process.env.NODE_ENV === "production") throw new Error("Private Storage is required");
  await mkdir(mediaRoot(), { recursive: true });
  await writeFile(join(mediaRoot(), key), bytes, { flag: "wx" });
}
export async function removeMedia(key: string) {
  if (remote()) await storage(key, "DELETE");
  else await unlink(join(mediaRoot(), key)).catch(() => {});
}
export async function readMedia(key: string) {
  if (!/^[a-f0-9-]+\.webp$/.test(key)) throw new Error("Invalid media key");
  if (remote()) {
    const r = await storage(key, "GET");
    if (!r.ok) throw new Error("Media unavailable");
    return Buffer.from(await r.arrayBuffer());
  }
  if (process.env.NODE_ENV === "production") throw new Error("Private Storage is required");
  return readFile(join(mediaRoot(), key));
}
function secret() {
  const value = process.env.MEDIA_SIGNING_SECRET;
  if (value && value.length >= 32) return value;
  if (process.env.NODE_ENV === "production") throw new Error("MEDIA_SIGNING_SECRET required");
  return "development-only-media-signing-not-for-production";
}
export function mediaSignature(id: string, grant: string, expires: number) {
  return createHmac("sha256", secret()).update(`${id}:${grant}:${expires}`).digest("hex");
}
export function validMediaSignature(id: string, grant: string, expires: number, sig: string) {
  if (
    !Number.isSafeInteger(expires) ||
    expires < Date.now() / 1000 ||
    expires > Date.now() / 1000 + 600 ||
    !/^[a-f0-9]{64}$/.test(sig)
  )
    return false;
  return timingSafeEqual(
    Buffer.from(sig, "hex"),
    Buffer.from(mediaSignature(id, grant, expires), "hex"),
  );
}
