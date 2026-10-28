type BuildEnv = Record<string, string | undefined>;
export function resolveBuildVariant(env: BuildEnv = process.env) {
  const variant = env.APP_VARIANT ?? "development";
  if (!["development", "pilot", "production"].includes(variant))
    throw new Error("APP_VARIANT no válido");
  const apiUrl = env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";
  let parsed: URL;
  try {
    parsed = new URL(apiUrl);
  } catch {
    throw new Error("EXPO_PUBLIC_API_URL debe ser una URL válida");
  }
  if (
    !["http:", "https:"].includes(parsed.protocol) ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash ||
    parsed.pathname !== "/"
  )
    throw new Error("La API debe ser un origen HTTP/HTTPS sin credenciales ni parámetros");
  if (variant !== "development" && parsed.protocol !== "https:")
    throw new Error("Los builds de piloto y producción requieren una API HTTPS");
  const projectId = env.EAS_PROJECT_ID;
  if (
    projectId &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(projectId)
  )
    throw new Error("EAS_PROJECT_ID debe ser el UUID real del proyecto Expo");
  return {
    variant,
    apiUrl: parsed.origin,
    projectId,
    suffix: variant === "production" ? "" : variant === "pilot" ? ".pilot" : ".dev",
  };
}
