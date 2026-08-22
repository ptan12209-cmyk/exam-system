import { defineConfig, devices } from "@playwright/test"
import dotenv from "dotenv"

// E2E env (optional): E2E_BASE_URL, E2E_STUDENT_EMAIL, E2E_STUDENT_PASSWORD,
// E2E_TEACHER_EMAIL, E2E_TEACHER_PASSWORD, E2E_FULL_EXAM
dotenv.config()

const baseURL = process.env.E2E_BASE_URL || "http://localhost:3000"

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL,
    locale: "vi-VN",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  // Spin up the PRODUCTION server unless we are testing an already-running
  // deployment. Run `npm run build` first (CI does this automatically).
  // Dev server works too but compiles on demand — flakier for smoke tests.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run start",
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120_000,
      },
})
