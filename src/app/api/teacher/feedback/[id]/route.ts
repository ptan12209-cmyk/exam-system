import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import { requireAuth, requireRole } from "@/lib/auth-utils"
import { withErrorHandler, successResponse, ApiError } from "@/lib/api-utils"

const schema = z.object({
  status: z.enum(["new", "seen", "in_progress", "done", "archived"]).optional(),
  teacher_note: z.string().trim().max(2000).nullable().optional(),
})

async function handlePATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const user = await requireAuth(supabase)
  await requireRole(supabase, user.id, ["teacher", "admin"])

  const { id } = await ctx.params
  if (!id) throw new ApiError("BAD_REQUEST", "Thiếu id", 400)

  const raw = await request.json().catch(() => null)
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    throw new ApiError("BAD_REQUEST", "Dữ liệu không hợp lệ", 400)
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }
  if (parsed.data.status !== undefined) updates.status = parsed.data.status
  if (parsed.data.teacher_note !== undefined) {
    updates.teacher_note = parsed.data.teacher_note
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("system_feedback")
    .update(updates)
    .eq("id", id)
    .select("id, status, teacher_note, updated_at")
    .single()

  if (error) {
    throw new ApiError("INTERNAL", error.message, 500)
  }

  return NextResponse.json(successResponse({ item: data }))
}

export const PATCH = withErrorHandler(handlePATCH)
