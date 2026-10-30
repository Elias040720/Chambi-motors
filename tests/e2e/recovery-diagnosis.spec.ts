import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { Pool } from "pg";
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
  const diagnosisStage = await request.post(`/api/v1/admin/work-orders/${orderA.id}/transition`, {
    data: { status: "diagnostico", expectedVersion: orderA.version, idempotencyKey: randomUUID() },
  });
  expect(diagnosisStage.status()).toBe(200);
  const beforeQuote = await (await request.get(`/api/v1/admin/work-orders/${orderA.id}`)).json();
  const quoteCreated = await request.post(`/api/v1/admin/work-orders/${orderA.id}/actions`, {
    data: {
      action: "quote.create",
      lines: [{ description: "Servicio de prueba", kind: "trabajo", quantity: 1, unitPrice: 50 }],
      expectedVersion: beforeQuote.workOrder.version,
      idempotencyKey: randomUUID(),
    },
  });
  expect(quoteCreated.status(), await quoteCreated.text()).toBe(200);
  const quoteId = (await (await request.get(`/api/v1/admin/work-orders/${orderA.id}`)).json())
    .quotes[0].id as string;
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
    const unauthorizedApproval = await client.post(
      "http://localhost:3100/api/v1/public/verification",
      { data: { quoteId } },
    );
    expect(unauthorizedApproval.status()).toBe(403);

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

