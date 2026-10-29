import { describe, it, expect } from "vitest";
import {
  assertApiEnabled,
  isDevicePilot,
  resolveBuildVariant,
} from "../../apps/mobile/lib/build-config";
describe("isolated native pilot configuration", () => {
  it.each(["pilot", "development"])(
    "permits explicit offline %s without inventing an API origin",
    (variant) => {
      const build = resolveBuildVariant({
        APP_VARIANT: variant,
        EXPO_PUBLIC_PILOT_OFFLINE: "true",
      });
      expect(build.pilotOffline).toBe(true);
      expect(build.apiUrl).toBeUndefined();
      expect(isDevicePilot({ appVariant: variant, pilotOffline: build.pilotOffline })).toBe(true);
    },
  );
  it("forbids offline production and does not enable diagnostics for a bare flag", () => {
    expect(() =>
      resolveBuildVariant({ APP_VARIANT: "production", EXPO_PUBLIC_PILOT_OFFLINE: "true" }),
    ).toThrow("producción");
    expect(isDevicePilot({ appVariant: "production", pilotOffline: true })).toBe(false);
    expect(isDevicePilot({ appVariant: "pilot", pilotOffline: "true" })).toBe(false);
    expect(isDevicePilot()).toBe(false);
  });
  it("rejects network work synchronously in offline pilot", () => {
    expect(() => assertApiEnabled(true)).toThrow("Servidor pendiente");
    expect(() => assertApiEnabled(false)).not.toThrow();
  });
  it("uses a separate development application identity and permits local HTTP", () => {
    expect(resolveBuildVariant({ EXPO_PUBLIC_API_URL: "http://127.0.0.1:3180" })).toMatchObject({
      variant: "development",
      suffix: ".dev",
      apiUrl: "http://127.0.0.1:3180",
    });
  });
  it.each(["pilot", "production"])(
    "blocks insecure release transport for %s before a build",
    (variant) => {
      expect(() =>
        resolveBuildVariant({
          APP_VARIANT: variant,
          EXPO_PUBLIC_API_URL: "http://192.0.2.10:3180",
        }),
      ).toThrow("HTTPS");
    },
  );
  it("separates pilot identity while keeping the production identifier", () => {
    expect(
      resolveBuildVariant({
        APP_VARIANT: "pilot",
        EXPO_PUBLIC_API_URL: "https://pilot.example.test",
      }).suffix,
    ).toBe(".pilot");
    expect(
      resolveBuildVariant({
        APP_VARIANT: "production",
        EXPO_PUBLIC_API_URL: "https://app.example.test",
      }).suffix,
    ).toBe("");
  });
  it("never embeds URL credentials or accepts an invented EAS project identifier", () => {
    expect(() =>
      resolveBuildVariant({ EXPO_PUBLIC_API_URL: "https://user:password@pilot.example.test" }),
    ).toThrow("credenciales");
    expect(() => resolveBuildVariant({ EAS_PROJECT_ID: "replace-me" })).toThrow("UUID");
  });
});
