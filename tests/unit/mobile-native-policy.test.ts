import { afterEach, it, expect, vi } from "vitest";
import appConfig from "../../apps/mobile/app.config";
afterEach(() => vi.unstubAllEnvs());
it("preserves the linked EAS project and owner in offline pilot, allowing an explicit env project override", () => {
  vi.stubEnv("APP_VARIANT", "pilot");
  vi.stubEnv("EXPO_PUBLIC_PILOT_OFFLINE", "true");
  vi.stubEnv("EAS_PROJECT_ID", "");
  const config = {
    name: "CHAMBI",
    slug: "chambi-motors",
    owner: "synthetic-owner",
    extra: { eas: { projectId: "linked-project", metadata: "keep" } },
  };
  const linked = appConfig({ config });
  expect(linked.owner).toBe("synthetic-owner");
  expect(linked.extra?.eas).toEqual(config.extra.eas);
  expect(linked.extra?.pilotOffline).toBe(true);
  vi.stubEnv("EAS_PROJECT_ID", "123e4567-e89b-42d3-a456-426614174000");
  expect(appConfig({ config }).extra?.eas).toEqual({
    projectId: "123e4567-e89b-42d3-a456-426614174000",
    metadata: "keep",
  });
});
it.each(["pilot", "production"])(
  "overrides permissive native template transport for %s",
  (variant) => {
    vi.stubEnv("APP_VARIANT", variant);
    vi.stubEnv("EXPO_PUBLIC_API_URL", "https://pilot.example.test");
    vi.stubEnv("EAS_PROJECT_ID", "");
    const config = appConfig({
      config: {
        name: "CHAMBI",
        slug: "chambi-motors",
        ios: { infoPlist: { NSAppTransportSecurity: { NSAllowsArbitraryLoads: true } } },
      },
    });
    expect(config.ios?.infoPlist?.NSAppTransportSecurity).toMatchObject({
      NSAllowsArbitraryLoads: false,
      NSAllowsLocalNetworking: false,
      NSExceptionDomains: {},
    });
    expect(config.android?.blockedPermissions).toContain("android.permission.RECORD_AUDIO");
    expect(config.android?.allowBackup).toBe(false);
  },
);
