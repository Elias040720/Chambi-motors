import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { db } from "./db";
import { allowRequest } from "./limits";
import { trustedSupabaseUrl } from "./provider-url";
const cookieName = "cm_admin";
export const tokenHash = (s: string) => createHash("sha256").update(s).digest();
export const authMode = () =>
  process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY ? "supabase" : "development";
export async function supabaseAuth(
  path: string,
  body?: unknown,
  accessToken?: string,
  method = "POST",
) {
  const url = trustedSupabaseUrl(),
    key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const r = await fetch(`${url}/auth/v1/${path}`, {
    method,
    headers: {
      apikey: key,
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(8000),
  });
  return r.ok ? await r.json() : null;
}
export async function createAdminSession(userId?: string) {
  const token = randomBytes(32).toString("base64url");
  const seconds = userId ? 3600 : 43200;
  await db.query(
    "insert into admin_sessions(token_hash,expires_at,user_id) values($1,now()+($2*interval '1 second'),$3)",
    [tokenHash(token), seconds, userId ?? null],
  );
  (await cookies()).set(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: seconds,
  });
  return token;
}
export async function sameOrigin() {
  const h = await headers();
  const origin = h.get("origin");
  if (h.get("sec-fetch-site") === "cross-site") return false;
  if (!origin) return true;
  const expected = process.env.NEXT_PUBLIC_APP_URL;
  return origin === (expected ? new URL(expected).origin : `http://${h.get("host")}`);
}
export async function isAdmin() {
  const h = await headers();
  const bearer = h.get("authorization");
  if (!bearer && !(await sameOrigin())) return false;
  const token = bearer?.startsWith("Bearer ")
    ? bearer.slice(7)
    : (await cookies()).get(cookieName)?.value;
  if (!token || token.length > 100) return false;
  const r = await db
    .query(
      `select s.user_id from admin_sessions s where token_hash=$1 and expires_at>now()
    and (s.user_id is null or exists(select 1 from admin_profiles p where p.id=s.user_id))`,
      [tokenHash(token)],
    )
    .catch(() => ({ rows: [] }));
  if (!r.rows[0]) return false;
  return (
    r.rows[0].user_id !== null ||
    (process.env.NODE_ENV !== "production" && authMode() === "development")
  );
}
export async function revokeAdminSession(authorization?: string | null) {
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice(7)
    : (await cookies()).get(cookieName)?.value;
  if (token) await db.query("delete from admin_sessions where token_hash=$1", [tokenHash(token)]);
  (await cookies()).delete(cookieName);
}
export async function verifyDevPassword(password: string) {
  if (process.env.NODE_ENV === "production" || authMode() !== "development") return false;
  const stored = process.env.ADMIN_PASSWORD;
  if (!stored || stored.length < 12 || password.length > 256) return false;
  const derive = (v: string) =>
    new Promise<Buffer>((resolve, reject) =>
      scryptCb(v, "chambi-dev-only-v1", 32, (e, k) => (e ? reject(e) : resolve(Buffer.from(k)))),
    );
  return timingSafeEqual(await derive(password), await derive(stored));
}
export async function signIn(email: string | undefined, password: string) {
  if (!(await sameOrigin()) || !(await allowRequest("admin-login", "single-admin", 20, 900)))
    return null;
  if (authMode() === "development")
    return (await verifyDevPassword(password)) ? createAdminSession() : null;
  if (!email || email.toLowerCase() !== process.env.ADMIN_EMAIL?.toLowerCase()) return null;
  const result = await supabaseAuth("token?grant_type=password", { email, password });
  if (!result?.access_token) return null;
  const user = await supabaseAuth("user", undefined, result.access_token, "GET");
  if (!user?.id) return null;
  const profile = await db.query("select id from admin_profiles where id=$1", [user.id]);
  return profile.rowCount ? createAdminSession(user.id) : null;
}
