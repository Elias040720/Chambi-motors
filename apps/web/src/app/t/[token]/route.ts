import { NextResponse } from "next/server";
import { tokenHash } from "@/lib/auth";
import { allowRequest } from "@/lib/limits";
import { db } from "@/lib/db";
import { privateHeaders } from "@/lib/http";
export const dynamic = "force-dynamic";
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  // Global ceiling always applies; a proxy-supplied client IP is used only when explicitly trusted.
  const global = await allowRequest("link-global", "anonymous", 1200);
  const ip =
    process.env.TRUST_PROXY === "true"
      ? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      : "local";
  if (!global || !(await allowRequest("link-ip", ip ?? "unknown", 60)))
    return NextResponse.json(
      { error: "Demasiados intentos. Vuelve a intentar en un minuto." },
      { status: 429, headers: { ...privateHeaders, "Retry-After": "60" } },
    );
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{43}$/.test(token))
    return NextResponse.redirect(new URL("/seguimiento/vencido", request.url), 302);
  const { rows } = await db.query(
    `select work_order_id,expires_at from access_grants g where token_hash=$1 and expires_at>now() and revoked_at is null
     and (contact_id is null or exists(select 1 from work_order_contacts c where c.id=g.contact_id and c.work_order_id=g.work_order_id and c.revoked_at is null and c.verified_at<=now() and c.can_view_progress))`,
    [tokenHash(token)],
  );
  if (!rows[0]) return NextResponse.redirect(new URL("/seguimiento/vencido", request.url), 302);
  const response = NextResponse.redirect(
    new URL(`/seguimiento/${rows[0].work_order_id}`, request.url),
    302,
  );
  response.cookies.set("cm_view", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.max(0, Math.ceil((new Date(rows[0].expires_at).getTime() - Date.now()) / 1000)),
  });
  for (const [key, value] of Object.entries(privateHeaders)) response.headers.set(key, value);
  return response;
}
