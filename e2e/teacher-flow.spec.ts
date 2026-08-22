/**
 * Teacher journey smoke test — chỉ xác minh các trang quản lý tải đúng
 * (KHÔNG tạo/xóa đề thật để tránh làm bẩn dữ liệu).
 *
 * Yêu cầu E2E_TEACHER_EMAIL/E2E_TEACHER_PASSWORD. Bỏ qua khi thiếu.
 */
import { test, expect } from "@playwright/test"
import dotenv from "dotenv"

dotenv.config()

const email = process.env.E2E_TEACHER_EMAIL
const password = process.env.E2E_TEACHER_PASSWORD

const run = Boolean(email && password)
test.skip(!run, "E2E_TEACHER_EMAIL / E2E_TEACHER_PASSWORD not configured")

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login")
  await page.getByPlaceholder("name@example.com").fill(email!)
  await page.getByPlaceholder("••••••••").fill(password!)
  await page.getByRole("button", { name: /Đăng nhập/ }).click()
}

test.describe("teacher management pages", () => {
  test("login reaches teacher dashboard", async ({ page }) => {
    await login(page)
    await expect(page).toHaveURL(/\/teacher\/dashboard/, { timeout: 20_000 })
    await expect(
      page.getByText(/Xin chào|Thầy|Cô/i).first()
    ).toBeVisible({ timeout: 30_000 })
  })

  test("exam list page renders", async ({ page }) => {
    await login(page)
    await expect(page).toHaveURL(/\/teacher\/dashboard/, { timeout: 20_000 })
    await page.goto("/teacher/exams")
    await expect(page).toHaveURL(/\/teacher\/exams/)
    await expect(
      page.getByText(/Quản lý đề thi|Tạo đề|đề thi/i).first()
    ).toBeVisible({ timeout: 30_000 })
  })

  test("create exam page renders", async ({ page }) => {
    await login(page)
    await expect(page).toHaveURL(/\/teacher\/dashboard/, { timeout: 20_000 })
    await page.goto("/teacher/exams/create")
    await expect(page).toHaveURL(/\/teacher\/exams\/create/)
    // The form must expose a title field
    await expect(page.locator("input").first()).toBeVisible({ timeout: 30_000 })
  })

  test("student management page renders", async ({ page }) => {
    await login(page)
    await expect(page).toHaveURL(/\/teacher\/dashboard/, { timeout: 20_000 })
    await page.goto("/teacher/students")
    await expect(page).toHaveURL(/\/teacher\/students/)
    await expect(
      page.getByText(/Học sinh|Cấp tài khoản/i).first()
    ).toBeVisible({ timeout: 30_000 })
  })

  test("analytics page renders", async ({ page }) => {
    await login(page)
    await expect(page).toHaveURL(/\/teacher\/dashboard/, { timeout: 20_000 })
    await page.goto("/teacher/analytics")
    await expect(page).toHaveURL(/\/teacher\/analytics/)
    await expect(
      page.getByText(/Thống kê|phổ điểm|kết quả/i).first()
    ).toBeVisible({ timeout: 30_000 })
  })

  test("role wall: student account cannot open teacher pages", async ({ browser }) => {
    test.skip(!process.env.E2E_STUDENT_EMAIL, "E2E_STUDENT_EMAIL not configured")

    const studentPage = await browser.newPage({ locale: "vi-VN" })
    await studentPage.goto("/login")
    await studentPage.getByPlaceholder("name@example.com").fill(process.env.E2E_STUDENT_EMAIL!)
    await studentPage.getByPlaceholder("••••••••").fill(process.env.E2E_STUDENT_PASSWORD!)
    await studentPage.getByRole("button", { name: /Đăng nhập/ }).click()
    await studentPage.waitForURL(/\/student\/dashboard/, { timeout: 20_000 })

    await studentPage.goto("/teacher/dashboard")
    await expect(studentPage).not.toHaveURL(/\/teacher\/dashboard/)
    // Middleware sends students to the student dashboard
    await expect(studentPage).toHaveURL(/\/student\/dashboard/)
    await studentPage.close()
  })
})
