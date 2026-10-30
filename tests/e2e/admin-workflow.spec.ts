import { expect, test } from "@playwright/test";
test("administrator creates an intake and task using the phone interface", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin");
  await page.getByLabel("Clave", { exact: true }).fill("cm-local-password-2026");
  const [login] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().endsWith("/api/v1/admin/session") && r.request().method() === "POST",
    ),
    page.getByRole("button", { name: "Ingresar", exact: true }).click(),
  ]);
  expect(login.status()).toBe(200);
  await page.getByLabel("Cliente", { exact: true }).selectOption("new");
  await page.getByLabel("Nombre (si es nuevo)", { exact: true }).fill("Cliente navegador QA");
  await page.getByLabel("Celular peruano 9XXXXXXXX").fill("966111222");
  await page.getByLabel("Placa", { exact: true }).fill("WEB-900");
  await page.getByLabel("Marca", { exact: true }).fill("Hyundai");
  await page.getByLabel("Modelo", { exact: true }).fill("H100");
  await page.getByLabel("Motivo de ingreso", { exact: true }).fill("Revisar sistema de suspensión");
  const [created] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().endsWith("/api/v1/admin/work-orders") && r.request().method() === "POST",
    ),
    page.getByRole("button", { name: "Guardar orden", exact: true }).click(),
  ]);
  expect(created.status()).toBe(201);
  const [detail] = await Promise.all([
    page.waitForResponse(
      (r) =>
        /\/api\/v1\/admin\/work-orders\/[a-f0-9-]+$/.test(r.url()) &&
        r.request().method() === "GET",
    ),
    page.getByRole("link", { name: /OT-.*WEB-900/ }).click(),
  ]);
  expect(detail.status()).toBe(200);
  await expect(page.getByRole("heading", { name: /WEB-900/ })).toBeVisible();
  await page.getByRole("button", { name: "Tareas", exact: true }).click();
  await page.getByLabel("Título", { exact: true }).fill("Revisar amortiguadores");
  const [task] = await Promise.all([
    page.waitForResponse((r) => r.url().endsWith("/actions") && r.request().method() === "POST"),
    page.getByRole("button", { name: "Agregar tarea", exact: true }).click(),
  ]);
  expect(task.status()).toBe(200);
  await expect(page.getByText("Revisar amortiguadores · Peso 1", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Diagnóstico", exact: true }).click();
  await page
    .getByLabel("Notas internas y motivo de corrección")
    .fill("Síntoma preliminar de prueba visual.");
  await page
    .getByLabel("Resumen para el cliente")
    .fill("Estamos evaluando una vibración antes de confirmar el diagnóstico.");
  await page.getByLabel("Publicar el resumen en el portal").check();
  const [diagnosis] = await Promise.all([
    page.waitForResponse((r) => r.url().endsWith("/diagnoses") && r.request().method() === "POST"),
    page.getByRole("button", { name: "Guardar revisión", exact: true }).click(),
  ]);
  expect(diagnosis.status()).toBe(201);
  await expect(page.getByText("Estamos evaluando una vibración", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Contactos", exact: true }).click();
  await page.getByLabel("Nombre", { exact: true }).fill("Abel Cliente QA");
  await page.getByLabel("Teléfono verificado (+519XXXXXXXX)").fill("+51966111222");
  await page
    .getByLabel("Cómo se verificó identidad y teléfono")
    .fill("Identidad y teléfono comprobados presencialmente en recepción.");
  await page.getByLabel("Confirmo que comprobé presencialmente identidad y teléfono").check();
  const [contact] = await Promise.all([
    page.waitForResponse((r) => r.url().endsWith("/contacts") && r.request().method() === "POST"),
    page.getByRole("button", { name: "Registrar en esta orden", exact: true }).click(),
  ]);
  expect(contact.status()).toBe(201);
  await expect(page.getByText("Abel Cliente QA · Cliente")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "test-results/admin-contacts-phone.png", fullPage: true });
});
