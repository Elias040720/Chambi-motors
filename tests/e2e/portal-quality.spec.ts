import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
test("customer portal remains accessible and retains honest state through connection loss", async ({
  request,
  page,
}) => {
  await request.post("/api/v1/admin/session", { data: { password: "cm-local-password-2026" } });
  const c = await (
    await request.post("/api/v1/admin/customers", {
      data: { name: "Calidad sintética", phone: "933224466" },
    })
  ).json();
  const w = await (
    await request.post("/api/v1/admin/work-orders", {
      data: {
        customerId: c.customer.id,
        concern: "Revisión preventiva",
        vehicle: { plate: "A11Y-1", make: "Toyota", model: "Yaris" },
        idempotencyKey: randomUUID(),
      },
    })
  ).json();
  const id = w.workOrder.id,
    word = "Observacion".repeat(30);
  expect(
    (
      await request.post(`/api/v1/admin/work-orders/${id}/actions`, {
        data: {
          action: "note",
          internalNotes: "NO-ES-PUBLICO",
          publicNotes: word,
          expectedVersion: 1,
          idempotencyKey: randomUUID(),
        },
      })
    ).status(),
  ).toBe(200);
  const image = await sharp({ create: { width: 8, height: 8, channels: 3, background: "yellow" } })
    .png()
    .toBuffer();
  expect(
    (
      await request.post(`/api/v1/admin/work-orders/${id}/media`, {
        multipart: {
          photo: { name: "qa.png", mimeType: "image/png", buffer: image },
          category: "ingreso",
          visibleToCustomer: "true",
          caption: "Imagen sintética de validación",
          idempotencyKey: randomUUID(),
        },
      })
    ).status(),
  ).toBe(201);
  const share = await (
    await request.post(`/api/v1/admin/work-orders/${id}/share`, { data: { days: 7 } })
  ).json();
  await page.clock.install();
  await page.goto(share.url);
  await expect(page.getByRole("heading", { name: "Vehículo recibido", exact: true })).toBeVisible();
  await expect(page.getByRole("main")).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(
    page.getByRole("progressbar", { name: "Avance por tareas completadas" }),
  ).toHaveAttribute("aria-valuenow", "0");
  await expect(page.getByRole("img", { name: "Imagen sintética de validación" })).toBeVisible();
  await expect
    .poll(() =>
      page
        .getByRole("img", { name: "Imagen sintética de validación" })
        .evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0),
    )
    .toBe(true);
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true);
    const right = await page.getByText(word, { exact: true }).evaluate((el) => {
      const r = document.createRange();
      r.selectNodeContents(el);
      return r.getBoundingClientRect().right;
    });
    expect(right).toBeLessThanOrEqual(width);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  const endpoint = /\/api\/v1\/public\?/;
  await page.route(endpoint, (route) => route.abort("failed"));
  await page.clock.fastForward(20000);
  await expect(page.getByRole("status")).toContainText("Sin conexión");
  await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
  await page.unroute(endpoint);
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect(page.getByText(/Sin conexión\. Mostramos/)).toHaveCount(0);
  await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
  await expect(page.getByText("NO-ES-PUBLICO")).toHaveCount(0);
  await page.screenshot({ path: "test-results/pilot-portal-phone.png", fullPage: true });
});
