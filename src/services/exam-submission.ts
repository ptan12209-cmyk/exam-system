import { SupabaseClient } from '@supabase/supabase-js'
import { ApiError } from '@/lib/api-utils'
import { invalidateCache } from '@/lib/cache'
import type { ScoringResult, TFStudentAnswer, SAStudentAnswer, CheatFlags } from '@/types/exam'

/**
 * Xác thực quyền truy cập bài thi của người dùng.
 * Kiểm tra bài thi tồn tại, đã xuất bản, và người dùng là giáo viên/chủ sở hữu
 * hoặc đã được ghi danh vào bài thi.
 *
 * @param supabase - Phiên bản Supabase client.
 * @param userId - Mã định danh người dùng.
 * @param examId - Mã bài thi.
 * @returns Promise phân giải thành đối tượng chứa exam và cờ isTeacher.
 * @throws ApiError nếu bài thi không tồn tại, chưa xuất bản, hoặc người dùng không được ghi danh.
 */
export async function validateExamAccess(
    supabase: SupabaseClient,
    userId: string,
    examId: string
): Promise<{ exam: any; isTeacher: boolean }> {
    const { data: exam, error: examError } = await supabase
        .from('exams')
        .select('id, title, duration, total_questions, correct_answers, mc_answers, tf_answers, sa_answers, max_attempts, is_scheduled, start_time, end_time, teacher_id')
        .eq('id', examId)
        .eq('status', 'published')
        .single()

    if (examError || !exam) {
        throw new ApiError('EXAM_NOT_FOUND', 'Exam not found or not published', 404)
    }

    let isTeacher = exam.teacher_id === userId

    if (!isTeacher) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', userId)
            .single()
        isTeacher = profile?.role === 'teacher' || profile?.role === 'admin'
    }

    if (!isTeacher) {
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

    return { exam, isTeacher }
}

/**
 * Xác thực lịch thi của bài thi.
 * Nếu bài thi có lịch (is_scheduled), kiểm tra thời gian bắt đầu và kết thúc.
 *
 * @param exam - Đối tượng bài thi (chứa is_scheduled, start_time, end_time).
 * @param now - Thời điểm hiện tại.
 * @throws ApiError nếu bài thi chưa bắt đầu hoặc đã kết thúc.
 */
export function validateSchedule(exam: any, now: Date): void {
    if (exam.is_scheduled) {
        if (exam.start_time && new Date(exam.start_time) > now) {
            throw new ApiError('EXAM_NOT_STARTED', 'Exam has not started yet', 403)
        }
        if (exam.end_time && new Date(exam.end_time) < now) {
            throw new ApiError('EXAM_ENDED', 'Exam has ended', 403)
        }
    }
}

/**
 * Xác thực số lần làm bài còn lại.
 * Đếm số lần đã nộp và so sánh với giới hạn tối đa.
 *
 * @param supabase - Phiên bản Supabase client.
 * @param userId - Mã định danh người dùng.
 * @param examId - Mã bài thi.
 * @param maxAttempts - Số lần làm bài tối đa (0 = không giới hạn).
 * @returns Promise phân giải thành số lần đã làm bài (attemptCount).
 * @throws ApiError nếu đã đạt giới hạn tối đa.
 */
export async function validateAttempts(
    supabase: SupabaseClient,
    userId: string,
    examId: string,
    maxAttempts: number
): Promise<number> {
    const { count } = await supabase
        .from('submissions')
        .select('id', { count: 'exact', head: true })
        .eq('exam_id', examId)
        .eq('student_id', userId)

    const attemptCount = count ?? 0
    if (maxAttempts !== 0 && attemptCount >= maxAttempts) {
        throw new ApiError('MAX_ATTEMPTS', 'Maximum attempts reached', 403)
    }

    return attemptCount
}

