import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit, getClientIP } from '@/lib/rate-limit'
import { withErrorHandler, successResponse, ApiError } from '@/lib/api-utils'
import { requireAuth } from '@/lib/auth-utils'
import { z } from 'zod'
import { calculateScore } from '@/services/scoring'
import { generatePackageVersion, validatePackageVersion } from '@/lib/offline-utils'
import { cache } from '@/lib/cache'
import { createServiceContext } from '@/lib/service-context'
import { updateStudentStats } from '@/lib/gamification'

// ── Zod schema for offline submission batch ──
const offlineSubmissionSchema = z.object({
    submissions: z
        .array(
            z.object({
                exam_id: z.string().uuid('Mã bài thi không hợp lệ'),
                package_version: z.string().min(1, 'Thiếu phiên bản gói dữ liệu'),
                mc_answers: z.array(z.string().length(1).nullable()),
                tf_answers: z.array(
                    z.object({
                        question: z.number().int().min(1),
                        a: z.boolean().nullable(),
                        b: z.boolean().nullable(),
                        c: z.boolean().nullable(),
                        d: z.boolean().nullable(),
                    })
                ),
                sa_answers: z.array(
                    z.object({
                        question: z.number().int().min(1),
                        answer: z.string(),
                    })
                ),
                time_spent: z.number().min(0, 'Thời gian làm bài không hợp lệ'),
                started_at: z.string().min(1, 'Thiếu thời gian bắt đầu'),
                submitted_at: z.string().min(1, 'Thiếu thời gian nộp bài'),
                cheat_flags: z
                    .object({
                        tab_switches: z.number().int().min(0),
                        multi_browser: z.boolean(),
                    })
                    .optional(),
            })
        )
        .min(1, 'Danh sách bài nộp không được trống')
        .max(50, 'Tối đa 50 bài nộp mỗi lần đồng bộ'),
})

