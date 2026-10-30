import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { readMedia } from "@/lib/media";
import { privateHeaders, validId } from "@/lib/http";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const r = await db.query("select storage_path from media_assets where id=$1", [
      validId((await params).id),
    ]);
    if (!r.rows[0]) throw new Error();
    return new Response(new Uint8Array(await readMedia(r.rows[0].storage_path)), {
      headers: {
        ...privateHeaders,
        "Content-Type": "image/webp",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Foto no encontrada" }, { status: 404 });
  }
}
