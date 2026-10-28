import { databaseConnection } from "../../apps/web/src/lib/db-config";
export type Gate = { component: string; status: "PASS" | "BLOCKED"; message: string };
type Env = Record<string, string | undefined>;
const httpsOrigin = (v: string | undefined) => {
  try {
    const u = new URL(v ?? "");
    return (
      u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      !u.search &&
      !u.hash &&
      u.pathname === "/"
    );
  } catch {
    return false;
  }
};
export function evaluatePilotConfig(e: Env): Gate[] {
  const gates: Gate[] = [];
  const gate = (component: string, pass: boolean, message: string) =>
    gates.push({ component, status: pass ? "PASS" : "BLOCKED", message });
  gate(
    "Aislamiento",
    e.APP_ENV === "pilot" && e.PILOT_SYNTHETIC_ONLY === "true",
    "Entorno piloto dedicado y exclusivamente sintético",
  );
  gate(
    "Modos de prueba",
    e.NODE_ENV === "production" && e.LOCAL_AUTH_STUB === "false" && e.ENABLE_TEST_OTP === "false",
    "Runtime real con stub y OTP de prueba desactivados",
  );
  gate(
    "TLS",
    e.NODE_TLS_REJECT_UNAUTHORIZED !== "0" &&
      httpsOrigin(e.NEXT_PUBLIC_APP_URL) &&
      httpsOrigin(e.EXPO_PUBLIC_API_URL) &&
      e.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") === e.EXPO_PUBLIC_API_URL?.replace(/\/$/, ""),
    "Origen HTTPS común de web/API/móvil y verificación TLS activa",
  );
  let database = false;
  try {
    databaseConnection({ ...e, NODE_ENV: "production" });
    const u = new URL(e.DATABASE_URL ?? "");
    database =
      ["postgres:", "postgresql:"].includes(u.protocol) &&
      !["localhost", "127.0.0.1", "[::1]"].includes(u.hostname) &&
      !!u.password;
  } catch {}
  gate(
    "PostgreSQL",
    database,
    "Conexión de servidor al proyecto de pruebas, con secreto y TLS verificado por el runtime",
  );
  gate(
    "Supabase Auth",
    httpsOrigin(e.SUPABASE_URL) &&
      !!e.SUPABASE_ANON_KEY &&
      !!e.ADMIN_EMAIL &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.ADMIN_EMAIL),
    "URL/key y correo de una sola cuenta provisionada",
  );
  gate(
    "Storage",
    !!e.SUPABASE_SERVICE_ROLE_KEY &&
      !!e.SUPABASE_MEDIA_BUCKET?.startsWith("pilot-") &&
      (e.MEDIA_SIGNING_SECRET?.length ?? 0) >= 32,
    "Bucket privado de piloto y claves solo en servidor",
  );
  gate(
    "Expo/EAS",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      e.EAS_PROJECT_ID ?? "",
    ),
    "UUID real del proyecto Expo; la autenticación EAS se verifica aparte",
  );
  const otpOff = !e.OTP_PROVIDER;
  gate(
    "Mensajes comerciales",
    otpOff ||
      (e.OTP_PROVIDER === "twilio" &&
        e.PILOT_ALLOW_COMMERCIAL_MESSAGES === "true" &&
        !!e.TWILIO_ACCOUNT_SID &&
        !!e.TWILIO_AUTH_TOKEN &&
        !!e.TWILIO_VERIFY_SERVICE_SID),
    "OTP apagado por defecto; Twilio requiere autorización explícita y configuración completa",
  );
  return gates;
}