test("customer follows one work order from reception through diagnosis recovery and delivery", async ({
  request,
}) => {
  expect((await request.post("/api/v1/admin/session", { data: { password } })).status()).toBe(200);
  const order = await createOrder(request, "JNY-510A");
  const otherOrder = await createOrder(request, "JNY-520B");
  const { response: contactResponse } = await registerContact(request, order.id);
  expect(contactResponse.status()).toBe(201);

  const detail = async () => {
    const response = await request.get(`/api/v1/admin/work-orders/${order.id}`);
    expect(response.status()).toBe(200);
    return response.json();
  };
  const act = async (action: Record<string, unknown>) => {
    const before = await detail();
    const response = await request.post(`/api/v1/admin/work-orders/${order.id}/actions`, {
      data: { ...action, expectedVersion: before.workOrder.version, idempotencyKey: randomUUID() },
    });
    expect(response.status(), await response.text()).toBe(200);
    return response.json();
  };
  const move = async (status: string) => {
    const before = await detail();
    const response = await request.post(`/api/v1/admin/work-orders/${order.id}/transition`, {
      data: { status, expectedVersion: before.workOrder.version, idempotencyKey: randomUUID() },
    });
    expect(response.status(), await response.text()).toBe(200);
    return response.json();
  };

  await move("diagnostico");
  let before = await detail();
  const preliminary = await request.post(`/api/v1/admin/work-orders/${order.id}/diagnoses`, {
    data: {
      expectedVersion: before.workOrder.version,
      kind: "preliminary",
      internalNotes: "HIPÓTESIS PRIVADA: ruido en el tren delantero",
      publicSummary: "Estamos evaluando un ruido en el tren delantero.",
      publish: true,
    },
  });
  expect(preliminary.status(), await preliminary.text()).toBe(201);

  const image = await sharp({ create: { width: 8, height: 8, channels: 3, background: "green" } })
    .png()
    .toBuffer();
  const upload = await request.post(`/api/v1/admin/work-orders/${order.id}/media`, {
    multipart: {
      photo: { name: "evidencia.png", mimeType: "image/png", buffer: image },
      category: "diagnostico",
      visibleToCustomer: "true",
      caption: "Revisión visual sintética",
      idempotencyKey: randomUUID(),
    },
  });
  expect(upload.status()).toBe(201);
  const evidenceId = (await upload.json()).mediaId as string;
  before = await detail();
  const confirmed = await request.post(`/api/v1/admin/work-orders/${order.id}/diagnoses`, {
    data: {
      expectedVersion: before.workOrder.version,
      kind: "confirmed",
      internalNotes: "NO PUBLICAR: costo preliminar del proveedor",
      publicSummary: "Confirmamos desgaste en el componente delantero.",
      evidenceIds: [evidenceId],
      publish: true,
    },
  });
  expect(confirmed.status(), await confirmed.text()).toBe(201);
  const confirmedId = (await confirmed.json()).diagnosis.id as string;
  await act({
    action: "task.add",
    title: "Reemplazar componente delantero",
    weight: 1,
    requiresEvidence: true,
    visibleToCustomer: true,
  });
  await act({
    action: "quote.create",
    lines: [
      {
        description: "Reparación del tren delantero",
        kind: "trabajo",
        quantity: 1,
        unitPrice: 120,
      },
    ],
  });
  const quoteId = (await detail()).quotes[0].id as string;
  const share = await request.post(`/api/v1/admin/work-orders/${order.id}/share`, {
    data: { days: 7 },
  });
  expect(share.status()).toBe(200);
  const link = (await share.json()).url as string;

  const initialClient = await playwrightRequest.newContext({ baseURL: "http://localhost:3100" });
  try {
    await initialClient.get(link);
    const projection = await initialClient.get(`/api/v1/public?orderId=${order.id}`);
    const publicData = await projection.json();
    expect(publicData.diagnosis.label).toBe("Diagnóstico confirmado");
    expect(publicData.diagnosis.summary).toContain("desgaste");
    expect(publicData.media).toHaveLength(1);
    expect(JSON.stringify(publicData)).not.toContain("NO PUBLICAR");
    expect(JSON.stringify(publicData)).not.toContain("HIPÓTESIS PRIVADA");

    const revoke = await request.delete(`/api/v1/admin/work-orders/${order.id}/share`);
    expect(revoke.status()).toBe(200);
    expect((await initialClient.get(`/api/v1/public?orderId=${order.id}`)).status()).toBe(404);
  } finally {
    await initialClient.dispose();
  }

  const recoveredClient = await playwrightRequest.newContext({ baseURL: "http://localhost:3100" });
  try {
    const recoveryRequest = await recoveredClient.post("/api/v1/public/recovery/request", {
      data: { plate: "JNY-510A" },
    });
    expect(recoveryRequest.status()).toBe(200);
    const recovery = await recoveryRequest.json();
    expect(recovery.testCode).toMatch(/^\d{6}$/);
    const verified = await recoveredClient.post("/api/v1/public/recovery/verify", {
      data: { requestId: recovery.requestId, code: recovery.testCode },
    });
    expect(verified.status()).toBe(200);
    expect((await recoveredClient.get(`/api/v1/public?orderId=${order.id}`)).status()).toBe(200);
    expect((await recoveredClient.get(`/api/v1/public?orderId=${otherOrder.id}`)).status()).toBe(
      404,
    );
    expect(
      (await recoveredClient.post("/api/v1/public/verification", { data: { quoteId } })).status(),
    ).toBe(403);

    await act({
      action: "quote.decide",
      quoteId,
      decision: "aprobado",
      channel: "presencial",
      evidence: "Aprobación presencial sintética registrada por el taller",
    });
    await move("reparacion");
    const task = (await detail()).tasks[0];
    await act({
      action: "task.complete",
      taskId: task.id,
      completed: true,
      evidence: "Componente reemplazado y verificado",
    });
    await move("control_calidad");
    await act({
      action: "qa",
      items: [{ title: "Prueba del tren delantero", passed: true }],
      note: "Prueba sintética aprobada",
    });
    await move("listo");
    await act({
      action: "deliver",
      summary: "Reparación del tren delantero completada",
      warranty: "Garantía según condiciones de servicio",
    });

    before = await detail();
    const correction = await request.post(`/api/v1/admin/work-orders/${order.id}/diagnoses`, {
      data: {
        expectedVersion: before.workOrder.version,
        kind: "correction",
        supersedesId: confirmedId,
        internalNotes: "Aclaración de la descripción tras la entrega.",
        publicSummary: "Aclaración: se reemplazó el componente delantero y se verificó su ajuste.",
        evidenceIds: [evidenceId],
        publish: true,
      },
    });
    expect(correction.status(), await correction.text()).toBe(201);

    const finalProjection = await recoveredClient.get(`/api/v1/public?orderId=${order.id}`);
    const finalData = await finalProjection.json();
    expect(finalData.status).toBe("entregado");
    expect(finalData.delivery_summary).toContain("tren delantero");
    expect(finalData.diagnosis.summary).toContain("Aclaración");
  } finally {
    await recoveredClient.dispose();
    await request.delete("/api/v1/admin/session");
  }
});

