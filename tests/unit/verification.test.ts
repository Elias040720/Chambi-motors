import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { otpHash, testOtpEnabled, twilioVerify } from "../../apps/web/src/lib/verification";

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockRejectedValue(new Error("Unexpected mocked provider request"));
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("ENABLE_TEST_OTP", "true");
  vi.stubEnv("OTP_SIGNING_SECRET", "synthetic-signing-secret-for-unit-tests");
  vi.stubEnv("TWILIO_ACCOUNT_SID", "synthetic-account");
  vi.stubEnv("TWILIO_AUTH_TOKEN", "synthetic-provider-secret");
  vi.stubEnv("TWILIO_VERIFY_SERVICE_SID", "synthetic-service");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("OTP deployment boundaries", () => {
  it("binds OTP digests to their purpose so recovery cannot approve a quote", () => {
    const quote = otpHash("challenge-a", "123456", "quote_approval");
    const recovery = otpHash("challenge-a", "123456", "portal_recovery");
    expect(quote.equals(recovery)).toBe(false);
  });
  it("does not send commercial SMS in a synthetic pilot without explicit authorization", async () => {
    vi.stubEnv("APP_ENV", "pilot");
    vi.stubEnv("PILOT_ALLOW_COMMERCIAL_MESSAGES", "false");
    expect(await twilioVerify("999123456")).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("cannot activate test OTP in production even with the explicit flag", () => {
    expect(testOtpEnabled()).toBe(false);
    vi.stubEnv("NODE_ENV", "development");
    expect(testOtpEnabled()).toBe(true);
    vi.stubEnv("ENABLE_TEST_OTP", "false");
    expect(testOtpEnabled()).toBe(false);
  });
  it("binds a code hash to its challenge and signing secret", () => {
    const first = otpHash("challenge-one", "123456");
    expect(first.equals(otpHash("challenge-two", "123456"))).toBe(false);
    expect(first.equals(otpHash("challenge-one", "654321"))).toBe(false);
    vi.stubEnv("OTP_SIGNING_SECRET", "different-synthetic-signing-secret");
    expect(first.equals(otpHash("challenge-one", "123456"))).toBe(false);
  });
});

describe("Twilio Verify adapter without real network", () => {
  it.each(["999123456", "51999123456", "+51999123456"])(
    "normalizes the accepted Peru number %s to E.164",
    async (phone) => {
      fetchMock.mockResolvedValue(Response.json({ status: "pending" }));
      expect(await twilioVerify(phone)).toBe(true);
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("https://verify.twilio.com/v2/Services/synthetic-service/Verifications");
      expect(init.method).toBe("POST");
      expect(init.redirect).toBe("error");
      expect(init.body).toBeInstanceOf(URLSearchParams);
      const body = init.body as URLSearchParams;
      expect(body.get("To")).toBe("+51999123456");
      expect(body.get("Channel")).toBe("sms");
      expect(body.has("Code")).toBe(false);
    },
  );

  it("does not call the provider when credentials are missing or the phone is invalid", async () => {
    vi.stubEnv("TWILIO_AUTH_TOKEN", "");
    expect(await twilioVerify("999123456")).toBe(false);
    vi.stubEnv("TWILIO_AUTH_TOKEN", "synthetic-provider-secret");
    expect(await twilioVerify("+12025550101")).toBe(false);
    expect(await twilioVerify("123")).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("accepts a verification check only when the provider reports approved", async () => {
    fetchMock
      .mockResolvedValueOnce(Response.json({ status: "approved" }))
      .mockResolvedValueOnce(Response.json({ status: "pending" }));
    expect(await twilioVerify("999123456", "123456")).toBe(true);
    expect(await twilioVerify("999123456", "123456")).toBe(false);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://verify.twilio.com/v2/Services/synthetic-service/VerificationCheck");
    const body = init.body as URLSearchParams;
    expect(body.get("Code")).toBe("123456");
    expect(body.get("To")).toBe("+51999123456");
    expect(body.has("Channel")).toBe(false);
  });

  it("does not treat rejected HTTP responses or canceled sends as valid", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 429 }))
      .mockResolvedValueOnce(Response.json({ status: "canceled" }));
    expect(await twilioVerify("999123456", "123456")).toBe(false);
    expect(await twilioVerify("999123456")).toBe(false);
  });

  it("propagates a network failure instead of returning a successful check", async () => {
    fetchMock.mockRejectedValue(new Error("synthetic provider unavailable"));
    await expect(twilioVerify("999123456", "123456")).rejects.toThrow(
      "synthetic provider unavailable",
    );
  });
});
