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

  it("blocks monitoring APIs before authentication or handlers", async () => {
    const response = await middleware(
      new NextRequest("http://localhost/api/monitor/analyze")
    )

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: "FEATURE_DISABLED" },
    })
  })

  it("redirects locked arena routes to the role dashboard", async () => {
    const studentResponse = await middleware(
      new NextRequest("http://localhost/arena")
    )
    expect(studentResponse.status).toBe(307)
    const studentLocation = new URL(studentResponse.headers.get("location")!)
    expect(studentLocation.pathname).toBe("/student/dashboard")
    expect(studentLocation.searchParams.get("arena")).toBe("paused")

    const teacherResponse = await middleware(
      new NextRequest("http://localhost/teacher/arena")
    )
    expect(teacherResponse.status).toBe(307)
    const teacherLocation = new URL(teacherResponse.headers.get("location")!)
    expect(teacherLocation.pathname).toBe("/teacher/dashboard")
    expect(teacherLocation.searchParams.get("arena")).toBe("paused")
  })

  it("redirects locked timetable, checklist and monitoring pages", async () => {
    for (const [path, param] of [
      ["/student/timetable", "timetable"],
      ["/teacher/timetable", "timetable"],
      ["/student/checklist", "checklist"],
      ["/teacher/monitor", "monitoring"],
    ] as const) {
      const response = await middleware(
        new NextRequest(`http://localhost${path}`)
      )
      expect(response.status).toBe(307)
      const location = new URL(response.headers.get("location")!)
      expect(location.searchParams.get(param)).toBe("paused")
    }
  })
})
