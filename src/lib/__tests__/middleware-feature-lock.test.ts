import { describe, expect, it } from "vitest"
import { NextRequest } from "next/server"
import { middleware } from "../../middleware"

describe("core-exam middleware feature lock", () => {
  it("blocks online-study APIs before authentication or handlers", async () => {
    const response = await middleware(
      new NextRequest("http://localhost/api/online-study/lessons")
    )

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: "FEATURE_DISABLED" },
    })
  })

  it("blocks gamification APIs before authentication or handlers", async () => {
    const response = await middleware(
      new NextRequest("http://localhost/api/achievements")
    )

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: "FEATURE_DISABLED" },
    })
  })

  it("redirects teacher course pages to the core dashboard", async () => {
    const response = await middleware(
      new NextRequest("http://localhost/teacher/online-study?tab=orders")
    )

    expect(response.status).toBe(307)
    const location = new URL(response.headers.get("location")!)
    expect(location.pathname).toBe("/teacher/dashboard")
    expect(location.searchParams.get("online-study")).toBe("paused")
  })

  it("redirects student course pages to the assignment dashboard", async () => {
    const response = await middleware(
      new NextRequest("http://localhost/online-student/study?subject=toan")
    )

    expect(response.status).toBe(307)
    const location = new URL(response.headers.get("location")!)
    expect(location.pathname).toBe("/student/dashboard")
    expect(location.searchParams.get("online-study")).toBe("paused")
  })

  it("redirects public registration to teacher-issued login", async () => {
    const response = await middleware(
      new NextRequest("http://localhost/register")
    )

    expect(response.status).toBe(307)
    const location = new URL(response.headers.get("location")!)
    expect(location.pathname).toBe("/login")
    expect(location.searchParams.get("notice")).toBe("teacher-issued-account")
  })
})
