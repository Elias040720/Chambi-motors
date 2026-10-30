import { NextResponse } from "next/server";
import { publicGrant } from "@/lib/public-order";
import { validMediaSignature, readMedia } from "@/lib/media";
import { db } from "@/lib/db";
import { privateHeaders, validId } from "@/lib/http";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = validId((await params).id),
      g = await publicGrant(),
      p = new URL(request.url).searchParams;
    if (!validMediaSignature(id, g.id, Number(p.get("exp")), p.get("sig") ?? "")) throw new Error();
    const r = await db.query(
      "select storage_path from media_assets where id=$1 and work_order_id=$2 and visible_to_customer",
      [id, g.work_order_id],
    );
    if (!r.rows[0]) throw new Error();
    return new Response(new Uint8Array(await readMedia(r.rows[0].storage_path)), {
      headers: {
        ...privateHeaders,
        "Content-Type": "image/webp",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Foto no disponible" },
      { status: 404, headers: privateHeaders },
    );
  }
}