/**
 * Xác thực thời gian làm bài.
 * Kiểm tra thời gian đã trôi qua kể từ khi bắt đầu phiên làm bài,
 * so với thời lượng cho phép cộng buffer 15 giây.
 *
 * @param supabase - Phiên bản Supabase client.
 * @param sessionId - ID phiên làm bài (có thể undefined/null).
 * @param durationMinutes - Thời lượng bài thi (phút).
 * @param userId - Mã định danh người dùng.
 * @param clientIP - Địa chỉ IP của client (để ghi nhật ký).
 * @param userAgent - User-Agent của client (để ghi nhật ký).
 * @param examId - Mã bài thi.
 * @returns Promise phân giải thành đối tượng chứa cờ is_ranked.
 * @throws ApiError nếu vượt quá thời gian cho phép.
 */
export async function validateTimer(
    supabase: SupabaseClient,
    sessionId: string | undefined | null,
    durationMinutes: number,
    userId: string,
    clientIP: string,
    userAgent: string,
    examId: string
): Promise<{ is_ranked: boolean }> {
    if (!sessionId) {
        return { is_ranked: true }
    }

    const { data: session } = await supabase
        .from('exam_sessions')
        .select('created_at, started_at, is_ranked')
        .eq('id', sessionId)
        .single()

    if (!session) {
        return { is_ranked: true }
    }

    const sessionStart = new Date(session.started_at || session.created_at).getTime()
    const now = Date.now()
    const elapsed = now - sessionStart
    // 15s buffer for network latency
    const maxAllowedTime = (durationMinutes * 60 * 1000) + (15 * 1000)

    if (elapsed > maxAllowedTime) {
        console.warn(`Timer exceeded for user ${userId}: elapsed=${elapsed}ms, max=${maxAllowedTime}ms`)
        await supabase.from('submission_audit_log').insert({
            exam_id: examId,
            student_id: userId,
            action: 'TIMER_EXCEEDED',
            details: { elapsed, maxAllowedTime, session_id: sessionId },
            ip_address: clientIP,
            user_agent: userAgent,
        })
        throw new ApiError('TIMER_EXCEEDED', 'Time limit exceeded. Your session has expired.', 403)
    }

    return { is_ranked: session.is_ranked }
}

/**
 * Dữ liệu đầu vào để tạo payload nộp bài.
 */
export interface BuildSubmissionPayloadInput {
    exam_id: string
    userId: string
    mc_answers: (string | null)[]
    tf_answers: TFStudentAnswer[]
    sa_answers: SAStudentAnswer[]
    time_spent: number
    session_id?: string
    cheat_flags?: CheatFlags
    fingerprint?: string
    scoring: ScoringResult
    attemptCount: number
    isRanked: boolean
}

/**
 * Xây dựng payload nộp bài từ dữ liệu đầu vào.
 * Tổng hợp điểm số, câu trả lời, cờ gian lận và thông tin phiên làm bài.
 *
 * @param input - Dữ liệu đầu vào chứa thông tin bài thi, người dùng, câu trả lời, điểm số, v.v.
 * @returns Đối tượng payload sẵn sàng để lưu vào bảng submissions.
 */
export function buildSubmissionPayload(input: BuildSubmissionPayloadInput) {
    const {
        exam_id,
        userId,
        mc_answers,
        tf_answers,
        sa_answers,
        time_spent,
        session_id,
        cheat_flags,
        fingerprint: _fingerprint,
        scoring,
        attemptCount,
        isRanked,
    } = input

    return {
        exam_id,
        student_id: userId,
        student_answers: mc_answers,
        mc_student_answers: mc_answers?.map((a, i) => ({ question: i + 1, answer: a })),
        tf_student_answers: tf_answers,
        sa_student_answers: sa_answers,
        score: scoring.score,
        correct_count: Math.round(scoring.totalCorrect),
        mc_correct: scoring.details.mc.correct,
        tf_correct: Math.round(scoring.details.tf.correct),
        sa_correct: scoring.details.sa.correct,
        submitted_at: new Date().toISOString(),
        time_spent: time_spent || 0,
        attempt_number: (attemptCount ?? 0) + 1,
        session_id,
        is_ranked: isRanked,
        cheat_flags: cheat_flags || { tab_switches: 0, multi_browser: false },
    }
}

