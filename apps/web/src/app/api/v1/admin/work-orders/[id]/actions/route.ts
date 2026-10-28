import { NextResponse } from "next/server";
import { ActionInput } from "@chambi/domain";
import { isAdmin } from "@/lib/auth";
import { applyAction } from "@/lib/orders";
import { failure, privateHeaders, validId } from "@/lib/http";
export const dynamic = "force-dynamic";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const parsed = ActionInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Revisa los datos requeridos de la acción" },
      { status: 400 },
    );
  try {
    return NextResponse.json(await applyAction(validId((await params).id), parsed.data), {
      headers: privateHeaders,
    });
  } catch (e) {
    return failure(e);
  }
}
