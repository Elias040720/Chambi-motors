import {
  expect,
  test,
  request as playwrightRequest,
  type APIRequestContext,
} from "@playwright/test";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
const password = "cm-local-password-2026";
async function fixture(request: APIRequestContext) {
  expect((await request.post("/api/v1/admin/session", { data: { password } })).status()).toBe(200);
  const c = await request.post("/api/v1/admin/customers", {
    data: { name: "Operación sintética", phone: "988123456", contactPreference: "phone" },
  });
  const customer = (await c.json()).customer;
  expect(customer.contact_preference).toBe("phone");
  const input = {
    customerId: customer.id,
    concern: "Revisar frenos y luces",
    vehicle: {
      plate: "TEST-800",
      make: "Toyota",
      model: "Hiace",
      vin: "TESTVIN001",
      mileage: 40000,
    },
    idempotencyKey: randomUUID(),
  };
  const created = await request.post("/api/v1/admin/work-orders", { data: input });
  expect(created.status()).toBe(201);
  const order = (await created.json()).workOrder;
  const contact = await request.post(`/api/v1/admin/work-orders/${order.id}/contacts`, {
    data: {
      name: "Contacto sintético autorizado",
      phone: "+51988123456",
      relationType: "client",
      canViewProgress: true,
      canApproveQuote: true,
      verifiedInPerson: true,
      verificationNote: "Verificación presencial sintética para pruebas de orden",
    },
  });
  expect(contact.status(), await contact.text()).toBe(201);
  const details = await (await request.get(`/api/v1/admin/work-orders/${order.id}`)).json();
  expect(details.workOrder.vin).toBe("TESTVIN001");
  expect(details.workOrder.mileage).toBe(40000);
  const repeat = await request.post("/api/v1/admin/work-orders", { data: input });
  expect((await repeat.json()).workOrder.id).toBe(order.id);
  return details.workOrder as { id: string; version: number; status: string; code: string };
}
test("tasks, immutable quote decisions, physical parts, QA rework and delivery persist", async ({
  request,
  page,
}) => {
  const order = await fixture(request);
  let version = order.version;
  async function act(payload: Record<string, unknown>, expected = 200) {
    const r = await request.post(`/api/v1/admin/work-orders/${order.id}/actions`, {
      data: { ...payload, expectedVersion: version, idempotencyKey: randomUUID() },
    });
    expect(r.status(), await r.text()).toBe(expected);
    if (expected === 200) version = (await r.json()).workOrder.version;
    return r;
  }
  async function move(status: string, expected = 200, reason?: string) {
    const r = await request.post(`/api/v1/admin/work-orders/${order.id}/transition`, {
      data: { status, reason, expectedVersion: version, idempotencyKey: randomUUID() },
    });
    expect(r.status(), await r.text()).toBe(expected);
    if (expected === 200) version = (await r.json()).workOrder.version;
  }
  const detail = async () => {
    const r = await request.get(`/api/v1/admin/work-orders/${order.id}`);
    expect(r.status()).toBe(200);
    return r.json();
  };
  await move("listo", 422);
  await move("diagnostico");
  await act({
    action: "note",
    internalNotes: "PROVEEDOR-OCULTO-123",
    publicNotes: "Estamos revisando tu vehículo.",
  });
  await act({
    action: "eta",
    from: "2026-12-01T10:00:00-05:00",
    to: "2026-12-01T18:00:00-05:00",
    confidence: "tentativa",
    reason: "Diagnóstico de componentes pendiente",
  });
  await act({
    action: "quote.create",
    lines: [{ description: "Servicio de frenos", kind: "trabajo", quantity: 1, unitPrice: 80.5 }],
  });
  let d = await detail();
  const quote = d.quotes[0];
  expect(Number(quote.total)).toBe(80.5);
  await act({
    action: "task.add",
    title: "Inspeccionar y reparar frenos",
    weight: 3,
    visibleToCustomer: true,
    requiresEvidence: true,
    quoteId: quote.id,
  });
  d = await detail();
  const task = d.tasks[0];
  await act({
    action: "task.add",
    title: "Prueba final de frenos",
    weight: 1,
    priority: "alta",
    dependsOn: task.id,
    visibleToCustomer: true,
  });
  d = await detail();
  const dependent = d.tasks.find((t: { title: string }) => t.title === "Prueba final de frenos");
  expect(d.tasks[0].priority).toBe("alta");
  await move("reparacion", 422);
  const share = await request.post(`/api/v1/admin/work-orders/${order.id}/share`, {
    data: { days: 7 },
  });
  const link = (await share.json()).url;
  const customer = await playwrightRequest.newContext({ baseURL: "http://localhost:3100" });
  await customer.get(link);
  let projection = await customer.get(`/api/v1/public?orderId=${order.id}`);
  let publicData = await projection.json();
  expect(JSON.stringify(publicData)).not.toContain("PROVEEDOR-OCULTO");
  expect(publicData).not.toHaveProperty("phone");
  expect(publicData.quotes[0].lines[0].unitPrice).toBe(80.5);
  const challenge = await customer.post("/api/v1/public/verification", {
    data: { quoteId: quote.id },
  });
  expect(challenge.status(), await challenge.text()).toBe(200);
  const code = await challenge.json();
  const decision = {
    quoteId: quote.id,
    challengeId: code.challengeId,
    code: code.testCode,
    decision: "aprobado",
    expectedVersion: version,
    idempotencyKey: randomUUID(),
  };
  expect(
    (
      await customer.post("/api/v1/public/decision", { data: { ...decision, code: "000000" } })
    ).status(),
  ).toBe(422);
  const approved = await customer.post("/api/v1/public/decision", { data: decision });
  expect(approved.status(), await approved.text()).toBe(200);
  version = (await approved.json()).version;
  expect((await customer.post("/api/v1/public/decision", { data: decision })).status()).toBe(200);
  d = await detail();
  expect(d.quotes[0].decision.decision).toBe("aprobado");
  await act(
    {
      action: "quote.decide",
      quoteId: quote.id,
      decision: "rechazado",
      channel: "presencial",
      evidence: "Intento de modificar decisión",
    },
    422,
  );
  await act({
    action: "part.request",
    description: "Pastillas compatibles con vehículo",
    urgency: "alta",
    resolution: "cliente",
    provider: "PROVEEDOR-OCULTO-456",
  });
  d = await detail();
  const part = d.parts[0];
  await act({
    action: "part.promise",
    partId: part.id,
    resolution: "cliente",
    promisedAt: "2026-12-01T12:00:00-05:00",
  });
  await move("reparacion", 422);
  await act(
    { action: "blocker.resolve", blockerId: d.blockers[0].id, reason: "Solo promesa de entrega" },
    422,
  );
  await act({
    action: "part.receive",
    partId: part.id,
    accepted: false,
    note: "Pieza incompatible",
  });
  await move("reparacion", 422);
  await act({ action: "part.promise", partId: part.id, resolution: "taller" });
  await act({
    action: "part.receive",
    partId: part.id,
    accepted: true,
    note: "Recepción física conforme",
  });
  await act(
    {
      action: "part.receive",
      partId: part.id,
      accepted: false,
      note: "No debe deshacer recepción",
    },
    422,
  );
  await move("reparacion");
  await act({ action: "task.complete", taskId: dependent.id, completed: true }, 422);
  await act({ action: "task.complete", taskId: task.id, completed: true }, 422);
  await act({
    action: "task.complete",
    taskId: task.id,
    completed: true,
    evidence: "Prueba de frenado realizada",
  });
  expect((await detail()).progress).toBe(75);
  await act({ action: "task.complete", taskId: dependent.id, completed: true });
  expect((await detail()).progress).toBe(100);
  await act({ action: "task.complete", taskId: task.id, completed: false }, 422);
  await move("control_calidad");
  await move("listo", 422);
  await act({
    action: "qa",
    items: [{ title: "Verificación de frenado", passed: false }],
    note: "Requiere ajuste final",
  });
  d = await detail();
  expect(d.workOrder.status).toBe("reparacion");
  expect(d.inspections[0].passed).toBe(false);
  expect(d.progress).toBeLessThan(100);
  await move("control_calidad", 422);
  const rework = d.tasks.find((t: { title: string }) => t.title.startsWith("Retrabajo:"));
  await act({
    action: "task.complete",
    taskId: rework.id,
    completed: true,
    evidence: "Ajuste y prueba funcional conformes",
  });
  await move("control_calidad");
  await act({
    action: "qa",
    items: [{ title: "Verificación de frenado", passed: true }],
    note: "QA aprobado tras retrabajo",
  });
  await move("listo");
  await act(
    { action: "blocker.add", kind: "pausado", reason: "No debe invalidar orden lista" },
    422,
  );
  await act({
    action: "deliver",
    summary: "Sistema de frenos revisado y probado",
    warranty: "Garantía del trabajo según condiciones entregadas",
  });
  await act({ action: "note", internalNotes: "Cambiar pasado", publicNotes: "" }, 422);
  d = await detail();
  expect(d.workOrder.status).toBe("entregado");
  expect(d.inspections).toHaveLength(2);
  expect(d.events.length).toBeGreaterThan(15);
  projection = await customer.get(`/api/v1/public?orderId=${order.id}`);
  publicData = await projection.json();
  expect(JSON.stringify(publicData)).not.toContain("PROVEEDOR-OCULTO");
  expect(publicData.delivery_summary).toContain("frenos");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(link);
  await expect(
    page.getByRole("heading", { name: "Servicio entregado", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
  await expect(page.getByText(/Entrega registrada:/)).toBeVisible();
  await expect(page.getByText(/Entrega tentativa:/)).toHaveCount(0);
  await page.screenshot({ path: "test-results/customer-phone.png", fullPage: true });
  await customer.dispose();
});

test("new quote versions require new approval; media authorization, rotation and ETags", async ({
  request,
}) => {
  const order = await fixture(request);
  let version = order.version;
  const mutate = async (payload: Record<string, unknown>) => {
    const r = await request.post(`/api/v1/admin/work-orders/${order.id}/actions`, {
      data: { ...payload, expectedVersion: version, idempotencyKey: randomUUID() },
    });
    expect(r.status(), await r.text()).toBe(200);
    version = (await r.json()).workOrder.version;
  };
  const moved = await request.post(`/api/v1/admin/work-orders/${order.id}/transition`, {
    data: { status: "diagnostico", expectedVersion: version, idempotencyKey: randomUUID() },
  });
  version = (await moved.json()).workOrder.version;
  await mutate({
    action: "quote.create",
    lines: [{ description: "Revisión inicial", kind: "trabajo", quantity: 1, unitPrice: 50 }],
  });
  let d = await (await request.get(`/api/v1/admin/work-orders/${order.id}`)).json();
  const first = d.quotes[0];
  await mutate({
    action: "quote.decide",
    quoteId: first.id,
    decision: "aprobado",
    channel: "presencial",
    evidence: "Cliente aprobó presencialmente V1",
  });
  await mutate({
    action: "quote.create",
    lines: [
      { description: "Nuevo alcance adicional", kind: "trabajo", quantity: 1, unitPrice: 100 },
    ],
  });
  expect(
    (
      await request.post(`/api/v1/admin/work-orders/${order.id}/transition`, {
        data: { status: "reparacion", expectedVersion: version, idempotencyKey: randomUUID() },
      })
    ).status(),
  ).toBe(422);
  const disguised = await request.post(`/api/v1/admin/work-orders/${order.id}/media`, {
    multipart: {
      photo: {
        name: "fake.png",
        mimeType: "image/png",
        buffer: Buffer.from(
          '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="red"/></svg>',
        ),
      },
      category: "diagnostico",
    },
  });
  expect(disguised.status()).toBe(400);
  const photo = await sharp({
      create: { width: 10, height: 10, channels: 3, background: "yellow" },
    })
      .png()
      .toBuffer(),
    key = randomUUID();
  const upload = (visible = "false") =>
    request.post(`/api/v1/admin/work-orders/${order.id}/media`, {
      multipart: {
        photo: { name: "evidence.png", mimeType: "image/png", buffer: photo },
        category: "diagnostico",
        idempotencyKey: key,
        visibleToCustomer: visible,
      },
    });
  const up = await upload();
  expect(up.status(), await up.text()).toBe(201);
  const mediaId = (await up.json()).mediaId;
  expect((await upload("true")).status()).toBe(409);
  expect((await (await upload()).json()).mediaId).toBe(mediaId);
  d = await (await request.get(`/api/v1/admin/work-orders/${order.id}`)).json();
  version = d.workOrder.version;
  const link = await (
    await request.post(`/api/v1/admin/work-orders/${order.id}/share`, { data: { days: 7 } })
  ).json();
  const client = await playwrightRequest.newContext({ baseURL: "http://localhost:3100" });
  await client.get(link.url);
  expect((await (await client.get("/api/v1/public")).json()).media).toHaveLength(0);
  expect((await client.get(`/api/v1/admin/media/${mediaId}`)).status()).toBe(401);
  await mutate({ action: "media.visibility", mediaId, visibleToCustomer: true });
  const publicResponse = await client.get("/api/v1/public"),
    projection = await publicResponse.json();
  expect(projection.media).toHaveLength(1);
  const signed = projection.media[0].url;
  expect((await client.get(signed)).status()).toBe(200);
  const anonymous = await playwrightRequest.newContext({ baseURL: "http://localhost:3100" });
  expect((await anonymous.get(signed)).status()).toBe(404);
  expect((await client.get(signed.replace(/exp=\d+/, "exp=1"))).status()).toBe(404);
  expect(
    (
      await client.get("/api/v1/public", {
        headers: { "If-None-Match": publicResponse.headers().etag! },
      })
    ).status(),
  ).toBe(304);
  await request.post(`/api/v1/admin/work-orders/${order.id}/share`, { data: { days: 7 } });
  expect((await client.get("/api/v1/public")).status()).toBe(404);
  expect((await client.get(signed)).status()).toBe(404);
  await client.dispose();
  await anonymous.dispose();
});

test("CSRF denied and anonymous link enumeration is limited", async ({ request }) => {
  await request.post("/api/v1/admin/session", { data: { password } });
  expect(
    (
      await request.post("/api/v1/admin/customers", {
        headers: { Origin: "https://untrusted.example" },
        data: { name: "Forbidden", phone: "977111222" },
      })
    ).status(),
  ).toBe(401);
  let limited = false;
  for (let i = 0; i < 65; i++) {
    const r = await request.get("/t/not-a-valid-token", {
      headers: { "x-forwarded-for": "198.51.100.250" },
      maxRedirects: 0,
    });
    if (r.status() === 429) {
      limited = true;
      expect(r.headers()["retry-after"]).toBe("60");
      break;
    }
  }
  expect(limited).toBe(true);
});
