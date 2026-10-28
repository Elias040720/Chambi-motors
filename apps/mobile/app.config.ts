import "tsx/cjs";
import type { ConfigContext, ExpoConfig } from "expo/config";
import { resolveBuildVariant } from "./lib/build-config";
export default ({ config }: Pick<ConfigContext, "config">): ExpoConfig => {
  const build = resolveBuildVariant();
  return {
    ...config,
    name:
      build.variant === "production"
        ? "CHAMBI MOTORS"
        : `CHAMBI MOTORS · ${build.variant === "pilot" ? "Piloto" : "Desarrollo"}`,
    slug: config.slug ?? "chambi-motors",
    scheme: `chambimotors${build.suffix.replace(".", "-")}`,
    ios: {
      ...config.ios,
      bundleIdentifier: `pe.chambimotors.app${build.suffix}`,
      infoPlist: {
        ...config.ios?.infoPlist,
        ...(build.variant === "development"
          ? {
              NSLocalNetworkUsageDescription:
                "Conectar con el servidor de desarrollo en tu red privada.",
            }
          : {}),
        NSAppTransportSecurity:
          build.variant === "development"
            ? { NSAllowsArbitraryLoads: true, NSAllowsLocalNetworking: true }
            : {
                NSAllowsArbitraryLoads: false,
                NSAllowsLocalNetworking: false,
                NSExceptionDomains: {},
              },
      },
    },
    android: {
      ...config.android,
      allowBackup: false,
      package: `pe.chambimotors.app${build.suffix}`,
      blockedPermissions: [
        ...new Set([
          ...(config.android?.blockedPermissions ?? []),
          "android.permission.RECORD_AUDIO",
        ]),
      ],
    },
    extra: {
      ...config.extra,
      appVariant: build.variant,
      ...(build.projectId ? { eas: { projectId: build.projectId } } : {}),
    },
  };
};
