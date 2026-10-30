import {
  test,
  expect,
  request as playwrightRequest,
  type APIRequestContext,
} from "@playwright/test";
import { Pool } from "pg";
import { randomUUID } from "node:crypto";

for (const expiry of ["challenge", "grant"] as const) {
  test(`rejects ${expiry} expiry that occurs while approval waits for the order lock`, async ({
    request,
  }) => {
    const url = new URL(process.env.DATABASE_URL!);
    if (!url.pathname.startsWith("/cm_test_"))
      throw new Error("Fixture requires the disposable E2E database");
    const pool = new Pool({ connectionString: url.toString(), max: 3 });
    let customer: APIRequestContext | undefined;
    try {
      expect(
        (
          await request.post("/api/v1/admin/session", {
            data: { password: "cm-local-password-2026" },
          })
        ).status(),
      ).toBe(200);
      const c = await (
        await request.post("/api/v1/admin/customers", {
          data: { name: "Caducidad sintética", phone: "944224466" },
        })
      ).json();
      const w = await (
        await request.post("/api/v1/admin/work-orders", {
          data: {
            customerId: c.customer.id,
            concern: "Revisión de seguridad",
            vehicle: {
              plate: expiry === "grant" ? "CLOCK-1" : "CLOCK-2",
              make: "Toyota",
              model: "Yaris",
            },
            idempotencyKey: randomUUID(),
          },
        })
      ).json();
      const id = w.workOrder.id;
      expect(
        (
          await request.post(`/api/v1/admin/work-orders/${id}/contacts`, {
            data: {
              name: "Contacto sintético autorizado",
              phone: "+51944224466",
              relationType: "client",
              canViewProgress: true,
              canApproveQuote: true,
              verifiedInPerson: true,
              verificationNote: "Verificación presencial sintética para prueba de expiración",
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
                { description: "Revisión general", kind: "trabajo", quantity: 1, unitPrice: 50 },
              ],
              expectedVersion: 3,
              idempotencyKey: randomUUID(),
            },
          })
        ).status(),
      ).toBe(200);
      const detail = await (await request.get(`/api/v1/admin/work-orders/${id}`)).json(),
        quoteId = detail.quotes[0].id;
      const link = await (
        await request.post(`/api/v1/admin/work-orders/${id}/share`, { data: { days: 7 } })
      ).json();
      customer = await playwrightRequest.newContext({ baseURL: "http://localhost:3100" });
      await customer.get(link.url);
      const verification = await customer.post("/api/v1/public/verification", {
        data: { quoteId },
      });
      expect(verification.status()).toBe(200);
      const challenge = await verification.json();
      const blocker = await pool.connect();
      let response;
      try {
        await blocker.query("begin");
        const pid = (await blocker.query("select pg_backend_pid() pid")).rows[0].pid;
        await blocker.query("select id from work_orders where id=$1 for update", [id]);
        const pending = customer.post("/api/v1/public/decision", {
          data: {
            quoteId,
            challengeId: challenge.challengeId,
            code: challenge.testCode,
            decision: "aprobado",
            expectedVersion: detail.workOrder.version,
            idempotencyKey: randomUUID(),
          },
        });
        let waiting = false;
        try {
          for (let n = 0; n < 80; n++) {
            const r = await pool.query(
              "select exists(select 1 from pg_stat_activity where $1=any(pg_blocking_pids(pid))) waiting",
              [pid],
            );
            if (r.rows[0].waiting) {
              waiting = true;
              break;
            }
            await new Promise((resolve) => setTimeout(resolve, 25));
          }
          expect(waiting, "the approval must be observed waiting behind our row lock").toBe(true);
          if (expiry === "challenge")
            await pool.query(
              "update verification_challenges set expires_at=clock_timestamp()-interval '1 second' where id=$1",
              [challenge.challengeId],
            );
          else
            await pool.query(
              "update access_grants set expires_at=clock_timestamp()-interval '1 second' where work_order_id=$1",
              [id],
            );
        } finally {
          await blocker.query("rollback");
        }
        response = await pending;
      } finally {
        blocker.release();
      }
      expect(response.status()).toBe(expiry === "challenge" ? 422 : 404);
      expect(
        (await pool.query("select status from quotes where id=$1", [quoteId])).rows[0].status,
      ).toBe("pendiente");
      expect(
        (
          await pool.query("select count(*)::int count from quote_decisions where quote_id=$1", [
            quoteId,
          ])
        ).rows[0].count,
      ).toBe(0);
    } finally {
      await customer?.dispose();
      await pool.end();
    }
  });
}
