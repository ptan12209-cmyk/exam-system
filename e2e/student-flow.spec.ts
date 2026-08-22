/**
 * Student journey smoke test.
 *
 * Mặc định KHÔNG nộp bài thật (an toàn khi chạy trên dữ liệu production):
 * login → dashboard → danh sách đề → mở trang làm bài → xác minh đề đã tải
 * → rời đi. Chỉ khi đặt E2E_FULL_EXAM=true mới chạy đến bước NỘP BÀI.
 *
 * Yêu cầu E2E_STUDENT_EMAIL/E2E_STUDENT_PASSWORD. Bỏ qua khi thiếu.
 */
import { test, expect } from "@playwright/test"
import dotenv from "dotenv"

dotenv.config()

const email = process.env.E2E_STUDENT_EMAIL
const password = process.env.E2E_STUDENT_PASSWORD
const fullExam = process.env.E2E_FULL_EXAM === "true"

const run = Boolean(email && password)
test.skip(!run, "E2E_STUDENT_EMAIL / E2E_STUDENT_PASSWORD not configured")

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login")
  await page.getByPlaceholder("name@example.com").fill(email!)
  await page.getByPlaceholder("••••••••").fill(password!)
  await page.getByRole("button", { name: /Đăng nhập/ }).click()
}

test.describe("student core flow", () => {
  test("login reaches student dashboard", async ({ page }) => {
    await login(page)
    await expect(page).toHaveURL(/\/student\/dashboard/, { timeout: 20_000 })
    await expect(
      page.getByRole("heading", { name: /Xin chào|Chào mừng/ }).first()
    ).toBeVisible({ timeout: 30_000 })
  })

  test("assigned exams list renders and take page loads questions", async ({ page }) => {
    await login(page)
    await expect(page).toHaveURL(/\/student\/dashboard/, { timeout: 20_000 })

    await page.goto("/student/exams")
    await expect(page).toHaveURL(/\/student\/exams/)
    // Wait for the list to finish loading (skeleton disappears)
    await page.waitForTimeout(2_000)

    const takeLink = page.getByRole("link", { name: /^Làm bài|Luyện tập ngay|Làm lại$/ }).first()
    const hasExam = await takeLink.isVisible().catch(() => false)
    test.skip(!hasExam, "no published exam available for this account right now")

    await takeLink.click()
    await expect(page).toHaveURL(/\/take/, { timeout: 20_000 })

    // Exam payload loaded via the safe API — question grid must appear
    await expect(
      page.locator("text=/câu hỏi|Câu/i").first()
    ).toBeVisible({ timeout: 30_000 })
  })

  test("full exam submit path (only with E2E_FULL_EXAM=true)", async ({ page }) => {
    test.skip(!fullExam, "set E2E_FULL_EXAM=true to run the real submission")

    await login(page)
    await expect(page).toHaveURL(/\/student\/dashboard/, { timeout: 20_000 })
    await page.goto("/student/exams")
    await page.waitForTimeout(2_000)

    const takeLink = page.getByRole("link", { name: /^Làm bài|Luyện tập ngay$/ }).first()
    const hasExam = await takeLink.isVisible().catch(() => false)
    test.skip(!hasExam, "no unattempted published exam available")
    await takeLink.click()
    await expect(page).toHaveURL(/\/take/, { timeout: 20_000 })
    await page.waitForTimeout(3_000)

    // Answer every MC question with A
    const answerCells = page.locator("button:has-text('A')")
    const count = Math.min(await answerCells.count(), 40)
    test.skip(count === 0, "no MC answer buttons found — exam may be PDF-only")

    for (let i = 0; i < count; i++) {
      await answerCells.nth(i).click()
    }

    await page.getByRole("button", { name: /Nộp bài/i }).click()
    // Confirm dialog if present
    const confirmBtn = page.getByRole("button", { name: /Xác nhận|Nộp/i }).last()
    if (await confirmBtn.isVisible().catch(() => false)) {
      await confirmBtn.click()
    }

    await expect(page).toHaveURL(/\/result/, { timeout: 60_000 })
    await expect(page.locator("text=/Kết quả/i").first()).toBeVisible()
  })
})
