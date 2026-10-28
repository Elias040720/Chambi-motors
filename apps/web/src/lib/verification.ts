import { createHmac, randomInt } from "node:crypto";
export const testOtpEnabled = () =>
  process.env.NODE_ENV !== "production" && process.env.ENABLE_TEST_OTP === "true";
export const otpHash = (id: string, code: string) =>
  createHmac("sha256", process.env.OTP_SIGNING_SECRET ?? "only-development-test-otp")
    .update(`${id}:${code}`)
    .digest();
export const newOtp = () => String(randomInt(100000, 1000000));
export const commercialOtpAllowed = () =>
  process.env.APP_ENV !== "pilot" || process.env.PILOT_ALLOW_COMMERCIAL_MESSAGES === "true";
export async function twilioVerify(phone: string, code?: string) {
  if (!commercialOtpAllowed()) return false;
  const service = process.env.TWILIO_VERIFY_SERVICE_SID,
    account = process.env.TWILIO_ACCOUNT_SID,
    key = process.env.TWILIO_AUTH_TOKEN;
  if (!service || !account || !key) return false;
  const to = "+51" + phone.replace(/\D/g, "").replace(/^51(?=9\d{8}$)/, "");
  if (!/^\+519\d{8}$/.test(to)) return false;
  const body = new URLSearchParams(code ? { To: to, Code: code } : { To: to, Channel: "sms" });
  const r = await fetch(
    `https://verify.twilio.com/v2/Services/${service}/${code ? "VerificationCheck" : "Verifications"}`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${account}:${key}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
      redirect: "error",
      signal: AbortSignal.timeout(8000),
    },
  );
  if (!r.ok) return false;
  const result = await r.json();
  return code ? result.status === "approved" : result.status === "pending";
}
