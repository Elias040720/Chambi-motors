import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getOrder } from "@/lib/orders";
import { failure, privateHeaders, validId } from "@/lib/http";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    return NextResponse.json(await getOrder(validId((await params).id)), {
      headers: privateHeaders,
    });
  } catch (e) {
    return failure(e);
  }
}
