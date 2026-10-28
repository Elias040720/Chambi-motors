import { NextResponse } from "next/server";
import { z } from "@chambi/domain";
import { sameOrigin, supabaseAuth } from "@/lib/auth";
import { allowRequest } from "@/lib/limits";
import { privateHeaders } from "@/lib/http";
export async function POST(request: Request) {
  if (!(await sameOrigin()))
    return NextResponse.json({ error: "Origen no permitido" }, { status: 403 });
  const p = z
    .object({ email: z.string().email() })
    .safeParse(await request.json().catch(() => null));
  if (
    p.success &&
    (await allowRequest("recover", "single-admin", 3, 3600)) &&
    p.data.email.toLowerCase() === process.env.ADMIN_EMAIL?.toLowerCase()
  )
    await supabaseAuth(
      `recover?redirect_to=${encodeURIComponent(`${process.env.NEXT_PUBLIC_APP_URL}/admin/recover`)}`,
      { email: p.data.email },
    ).catch(() => null);
  return NextResponse.json(
    { message: "Si la cuenta está configurada, recibirás instrucciones para recuperar el acceso." },
    { headers: privateHeaders },
  );
}
