import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { request as playwrightRequest } from "@playwright/test";

const password = "cm-local-password-2026";

async function createOrder(request: import("@playwright/test").APIRequestContext, plate: string) {
  const phone = `9${randomUUID().replace(/\D/g, "").slice(0, 8)}`;
  const customerResponse = await request.post("/api/v1/admin/customers", {
    data: { name: `CM prueba ${plate}`, phone },
  });
  expect(customerResponse.status()).toBe(201);
  const customer = (await customerResponse.json()).customer;
  const orderResponse = await request.post("/api/v1/admin/work-orders", {
    data: {
      customerId: customer.id,
      concern: "Revisión sintética",
      idempotencyKey: randomUUID(),
      vehicle: { plate, make: "Toyota", model: "Yaris" },
    },
  });
  expect(orderResponse.status()).toBe(201);
  return (await orderResponse.json()).workOrder as { id: string; version: number; code: string };
}

async function registerContact(
  request: import("@playwright/test").APIRequestContext,
  orderId: string,
  values: Record<string, unknown> = {},
) {
  const response = await request.post(`/api/v1/admin/work-orders/${orderId}/contacts`, {
    data: {
      name: "Cliente verificado",
      phone: "+51991111222",
      relationType: "client",
      canViewProgress: true,
      canApproveQuote: false,
      verifiedInPerson: true,
      verificationNote: "Identidad contrastada presencialmente en recepción",
      ...values,
    },
  });
  return { response, body: await response.json() };
}

test("recovery is non-enumerating, one-use, OT-scoped, and revocation closes the session", async ({
  request,
}) => {
  expect((await request.post("/api/v1/admin/session", { data: { password } })).status()).toBe(200);
  const orderA = await createOrder(request, "RCV-101A");
  const orderB = await createOrder(request, "RCV-202B");
  const invalidContact = await registerContact(request, orderA.id, { verifiedInPerson: false });
  expect(invalidContact.response.status()).toBe(400);
  const { response: added, body } = await registerContact(request, orderA.id);
  expect(added.status()).toBe(201);
  const contactId = body.contactId as string;

  const client = await playwrightRequest.newContext();
  try {
    const missing = await client.post("http://localhost:3100/api/v1/public/recovery/request", {
      data: { plate: "NO-ORDEN" },
    });
    const valid = await client.post("http://localhost:3100/api/v1/public/recovery/request", {
      data: { plate: "RCV-101A" },
    });
    expect(missing.status()).toBe(200);
    expect(valid.status()).toBe(200);
    const noOrder = await missing.json();
    const requested = await valid.json();
    expect(noOrder.message).toBe(requested.message);
    expect(Object.keys(noOrder).sort()).toEqual(Object.keys(requested).sort());
    expect(JSON.stringify(requested)).not.toContain("+519");
    expect(requested.testCode).toMatch(/^\d{6}$/);

    const wrong = await client.post("http://localhost:3100/api/v1/public/recovery/verify", {
      data: {
        requestId: requested.requestId,
        code: requested.testCode === "000000" ? "000001" : "000000",
      },
    });
    expect(wrong.status()).toBe(400);
    const verified = await client.post("http://localhost:3100/api/v1/public/recovery/verify", {
      data: { requestId: requested.requestId, code: requested.testCode },
    });
    expect(verified.status()).toBe(200);
    expect(await verified.json()).toEqual({ redirectTo: `/seguimiento/${orderA.id}` });
    const cookie = (await client.storageState()).cookies.find((item) => item.name === "cm_view");
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.expires).toBeGreaterThan(Date.now() / 1000);

    const replay = await client.post("http://localhost:3100/api/v1/public/recovery/verify", {
      data: { requestId: requested.requestId, code: requested.testCode },
    });
    expect(replay.status()).toBe(400);
    expect(
      (await client.get(`http://localhost:3100/api/v1/public?orderId=${orderA.id}`)).status(),
    ).toBe(200);
    expect(
      (await client.get(`http://localhost:3100/api/v1/public?orderId=${orderB.id}`)).status(),
    ).toBe(404);

    const revoked = await request.delete(
      `/api/v1/admin/work-orders/${orderA.id}/contacts/${contactId}`,
    );
    expect(revoked.status()).toBe(200);
    expect(
      (await client.get(`http://localhost:3100/api/v1/public?orderId=${orderA.id}`)).status(),
    ).toBe(404);
  } finally {
    await client.dispose();
    await request.delete("/api/v1/admin/session");
  }
});

