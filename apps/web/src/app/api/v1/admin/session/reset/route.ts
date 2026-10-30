import { NextResponse } from "next/server";
import { z } from "@chambi/domain";
import { sameOrigin, supabaseAuth } from "@/lib/auth";
import { allowRequest } from "@/lib/limits";
import { db } from "@/lib/db";
export async function POST(request: Request) {
  if (!(await sameOrigin()) || !(await allowRequest("reset", "single-admin", 10, 900)))
    return NextResponse.json({ error: "Acceso no permitido" }, { status: 403 });
  const p = z
    .object({ accessToken: z.string().min(20).max(8192), password: z.string().min(12).max(128) })
    .safeParse(await request.json().catch(() => null));
  if (!p.success)
    return NextResponse.json({ error: "Usa al menos 12 caracteres" }, { status: 400 });
  const user = await supabaseAuth("user", undefined, p.data.accessToken, "GET").catch(() => null);
  if (
    !user?.id ||
    !(await db.query("select 1 from admin_profiles where id=$1", [user.id])).rowCount
  )
    return NextResponse.json({ error: "Enlace no válido" }, { status: 401 });
  const changed = await supabaseAuth(
    "user",
    { password: p.data.password },
    p.data.accessToken,
    "PUT",
  );
  if (!changed) return NextResponse.json({ error: "No se pudo cambiar la clave" }, { status: 422 });
  await db.query("delete from admin_sessions where user_id=$1", [user.id]);
  return NextResponse.json({ ok: true });
}
