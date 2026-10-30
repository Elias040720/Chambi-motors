import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
test("a lost approval response retries the same decision and cannot change its intent", async ({
  request,
  page,
}) => {
  await request.post("/api/v1/admin/session", { data: { password: "cm-local-password-2026" } });
  const c = await (
    await request.post("/api/v1/admin/customers", {
      data: { name: "Prueba de reintento", phone: "955123456" },
    })
  ).json();
  const created = await (
    await request.post("/api/v1/admin/work-orders", {
      data: {
        customerId: c.customer.id,
        concern: "Revisión de mantenimiento",
        vehicle: { plate: "RETRY-9", make: "Toyota", model: "Yaris" },
        idempotencyKey: randomUUID(),
      },
    })
  ).json();
  const id = created.workOrder.id;
  expect(
    (
      await request.post(`/api/v1/admin/work-orders/${id}/contacts`, {
        data: {
          name: "Contacto sintético autorizado",
          phone: "+51955123456",
          relationType: "client",
          canViewProgress: true,
          canApproveQuote: true,
          verifiedInPerson: true,
          verificationNote: "Verificación presencial sintética para reintento OTP",
        },
      })
    ).status(),
  ).toBe(201);
  expect(
    (
      await request.post(`/api/v1/admin/work-orders/${id}/transition`, {
        data: { status: "diagnostico", expectedVersion: 2, idempotencyKey: randomUUID() },
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await request.post(`/api/v1/admin/work-orders/${id}/actions`, {
        data: {
          action: "quote.create",
          lines: [
            {
              description: "Revisión de mantenimiento",
              kind: "trabajo",
              quantity: 1,
              unitPrice: 50,
            },
          ],
          expectedVersion: 3,
          idempotencyKey: randomUUID(),
        },
      })
    ).status(),
  ).toBe(200);
  const link = await (
    await request.post(`/api/v1/admin/work-orders/${id}/share`, { data: { days: 7 } })
  ).json();
  await page.goto(link.url);
  await expect(page.getByRole("button", { name: "Verificar contacto para decidir" })).toBeVisible();
  const [verification] = await Promise.all([
    page.waitForResponse((r) => r.url().endsWith("/api/v1/public/verification")),
    page.getByRole("button", { name: "Verificar contacto para decidir" }).click(),
  ]);
  const code = (await verification.json()).testCode;
  await page.getByLabel("Código de verificación").fill(code);
  let dialogs = 0;
  page.on("dialog", async (d) => {
    dialogs++;
    await d.accept();
  });
  await page.route(
    "**/api/v1/public/decision",
    async (route) => {
      const accepted = await route.fetch();
      expect(accepted.status()).toBe(200);
      await route.abort("failed");
    },
    { times: 1 },
  );
  await page.getByRole("button", { name: "Aprobar V1" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Reintenta para consultar la misma solicitud",
  );
  await page.getByRole("button", { name: "Rechazar", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Reintenta esa misma decisión");
  expect(dialogs).toBe(1);
  await page.getByRole("button", { name: "Aprobar V1" }).click();
  await expect(page.getByRole("status")).toHaveText("Tu decisión quedó registrada.");
  expect(dialogs).toBe(2);
  const details = await (await request.get(`/api/v1/admin/work-orders/${id}`)).json();
  expect(details.quotes[0].decision.decision).toBe("aprobado");
  expect(
    details.events.filter((e: { event_type: string }) => e.event_type === "quote.decide.remote"),
  ).toHaveLength(1);
});
