import { describe, expect, it } from "vitest";
import {
  assertTransition,
  CustomerInput,
  Plate,
  clientStatus,
  verifiedProgress,
  quoteTotal,
  ActionInput,
} from "./index";
describe("taller domain rules", () => {
  it("normalizes a Peruvian plate and rejects malformed plates", () => {
    expect(Plate.parse("abc-123")).toBe("ABC-123");
    expect(Plate.safeParse("?!").success).toBe(false);
  });
  it("validates Peru mobile numbers without accepting arbitrary digits", () => {
    expect(CustomerInput.safeParse({ name: "Ana Pérez", phone: "999123456" }).success).toBe(true);
    expect(CustomerInput.safeParse({ name: "Ana", phone: "123" }).success).toBe(false);
  });
  it("requires QA before ready and retains retrabajo path", () => {
    expect(() => assertTransition("control_calidad", "listo", false)).toThrow("control de calidad");
    expect(() => assertTransition("control_calidad", "reparacion")).not.toThrow();
    expect(() => assertTransition("reparacion", "control_calidad")).not.toThrow();
  });
  it("requires a reason to pause and translates client-facing states", () => {
    expect(() => assertTransition("reparacion", "pausado", false)).toThrow("motivo");
    expect(clientStatus("esperando_aprobacion")).toBe("Esperando tu aprobación");
  });
  it("rejects invalid terminal transitions", () => {
    expect(() => assertTransition("entregado", "reparacion")).toThrow("Transición no permitida");
  });
  it("reports progress only from completed weighted tasks", () => {
    expect(verifiedProgress([])).toBe(0);
    expect(
      verifiedProgress([
        { weight: 3, completed_at: null },
        { weight: 1, completed_at: "2026-10-27T00:00:00Z" },
      ]),
    ).toBe(25);
    expect(verifiedProgress([{ weight: 1, completed_at: null }])).toBe(0);
  });
  it("rounds PEN line amounts consistently without floating point accumulation", () => {
    expect(
      quoteTotal([
        { quantity: 3.33, unitPrice: 0.1 },
        { quantity: 2, unitPrice: 0.1 },
      ]),
    ).toBe(0.53);
  });
  it("requires version, retry identity and exact quote line limits", () => {
    const input = {
      action: "quote.create",
      lines: [{ description: "Revisión general", kind: "trabajo", quantity: 1, unitPrice: 50 }],
      expectedVersion: 1,
      idempotencyKey: "15848594-859a-4996-966a-e822012cffd0",
    };
    expect(ActionInput.safeParse(input).success).toBe(true);
    expect(ActionInput.safeParse({ ...input, expectedVersion: 0 }).success).toBe(false);
    expect(
      ActionInput.safeParse({ ...input, lines: [{ ...input.lines[0], unitPrice: -1 }] }).success,
    ).toBe(false);
  });
});
