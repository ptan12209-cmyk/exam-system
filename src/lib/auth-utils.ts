import { SupabaseClient } from '@supabase/supabase-js'
import { ApiError } from '@/lib/api-utils'

// ---------------------------------------------------------------------------
// requireAuth – Lấy user hiện tại, throw 401 nếu chưa đăng nhập
// ---------------------------------------------------------------------------

export async function requireAuth(supabase: SupabaseClient) {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        throw new ApiError('UNAUTHORIZED', 'Unauthorized', 401)
    }
    return user
}

// ---------------------------------------------------------------------------
// requireRole – Kiểm tra role của user (query profiles nếu cần), throw 403
// ---------------------------------------------------------------------------

export async function requireRole(
    supabase: SupabaseClient,
    userId: string,
    roles: string[]
): Promise<void> {
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()

    if (!profile || !roles.includes(profile.role)) {
        throw new ApiError('FORBIDDEN', 'Insufficient permissions', 403)
    }
}

// ---------------------------------------------------------------------------
// checkExamAccess – Kiểm tra quyền truy cập exam
//   - 404 nếu exam không tồn tại
//   - 403 nếu không có quyền (không phải teacher owner, không phải teacher/admin, không phải participant)
//   - Trả về exam object
// ---------------------------------------------------------------------------

export async function checkExamAccess(
    supabase: SupabaseClient,
    userId: string,
    examId: string,
    select: string = 'id, teacher_id, status'
): Promise<any> {
    const { data: exam, error: examError } = await supabase
        .from('exams')
        .select(select)
        .eq('id', examId)
        .single()

    if (examError || !exam) {
        throw new ApiError('EXAM_NOT_FOUND', 'Exam not found or not published', 404)
    }

    // Kiểm tra teacher ownership trước để tránh query profile không cần thiết
    let hasAccess = (exam as any).teacher_id === userId

    if (!hasAccess) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', userId)
            .single()

        hasAccess = profile?.role === 'teacher' || profile?.role === 'admin'
    }

    if (!hasAccess) {
        const { data: participant } = await supabase
            .from('exam_participants')
            .select('id')
            .eq('exam_id', examId)
            .eq('user_id', userId)
            .maybeSingle()

        if (!participant) {
            throw new ApiError('NOT_ENROLLED', 'Not enrolled in this exam', 403)
        }
    }

    return exam
}
