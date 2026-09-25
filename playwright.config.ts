import { defineConfig, devices } from "@playwright/test";
import { resolve } from "node:path";
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm --filter @cubpay/web exec next start -p 3100",
    url: "http://localhost:3100/api/health",
    reuseExistingServer: false,
    timeout: 60000,
    env: {
      ADMIN_EMAIL: "admin@cubpay.test",
      ADMIN_PASSWORD: "test-password-only-12345",
      APP_ORIGIN: "http://localhost:3100",
      DATABASE_URL: "",
      CUBPAY_DATA_FILE: resolve(".cubpay/e2e-" + Date.now() + ".json"),
    },
  },
});