/**
 * Lưu bài nộp vào cơ sở dữ liệu và thực hiện các cập nhật liên quan.
 * Chèn bản ghi submission, cập nhật trạng thái phiên làm bài và người tham gia,
 * ghi nhật ký kiểm tra. Nếu có lỗi ở bước cập nhật phụ, thực hiện rollback xóa submission.
 *
 * @param supabase - Phiên bản Supabase client.
 * @param submissionPayload - Payload bài nộp đã xây dựng.
 * @param sessionId - ID phiên làm bài (có thể undefined).
 * @param timeSpent - Thời gian đã dùng (giây).
 * @param examId - Mã bài thi.
 * @param userId - Mã định danh người dùng.
 * @param clientIP - Địa chỉ IP của client.
 * @param userAgent - User-Agent của client.
 * @param cheatFlags - Cờ gian lận (có thể undefined).
 * @param fingerprint - Dấu vân tay trình duyệt (có thể undefined).
 * @returns Promise phân giải thành đối tượng chứa id của submission đã tạo.
 * @throws ApiError nếu không lưu được submission hoặc lỗi giao dịch.
 */
export async function saveSubmission(
    supabase: SupabaseClient,
    submissionPayload: any,
    sessionId: string | undefined,
    timeSpent: number,
    examId: string,
    userId: string,
    clientIP: string,
    userAgent: string,
    cheatFlags: CheatFlags | undefined,
    fingerprint: string | undefined
): Promise<{ id: string }> {
    // Insert submission
    const { data: submission, error: insertError } = await supabase
        .from('submissions')
        .insert(submissionPayload)
        .select('id')
        .single()

    if (insertError) {
        console.error('Submission insert error:', insertError)
        throw new ApiError('SUBMISSION_SAVE_FAILED', 'Failed to save submission', 500)
    }

    // Transactional updates with rollback
    try {
        if (sessionId) {
            const { error: sessionUpdateError } = await supabase
                .from('exam_sessions')
                .update({
                    status: 'completed',
                    ended_at: new Date().toISOString(),
                    time_spent: timeSpent || 0,
                })
                .eq('id', sessionId)
            if (sessionUpdateError) throw sessionUpdateError
        }

        const { error: participantUpdateError } = await supabase
            .from('exam_participants')
            .update({ status: 'submitted', last_active: new Date().toISOString() })
            .eq('exam_id', examId)
            .eq('user_id', userId)
        if (participantUpdateError) throw participantUpdateError

        const { error: auditError } = await supabase.from('submission_audit_log').insert({
            submission_id: submission.id,
            exam_id: examId,
            student_id: userId,
            action: 'SUBMISSION_SUCCESS',
            details: {
                score: submissionPayload.score,
                time_spent: timeSpent,
                cheat_flags: cheatFlags,
                fingerprint: fingerprint || 'not_provided',
            },
            ip_address: clientIP,
            user_agent: userAgent,
        })
        if (auditError) throw auditError
    } catch (error) {
        console.error('Transaction failed, rolling back submission:', error)
        await supabase.from('submissions').delete().eq('id', submission.id)
        throw new ApiError('SUBMISSION_FAILED', 'Failed to complete submission', 500)
    }

    return submission // { id: string }
}

/**
 * Vô hiệu hóa bộ nhớ đệm liên quan đến bài thi.
 * Gọi sau khi nộp bài để đảm bảo dữ liệu mới được hiển thị.
 *
 * @param examId - Mã bài thi.
 * @returns Promise phân giải thành void.
 */
export async function invalidateExamCaches(examId: string): Promise<void> {
    await invalidateCache.submission(examId)
}