async function handlePOST(request: Request) {
    const supabase = await createClient()
    const clientIP = getClientIP(request)

    // Authenticate user
    const user = await requireAuth(supabase)

    // Rate limit
    const { allowed, remaining, reset } = await checkRateLimit(`submit:${user.id}`, 10, 60);
    if (!allowed) {
        console.warn(`Offline submit rate limit exceeded for user ${user.id}, IP: ${clientIP}`)
        return NextResponse.json({ error: 'Too many requests. Please try again later.' }, {
            status: 429,
            headers: {
                'X-RateLimit-Limit': String(10),
                'X-RateLimit-Remaining': String(remaining),
                'X-RateLimit-Reset': String(reset),
                'Retry-After': String(Math.ceil(reset - Date.now()/1000)),
            },
        });
    }

    // Parse body
    let body: z.infer<typeof offlineSubmissionSchema>
    try {
        body = offlineSubmissionSchema.parse(await request.json())
    } catch (validationError) {
        if (validationError instanceof z.ZodError) {
            throw new ApiError('VALIDATION_ERROR', 'Dữ liệu không hợp lệ', 400)
        }
        throw validationError
    }

    const results: Array<{
        submission_id: string | null
        exam_id: string
        score: number
        status: 'synced' | 'conflict' | 'error'
        message?: string
    }> = []

    // Process each submission
    for (const sub of body.submissions) {
        try {
            // Fetch current exam data to verify version
            const { data: exam, error: examError } = await supabase
                .from('exams')
                .select('id, title, total_questions, mc_answers, tf_answers, sa_answers, max_attempts')
                .eq('id', sub.exam_id)
                .single()

            if (examError || !exam) {
                results.push({
                    submission_id: null,
                    exam_id: sub.exam_id,
                    score: 0,
                    status: 'error',
                    message: 'Bài thi không tồn tại',
                })
                continue
            }

            // Verify package version
            const currentVersion = generatePackageVersion(exam as Record<string, unknown>)
            const versionMatch = validatePackageVersion(currentVersion, sub.package_version)

            if (!versionMatch) {
                // Version conflict — exam has changed since offline download
                results.push({
                    submission_id: null,
                    exam_id: sub.exam_id,
                    score: 0,
                    status: 'conflict',
                    message: 'Bài thi đã được cập nhật. Vui lòng tải lại gói dữ liệu mới.',
                })
                continue
            }

            // Check attempt count
            const { count: existingAttempts } = await supabase
                .from('submissions')
                .select('id', { count: 'exact', head: true })
                .eq('exam_id', sub.exam_id)
                .eq('student_id', user.id)

            const maxAttempts = (exam as Record<string, unknown>).max_attempts as number ?? 1
            if (maxAttempts !== 0 && (existingAttempts ?? 0) >= maxAttempts) {
                results.push({
                    submission_id: null,
                    exam_id: sub.exam_id,
                    score: 0,
                    status: 'error',
                    message: 'Đã đạt giới hạn số lần làm bài',
                })
                continue
            }

            // Calculate score
            const scoring = calculateScore(
                sub.mc_answers,
                sub.tf_answers,
                sub.sa_answers,
                exam as {
                    mc_answers?: Array<{ question: number; answer: string }>
                    correct_answers?: string[]
                    tf_answers?: Array<{ question: number; a: boolean; b: boolean; c: boolean; d: boolean }>
                    sa_answers?: Array<{ question: number; answer: number | string }>
                }
            )

            // Save submission
            const { data: submission, error: saveError } = await supabase
                .from('submissions')
                .insert({
                    exam_id: sub.exam_id,
                    student_id: user.id,
                    mc_answers: sub.mc_answers,
                    tf_answers: sub.tf_answers,
                    sa_answers: sub.sa_answers,
                    score: scoring.score,
                    total_correct: scoring.totalCorrect,
                    total_questions: scoring.totalQuestions,
                    time_spent: sub.time_spent,
                    started_at: sub.started_at,
                    submitted_at: sub.submitted_at,
                    cheat_flags: sub.cheat_flags ?? null,
                    status: 'completed',
                    client_ip: clientIP,
                    is_offline: true,
                })
                .select('id')
                .single()

            if (saveError) {
                console.error('Failed to save offline submission:', saveError)
                results.push({
                    submission_id: null,
                    exam_id: sub.exam_id,
                    score: 0,
                    status: 'error',
                    message: 'Lỗi khi lưu bài nộp',
                })
                continue
            }

            // Fire-and-forget gamification update
            try {
                const svcCtx = createServiceContext(supabase, cache)
                updateStudentStats(user.id, scoring.score, svcCtx).catch(
                    (gamificationError: unknown) => {
                        console.error('Gamification update failed:', gamificationError)
                    }
                )
            } catch {
                /* synchronous errors only — async rejections caught above */
            }

            results.push({
                submission_id: submission.id,
                exam_id: sub.exam_id,
                score: scoring.score,
                status: 'synced',
            })
        } catch (error) {
            console.error(`Error processing offline submission for exam ${sub.exam_id}:`, error)
            results.push({
                submission_id: null,
                exam_id: sub.exam_id,
                score: 0,
                status: 'error',
                message: error instanceof Error ? error.message : 'Lỗi không xác định',
            })
        }
    }

    const syncedCount = results.filter((r) => r.status === 'synced').length
    const conflictCount = results.filter((r) => r.status === 'conflict').length
    const errorCount = results.filter((r) => r.status === 'error').length

    return NextResponse.json(
        successResponse({
            results,
            summary: {
                total: results.length,
                synced: syncedCount,
                conflict: conflictCount,
                error: errorCount,
            },
        })
    )
}

/**
 * POST /api/exams/submit-offline
 * Processes a batch of offline exam submissions with version validation, scoring, and duplicate prevention.
 * Auth: Required.
 * Rate limit: Submission rate limit per user.
 */
export const POST = withErrorHandler(handlePOST)
