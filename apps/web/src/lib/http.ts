import { NextResponse } from "next/server";
import { z } from "@chambi/domain";
import { DomainError } from "./orders";
export const privateHeaders = {
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow",
};
export function failure(error: unknown) {
  return NextResponse.json(
    {
      error:
        error instanceof DomainError
          ? error.message
          : "No se pudo completar la solicitud. Vuelve a intentar.",
    },
    { status: error instanceof DomainError ? error.status : 500, headers: privateHeaders },
  );
}
export function validId(id: string) {
  if (!z.string().uuid().safeParse(id).success) throw new DomainError("Recurso no encontrado", 404);
  return id;
}