test("ambiguous plate recovery is denied and public diagnosis keeps immutable private revisions", async ({
  request,
}) => {
  expect((await request.post("/api/v1/admin/session", { data: { password } })).status()).toBe(200);
  const first = await createOrder(request, "DGN-101A");
  const second = await createOrder(request, "DGN-202B");
  // Both active orders share one plate across two different customers.
  const secondDetail = await request.get(`/api/v1/admin/work-orders/${second.id}`);
  const secondCustomerId = (await secondDetail.json()).workOrder.customer_id as string;
  const duplicate = await request.post("/api/v1/admin/work-orders", {
    data: {
      customerId: secondCustomerId,
      concern: "Otra orden de la misma placa",
      idempotencyKey: randomUUID(),
      vehicle: { plate: "DGN-101A", make: "Toyota", model: "Yaris" },
    },
  });
  expect(duplicate.status()).toBe(201);
  await registerContact(request, first.id);
  const anonymous = await playwrightRequest.newContext();
  try {
    const ambiguous = await anonymous.post("http://localhost:3100/api/v1/public/recovery/request", {
      data: { plate: "DGN101A" },
    });
    const denied = await anonymous.post("http://localhost:3100/api/v1/public/recovery/verify", {
      data: {
        requestId: (await ambiguous.json()).requestId,
        code: (await ambiguous.json()).testCode,
      },
    });
    expect(ambiguous.status()).toBe(200);
    expect(denied.status()).toBe(400);
  } finally {
    await anonymous.dispose();
  }

  const preliminary = await request.post(`/api/v1/admin/work-orders/${first.id}/diagnoses`, {
    data: {
      expectedVersion: 2,
      kind: "preliminary",
      internalNotes: "NO PUBLICAR: hipótesis inicial",
      publicSummary: "Observamos una vibración que aún estamos evaluando.",
      publish: true,
    },
  });
  expect(preliminary.status()).toBe(201);
  const preliminaryBody = await preliminary.json();
  const share = await request.post(`/api/v1/admin/work-orders/${first.id}/share`, {
    data: { days: 7 },
  });
  expect(share.status()).toBe(200);
  const portal = await playwrightRequest.newContext();
  try {
    await portal.get((await share.json()).url);
    let projection = await portal.get(`http://localhost:3100/api/v1/public?orderId=${first.id}`);
    let data = await projection.json();
    expect(data.diagnosis.label).toBe("Evaluación inicial, pendiente de confirmar");
    expect(JSON.stringify(data)).not.toContain("NO PUBLICAR");

    const missingEvidence = await request.post(`/api/v1/admin/work-orders/${first.id}/diagnoses`, {
      data: { expectedVersion: 2, kind: "confirmed", publicSummary: "Confirmado", publish: true },
    });
    expect(missingEvidence.status()).toBe(400);

    const image = await sharp({ create: { width: 8, height: 8, channels: 3, background: "blue" } })
      .png()
      .toBuffer();
    const upload = await request.post(`/api/v1/admin/work-orders/${first.id}/media`, {
      multipart: {
        photo: { name: "evidencia.png", mimeType: "image/png", buffer: image },
        category: "diagnostico",
        visibleToCustomer: "false",
        caption: "Evidencia sintética interna",
        idempotencyKey: randomUUID(),
      },
    });
    expect(upload.status()).toBe(201);
    const evidenceId = (await upload.json()).mediaId as string;
    const confirmed = await request.post(`/api/v1/admin/work-orders/${first.id}/diagnoses`, {
      data: {
        expectedVersion: 4,
        kind: "confirmed",
        internalNotes: "NO PUBLICAR: costo interno",
        publicSummary: "La inspección confirmó desgaste en las pastillas delanteras.",
        evidenceIds: [evidenceId],
        publish: true,
      },
    });
    expect(confirmed.status()).toBe(201);
    const confirmedId = (await confirmed.json()).diagnosis.id as string;
    const crossOrder = await request.post(`/api/v1/admin/work-orders/${second.id}/diagnoses`, {
      data: {
        expectedVersion: 1,
        kind: "confirmed",
        publicSummary: "Evidencia de otra orden",
        evidenceIds: [evidenceId],
        publish: true,
      },
    });
    expect(crossOrder.status()).toBe(404);
    projection = await portal.get(`http://localhost:3100/api/v1/public?orderId=${first.id}`);
    data = await projection.json();
    expect(data.diagnosis.label).toBe("Diagnóstico confirmado");
    expect(data.diagnosis.summary).toContain("desgaste");
    expect(JSON.stringify(data)).not.toContain("NO PUBLICAR");
    expect(JSON.stringify(data)).not.toContain("Evidencia sintética interna");

    const corrected = await request.post(`/api/v1/admin/work-orders/${first.id}/diagnoses`, {
      data: {
        expectedVersion: 5,
        kind: "correction",
        supersedesId: confirmedId,
        internalNotes: "Corrección: se confirmó desgaste solo en la rueda izquierda.",
        publicSummary: "Precisamos el hallazgo: desgaste en la pastilla de la rueda izquierda.",
        evidenceIds: [evidenceId],
        publish: true,
      },
    });
    expect(corrected.status()).toBe(201);
    projection = await portal.get(`http://localhost:3100/api/v1/public?orderId=${first.id}`);
    data = await projection.json();
    expect(data.diagnosis.revision).toBe(3);
    expect(data.diagnosis.summary).toContain("rueda izquierda");
    const detail = await request.get(`/api/v1/admin/work-orders/${first.id}`);
    const diagnoses = (await detail.json()).diagnoses;
    expect(diagnoses).toHaveLength(3);
    expect(diagnoses[2].public_summary).toContain("vibración");
    expect(preliminaryBody.diagnosis.revision).toBe(1);
  } finally {
    await portal.dispose();
    await request.delete("/api/v1/admin/session");
  }
});
