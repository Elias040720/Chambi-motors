import { expect, test } from "@playwright/test";
import { request as playwrightRequest } from "@playwright/test";
import { randomUUID } from "node:crypto";
const password = "cm-local-password-2026";
test("admin creates an order, shares a private URL, and grants only its vehicle", async ({
  request,
}) => {
  const denied = await request.get("/api/v1/admin/work-orders");
  expect(denied.status()).toBe(401);
  const session = await request.post("/api/v1/admin/session", { data: { password } });
  expect(session.ok()).toBeTruthy();
  const customer = await request.post("/api/v1/admin/customers", {
    data: { name: "Cliente QA", phone: "999123456" },
  });
  expect(customer.status()).toBe(201);
  const c = (await customer.json()).customer;
  const create = async (plate: string) => {
    const r = await request.post("/api/v1/admin/work-orders", {
      data: {
        customerId: c.id,
        concern: "Mantenimiento preventivo",
        mileage: 40000,
        vehicle: { plate, make: "Toyota", model: "Yaris", year: 2022, mileage: 40000 },
      },
    });
    expect(r.status()).toBe(201);
    return (await r.json()).workOrder;
  };
  const first = await create("QA-101A"),
    second = await create("QA-202B");
  expect(
    (
      await request.post(`/api/v1/admin/work-orders/${first.id}/transition`, {
        data: { status: "diagnostico", expectedVersion: 1, idempotencyKey: randomUUID() },
      })
    ).status(),
  ).toBe(200);
  const transitionBody = { status: "reparacion", expectedVersion: 2, idempotencyKey: randomUUID() };
  const moved = await request.post(`/api/v1/admin/work-orders/${first.id}/transition`, {
    data: transitionBody,
  });
  expect(moved.status()).toBe(200);
  const movedBody = await moved.json();
  expect(movedBody.workOrder.status).toBe("reparacion");
  const retry = await request.post(`/api/v1/admin/work-orders/${first.id}/transition`, {
    data: transitionBody,
  });
  expect(retry.status()).toBe(200);
  expect((await retry.json()).workOrder.version).toBe(3);
  const conflict = await request.post(`/api/v1/admin/work-orders/${first.id}/transition`, {
    data: { ...transitionBody, status: "pausado", reason: "No autorizado" },
  });
  expect(conflict.status()).toBe(409);
  const share = await request.post(`/api/v1/admin/work-orders/${first.id}/share`, {
    data: { days: 7 },
  });
  expect(share.status()).toBe(200);
  const { url } = await share.json();
  expect(url).toContain("/t/");
  const publicContext = await playwrightRequest.newContext();
  const opened = await publicContext.get(url);
  expect(opened.ok(), `${opened.status()} ${opened.url()} ${await opened.text()}`).toBeTruthy();
  expect(opened.url()).toContain(`/seguimiento/${first.id}`);
  expect(opened.url()).not.toContain("/t/");
  const html = await opened.text();
  const projection = await (
    await publicContext.get(`http://localhost:3100/api/v1/public?orderId=${first.id}`)
  ).json();
  expect(projection.code).toBe(first.code);
  expect(projection.plate).toBe("QA-101A");
  expect(projection.status).toBe("reparacion");
  expect(html).not.toContain("QA-202B");
  expect(html).not.toContain("999123456");
  expect(html).not.toContain(new URL(url).pathname.split("/").pop()!);
  const other = await publicContext.get(`http://localhost:3100/api/v1/public?orderId=${second.id}`);
  expect(other.status()).toBe(404);
  const revoked = await request.delete(`/api/v1/admin/work-orders/${first.id}/share`);
  expect(revoked.status()).toBe(200);
  const expired = await publicContext.get(url);
  expect(expired.url()).toContain("/seguimiento/vencido");
  await publicContext.dispose();
  await request.delete("/api/v1/admin/session");
});

test("admin sign-in is readable at a phone viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Acceso del taller" })).toBeVisible();
  await page.getByLabel("Clave").fill(password);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page.getByRole("heading", { name: "Órdenes de trabajo" })).toBeVisible();
  const dimensions = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width);
  await page.screenshot({ path: "test-results/admin-phone.png", fullPage: true });
});
