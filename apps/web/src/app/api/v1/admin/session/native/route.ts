import { NextResponse } from "next/server";
import { z } from "@chambi/domain";
import { signIn } from "@/lib/auth";
import { privateHeaders } from "@/lib/http";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const p = z
    .object({ email: z.string().email().optional(), password: z.string().min(1).max(256) })
    .safeParse(await request.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "Solicitud no válida" }, { status: 400 });
  const token = await signIn(p.data.email, p.data.password).catch(() => null);
  return token
    ? NextResponse.json({ token }, { headers: privateHeaders })
    : NextResponse.json(
        { error: "Credenciales no válidas o demasiados intentos" },
        { status: 401, headers: privateHeaders },
      );
}
