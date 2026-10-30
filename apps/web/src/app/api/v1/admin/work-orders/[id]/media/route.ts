import { createHash, randomUUID } from "node:crypto";
import sharp from "sharp";
import { NextResponse } from "next/server";
import { z } from "@chambi/domain";
import { isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { saveMedia, removeMedia } from "@/lib/media";
import { failure, privateHeaders, validId } from "@/lib/http";
import { DomainError } from "@/lib/orders";
export const dynamic = "force-dynamic";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const form = await request.formData().catch(() => null),
    file = form?.get("photo"),
    category = form?.get("category");
  if (
    !(file instanceof File) ||
    file.size < 1 ||
    file.size > 8 * 1024 * 1024 ||
    !["image/jpeg", "image/png", "image/webp"].includes(file.type)
  )
    return NextResponse.json({ error: "Elige JPG, PNG o WebP de hasta 8 MB" }, { status: 400 });
  if (!["ingreso", "diagnostico", "reparacion", "control", "entrega"].includes(String(category)))
    return NextResponse.json({ error: "Categoría no válida" }, { status: 400 });
  const uploadKey = form?.get("idempotencyKey");
  if (uploadKey && !z.string().uuid().safeParse(uploadKey).success)
    return NextResponse.json({ error: "Clave de carga no válida" }, { status: 400 });
  let bytes: Buffer;
  try {
    const raw = Buffer.from(await file.arrayBuffer());
    const matches =
      file.type === "image/jpeg"
        ? raw.length > 3 && raw[0] === 255 && raw[1] === 216 && raw[2] === 255
        : file.type === "image/png"
          ? raw.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
          : raw.toString("ascii", 0, 4) === "RIFF" && raw.toString("ascii", 8, 12) === "WEBP";
    if (!matches)
      return NextResponse.json(
        { error: "El archivo no coincide con el formato de imagen declarado" },
        { status: 400 },
      );
    bytes = await sharp(raw, {
      limitInputPixels: 24_000_000,
      animated: false,
    })
      .rotate()
      .resize({ width: 1800, height: 1800, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
  } catch {
    return NextResponse.json({ error: "La foto no es una imagen válida" }, { status: 400 });
  }
  const hash = createHash("sha256")
      .update(bytes)
      .update(
        JSON.stringify({
          category,
          caption: String(form?.get("caption") ?? "").slice(0, 160) || null,
          visible: form?.get("visibleToCustomer") === "true",
        }),
      )
      .digest("hex"),
    key = `${randomUUID()}.webp`,
    c = await db.connect();
  let saved = false;
  try {
    const id = validId((await params).id);
    await c.query("begin");
    const order = await c.query("select status from work_orders where id=$1 for update", [id]);
    if (!order.rowCount) throw new DomainError("Orden no encontrada", 404);
    if (uploadKey) {
      const prior = await c.query(
        "select id,content_hash from media_assets where work_order_id=$1 and upload_key=$2",
        [id, uploadKey],
      );
      if (prior.rows[0]) {
        if (prior.rows[0].content_hash !== hash)
          throw new DomainError("La clave de carga ya se usó para otra foto", 409);
        await c.query("commit");
        return NextResponse.json(
          { uploaded: true, mediaId: prior.rows[0].id },
          { status: 201, headers: privateHeaders },
        );
      }
    }
    if (["entregado", "cancelado"].includes(order.rows[0].status))
      throw new DomainError("La orden está cerrada");
    await saveMedia(key, bytes);
    saved = true;
    const result = await c.query(
      "insert into media_assets(work_order_id,storage_path,category,visible_to_customer,caption,mime_type,byte_size,upload_key,content_hash) values($1,$2,$3,$4,$5,'image/webp',$6,$7,$8) returning id",
      [
        id,
        key,
        category,
        form?.get("visibleToCustomer") === "true",
        String(form?.get("caption") ?? "").slice(0, 160) || null,
        bytes.length,
        uploadKey ?? null,
        hash,
      ],
    );
    await c.query("update work_orders set version=version+1,updated_at=now() where id=$1", [id]);
    await c.query(
      "insert into audit_events(actor,action,entity_type,entity_id) values('admin','media_added','work_order',$1)",
      [id],
    );
    await c.query("commit");
    return NextResponse.json(
      { uploaded: true, mediaId: result.rows[0].id },
      { status: 201, headers: privateHeaders },
    );
  } catch (e) {
    await c.query("rollback");
    if (saved) await removeMedia(key).catch(() => {});
    return failure(e);
  } finally {
    c.release();
  }
}
