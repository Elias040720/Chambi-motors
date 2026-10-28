import { afterEach, it, expect, vi } from "vitest";
import appConfig from "../../apps/mobile/app.config";
afterEach(() => vi.unstubAllEnvs());
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
