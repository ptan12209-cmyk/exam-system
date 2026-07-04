import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth-utils"
import { withErrorHandler, successResponse } from "@/lib/api-utils"

// GET /api/online-study/my-subjects
async function handleGET(request: NextRequest) {
  const supabase = await createClient()
  const user = await requireAuth(supabase)

  // Fetch subjects assigned to current authenticated student
  const { data: subjects, error } = await supabase
    .from("student_online_subjects")
    .select("subject")
    .eq("student_id", user.id)

  if (error) throw error

  const subjectList = (subjects || []).map(s => s.subject)
  return NextResponse.json(successResponse(subjectList))
}

export const GET = withErrorHandler(handleGET)