test("recovery OTP enforces five attempts, expiry, contact revocation and plate rate limits", async ({
  request,
}) => {
  expect((await request.post("/api/v1/admin/session", { data: { password } })).status()).toBe(200);
  const order = await createOrder(request, "OTP-811A");
  const { response: contactResponse, body: contactBody } = await registerContact(request, order.id);
  expect(contactResponse.status()).toBe(201);
  const contactId = contactBody.contactId as string;
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  const client = await playwrightRequest.newContext({ baseURL: "http://localhost:3100" });
  try {
    const firstResponse = await client.post("/api/v1/public/recovery/request", {
      data: { plate: "OTP-811A" },
    });
    const first = await firstResponse.json();
    expect(firstResponse.status()).toBe(200);
    const wrongCode = first.testCode === "000000" ? "000001" : "000000";
    for (let attempt = 0; attempt < 5; attempt++) {
      expect(
        (
          await client.post("/api/v1/public/recovery/verify", {
            data: { requestId: first.requestId, code: wrongCode },
          })
        ).status(),
      ).toBe(400);
    }
    expect(
      (
        await client.post("/api/v1/public/recovery/verify", {
          data: { requestId: first.requestId, code: first.testCode },
        })
      ).status(),
    ).toBe(400);
    let stored = await pool.query("select attempts from portal_recovery_challenges where id=$1", [
      first.requestId,
    ]);
    expect(stored.rows[0].attempts).toBe(5);

    const expiredResponse = await client.post("/api/v1/public/recovery/request", {
      data: { plate: "OTP-811A" },
    });
    const expired = await expiredResponse.json();
    expect(expiredResponse.status()).toBe(200);
    await pool.query(
      "update portal_recovery_challenges set expires_at=clock_timestamp()-interval '1 second' where id=$1",
      [expired.requestId],
    );
    expect(
      (
        await client.post("/api/v1/public/recovery/verify", {
          data: { requestId: expired.requestId, code: expired.testCode },
        })
      ).status(),
    ).toBe(400);
    stored = await pool.query("select attempts from portal_recovery_challenges where id=$1", [
      expired.requestId,
    ]);
    expect(stored.rows[0].attempts).toBe(0);

    const revokedResponse = await client.post("/api/v1/public/recovery/request", {
      data: { plate: "OTP-811A" },
    });
    const revoked = await revokedResponse.json();
    expect(revokedResponse.status()).toBe(200);
    expect(
      (
        await request.delete(`/api/v1/admin/work-orders/${order.id}/contacts/${contactId}`)
      ).status(),
    ).toBe(200);
    expect(
      (
        await client.post("/api/v1/public/recovery/verify", {
          data: { requestId: revoked.requestId, code: revoked.testCode },
        })
      ).status(),
    ).toBe(400);

    const rateLimited = await client.post("/api/v1/public/recovery/request", {
      data: { plate: "OTP-811A" },
    });
    const throttled = await rateLimited.json();
    expect(Object.keys(throttled).sort()).toEqual(Object.keys(first).sort());
    expect(throttled.message).toBe(first.message);
  } finally {
    await client.dispose();
    await pool.end();
    await request.delete("/api/v1/admin/session");
  }
});

test("quote OTP requires explicit client authority and rejects representatives", async ({
  request,
}) => {
  expect((await request.post("/api/v1/admin/session", { data: { password } })).status()).toBe(200);
  const prepare = async (plate: string, relationType: "client" | "representative") => {
    const order = await createOrder(request, plate);
    const stage = await request.post(`/api/v1/admin/work-orders/${order.id}/transition`, {
      data: {
        status: "diagnostico",
        expectedVersion: order.version,
        idempotencyKey: randomUUID(),
      },
    });
    expect(stage.status()).toBe(200);
    const detail = await (await request.get(`/api/v1/admin/work-orders/${order.id}`)).json();
    const quote = await request.post(`/api/v1/admin/work-orders/${order.id}/actions`, {
      data: {
        action: "quote.create",
        lines: [
          { description: "Prueba de autorización", kind: "trabajo", quantity: 1, unitPrice: 25 },
        ],
        expectedVersion: detail.workOrder.version,
        idempotencyKey: randomUUID(),
      },
    });
    expect(quote.status()).toBe(200);
    const contact = await registerContact(request, order.id, {
      relationType,
      canApproveQuote: true,
      ...(relationType === "representative"
        ? { delegationNote: "Representante sintético designado en recepción" }
        : {}),
    });
    expect(contact.response.status()).toBe(201);
    const afterContact = await (await request.get(`/api/v1/admin/work-orders/${order.id}`)).json();
    const share = await request.post(`/api/v1/admin/work-orders/${order.id}/share`, {
      data: { days: 7 },
    });
    expect(share.status()).toBe(200);
    return {
      order,
      quoteId: afterContact.quotes[0].id as string,
      expectedVersion: afterContact.workOrder.version as number,
      link: (await share.json()).url as string,
    };
  };

  const authorized = await prepare("OTP-CLIENT", "client");
  const client = await playwrightRequest.newContext({ baseURL: "http://localhost:3100" });
  const representative = await prepare("OTP-REP", "representative");
  const rep = await playwrightRequest.newContext({ baseURL: "http://localhost:3100" });
  try {
    await client.get(authorized.link);
    const challengeResponse = await client.post("/api/v1/public/verification", {
      data: { quoteId: authorized.quoteId },
    });
    expect(challengeResponse.status()).toBe(200);
    const challenge = await challengeResponse.json();
    const approved = await client.post("/api/v1/public/decision", {
      data: {
        quoteId: authorized.quoteId,
        challengeId: challenge.challengeId,
        code: challenge.testCode,
        decision: "aprobado",
        expectedVersion: authorized.expectedVersion,
        idempotencyKey: randomUUID(),
      },
    });
    expect(approved.status(), await approved.text()).toBe(200);

    await rep.get(representative.link);
    expect(
      (
        await rep.post("/api/v1/public/verification", {
          data: { quoteId: representative.quoteId },
        })
      ).status(),
    ).toBe(403);
  } finally {
    await client.dispose();
    await rep.dispose();
    await request.delete("/api/v1/admin/session");
  }
});
