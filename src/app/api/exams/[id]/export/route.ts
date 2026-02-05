import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
    params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const resolvedParams = await params
        const examId = resolvedParams.id
        const supabase = await createClient()

        // Get format from query params (csv or json)
        const searchParams = request.nextUrl.searchParams
        const format = searchParams.get('format') || 'csv'

        // Get authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Verify user is the exam owner
        const { data: exam, error: examError } = await supabase
            .from('exams')
            .select('id, title, teacher_id, duration, total_questions')
            .eq('id', examId)
            .single()

        if (examError || !exam) {
            return NextResponse.json({ error: 'Exam not found' }, { status: 404 })
        }

        if (exam.teacher_id !== user.id) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        // Fetch all submissions with student profiles
        const { data: submissions, error: subError } = await supabase
            .from('submissions')
            .select(`
                id,
                student_id,
                score,
                correct_count,
                mc_correct,
                tf_correct,
                sa_correct,
                time_spent,
                submitted_at,
                attempt_number,
                is_ranked,
                cheat_flags,
                profiles!submissions_student_id_fkey (
                    full_name,
                    class
                )
            `)
            .eq('exam_id', examId)
            .order('score', { ascending: false })

        if (subError) {
            console.error('Export fetch error:', subError)
            return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
        }

        // Transform data
        interface ProfileData {
            full_name: string | null
            class: string | null
        }

        const reportData = (submissions || []).map((sub, index) => {
            const profile = Array.isArray(sub.profiles)
                ? sub.profiles[0] as ProfileData | undefined
                : sub.profiles as ProfileData | null

            const cheatFlags = sub.cheat_flags as { tab_switches?: number } | null

            return {
                rank: index + 1,
                student_name: profile?.full_name || 'Không xác định',
                class: profile?.class || '',
                score: sub.score,
                score_10: sub.score.toFixed(2),
                correct_count: sub.correct_count,
                mc_correct: sub.mc_correct || 0,
                tf_correct: sub.tf_correct || 0,
                sa_correct: sub.sa_correct || 0,
                time_spent_seconds: sub.time_spent,
                time_spent_formatted: formatTime(sub.time_spent),
                submitted_at: new Date(sub.submitted_at).toLocaleString('vi-VN'),
                attempt_number: sub.attempt_number,
                is_ranked: sub.is_ranked ? 'Có' : 'Không',
                tab_switches: cheatFlags?.tab_switches || 0
            }
        })

        if (format === 'json') {
            return NextResponse.json({
                exam: {
                    id: exam.id,
                    title: exam.title,
                    duration: exam.duration,
                    total_questions: exam.total_questions
                },
                total_submissions: reportData.length,
                exported_at: new Date().toISOString(),
                data: reportData
            })
        }

        // Generate CSV
        const headers = [
            'STT',
            'Họ tên',
            'Lớp',
            'Điểm (10)',
            'Số câu đúng',
            'MC đúng',
            'TF đúng',
            'SA đúng',
            'Thời gian',
            'Nộp lúc',
            'Lần thi',
            'Xếp hạng',
            'Tab switches'
        ]

        const csvRows = [
            `# Báo cáo kết quả: ${exam.title}`,
            `# Xuất lúc: ${new Date().toLocaleString('vi-VN')}`,
            `# Tổng số bài nộp: ${reportData.length}`,
            '',
            headers.join(','),
            ...reportData.map(row => [
                row.rank,
                `"${row.student_name}"`,
                `"${row.class}"`,
                row.score_10,
                row.correct_count,
                row.mc_correct,
                row.tf_correct,
                row.sa_correct,
                `"${row.time_spent_formatted}"`,
                `"${row.submitted_at}"`,
                row.attempt_number,
                row.is_ranked,
                row.tab_switches
            ].join(','))
        ]

        const csv = csvRows.join('\n')

        // Add BOM for Excel UTF-8 compatibility
        const bom = '\uFEFF'
        const csvWithBom = bom + csv

        return new Response(csvWithBom, {
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="bao-cao-${examId}.csv"`
            }
        })

    } catch (error) {
        console.error('Export API error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
}
