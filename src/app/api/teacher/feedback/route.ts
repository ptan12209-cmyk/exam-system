import { NextRequest, NextResponse } from "next/server"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import { requireAuth, requireRole } from "@/lib/auth-utils"
import { withErrorHandler, successResponse, ApiError } from "@/lib/api-utils"

async function handleGET(request: NextRequest) {
  const supabase = await createClient()
  const user = await requireAuth(supabase)
  await requireRole(supabase, user.id, ["teacher", "admin"])

  const status = request.nextUrl.searchParams.get("status")
  const category = request.nextUrl.searchParams.get("category")

  const admin = createAdminClient()
  let q = admin
    .from("system_feedback")
    .select(
      "id, user_id, category, body, subject_key, lesson_id, page_path, status, teacher_note, created_at, updated_at, profiles:user_id(full_name, email)"
    )
    .order("created_at", { ascending: false })
    .limit(100)

  if (status && status !== "all") {
    q = q.eq("status", status)
  }
  if (category && category !== "all") {
    q = q.eq("category", category)
  }

  const { data, error } = await q
  if (error) {
    console.error("[teacher/feedback]", error)
    throw new ApiError("INTERNAL", error.message, 500)
  }

  return NextResponse.json(successResponse({ items: data || [] }))
}

export const GET = withErrorHandler(handleGET)
