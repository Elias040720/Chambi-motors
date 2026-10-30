import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  grep: process.env.E2E_GREP ? new RegExp(process.env.E2E_GREP) : undefined,
  timeout: 60_000,
  expect: { timeout: 15000 },
  use: { baseURL: "http://localhost:3100", trace: "off" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm --filter @chambi/web exec next dev --hostname localhost --port 3100",
    url: "http://localhost:3100",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      CHAMBI_E2E: "true",
      DATABASE_URL: process.env.DATABASE_URL!,
      ADMIN_PASSWORD: "cm-local-password-2026",
      NEXT_PUBLIC_APP_URL: "http://localhost:3100",
      ENABLE_TEST_OTP: "true",
      TRUST_PROXY: "true",
      SUPABASE_URL: "",
      SUPABASE_ANON_KEY: "",
      NODE_ENV: "development",
    },
  },
});
