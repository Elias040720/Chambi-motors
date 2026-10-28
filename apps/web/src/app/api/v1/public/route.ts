import { NextResponse } from "next/server";
import { getPublicOrder } from "@/lib/public-order";
import { failure, privateHeaders, validId } from "@/lib/http";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("orderId");
    const data = await getPublicOrder(id ? validId(id) : undefined);
    const etag = `W/\"${data.id}-${data.version}-${Math.floor(Date.now() / 240000)}\"`;
    return request.headers.get("if-none-match") === etag
      ? new Response(null, { status: 304, headers: { ...privateHeaders, ETag: etag } })
      : NextResponse.json(data, { headers: { ...privateHeaders, ETag: etag } });
  } catch (e) {
    return failure(e);
  }
}
