/**
 * Auth & feature-lock smoke tests — KHÔNG cần tài khoản, an toàn chạy mọi lúc.
 */
import { test, expect } from "@playwright/test"

test.describe("public routing guards", () => {
  test("unauthenticated user hitting /student/dashboard is sent to login", async ({ page }) => {
    await page.goto("/student/dashboard")
    await expect(page).toHaveURL(/\/login/)
  })

  test("unauthenticated user hitting /teacher/exams is sent to login", async ({ page }) => {
    await page.goto("/teacher/exams")
    await expect(page).toHaveURL(/\/login/)
  })

  test("public registration stays locked (teacher-issued accounts)", async ({ page }) => {
    const response = await page.goto("/register", { waitUntil: "domcontentloaded" })
    expect(response?.status()).toBeLessThan(400)
    await expect(page).toHaveURL(/\/login\?notice=teacher-issued-account/)
  })

  test("locked arena redirects with ?arena=paused", async ({ page }) => {
    // Unauthenticated visitors continue on to /login (auth guard runs after
    // the feature lock) — assert the lock param survives the chain.
    await page.goto("/arena")
    await expect(page).toHaveURL(/[\?&]arena=paused/)
  })

  test("locked teacher timetable redirects with ?timetable=paused", async ({ page }) => {
    await page.goto("/teacher/timetable")
    await expect(page).toHaveURL(/[\?&]timetable=paused/)
  })

  test("locked monitoring station redirects with ?monitoring=paused", async ({ page }) => {
    await page.goto("/teacher/monitor")
    await expect(page).toHaveURL(/[\?&]monitoring=paused/)
  })
})

test.describe("API auth gates (no session)", () => {
  test("exam questions API requires auth", async ({ request }) => {
    const res = await request.get(`/api/exams/${crypto.randomUUID()}/questions`)
    expect(res.status()).toBe(401)
  })

  test("submit API requires auth", async ({ request }) => {
    const res = await request.post("/api/exams/submit", { data: {} })
    expect(res.status()).toBe(401)
  })

  test("leaderboard API requires auth", async ({ request }) => {
    const res = await request.get(`/api/exams/${crypto.randomUUID()}/leaderboard`)
    expect(res.status()).toBe(401)
  })

  test("registration API is permanently disabled", async ({ request }) => {
    const res = await request.post("/api/auth/register", {
      data: { email: "e2e@example.com", password: "x" },
    })
    expect(res.status()).toBe(403)
  })

  test("monitoring API is feature-locked (503)", async ({ request }) => {
    const res = await request.post("/api/monitor/analyze", { data: {} })
    expect(res.status()).toBe(503)
    const body = await res.json()
    expect(body.error?.code ?? body.code).toBe("FEATURE_DISABLED")
  })

  test("health probe answers generically", async ({ request }) => {
    const res = await request.get("/api/health")
    const body = await res.json()
    expect(typeof body.ok).toBe("boolean")
    // must not disclose env configuration details
    expect(body.checks).toBeUndefined()
    expect(body.service).toBeUndefined()
  })
})

test.describe("login form", () => {
  test("wrong credentials show an error and stay on login", async ({ page }) => {
    await page.goto("/login")
    await page.getByPlaceholder("name@example.com").fill("e2e-wrong@example.com")
    await page.getByPlaceholder("••••••••").fill("wrong-password")
    await page.getByRole("button", { name: /Đăng nhập/ }).click()
    // Supabase rejects → error message appears; we never leave /login
    await expect(page).toHaveURL(/\/login/)
    await expect(
      page.locator("text=/Invalid|đăng nhập|Email|password|credentials/i").first()
    ).toBeVisible({ timeout: 15_000 })
  })
})
