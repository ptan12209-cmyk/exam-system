import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { 
            bank_id, title, duration, 
            mc_count, tf_count, sa_count, 
            max_attempts, security_level, subject 
        } = body

        if (!bank_id || !title || !duration) {
            return NextResponse.json({ error: 'Thiếu trường bắt buộc' }, { status: 400 })
        }

        // 1. Lấy ngẫu nhiên câu hỏi từ ngân hàng
        type BankQuestion = { id: string; question_type: "mc" | "tf" | "sa"; correct_answer: unknown }
        const fetchRandomQuestions = async (type: "mc" | "tf" | "sa", limit: number): Promise<BankQuestion[]> => {
            if (limit <= 0) return []
            // Lấy id ngẫu nhiên (Supabase raw query approach without RPC: fetch all matching types, shuffle in memory)
            // Cẩn thận nếu kho có 10,000 câu. Ở quy mô này ta lấy < 1000 câu về để shuffle.
            const { data, error } = await supabase
                .from('questions')
                .select('id, question_type, correct_answer')
                .eq('bank_id', bank_id)
                .eq('question_type', type)
                .limit(500)

            if (error) throw error

            // Xáo trộn mảng và lấy đủ số lượng
            const shuffled = ((data ?? []) as BankQuestion[]).sort(() => 0.5 - Math.random())
            const selected = shuffled.slice(0, limit)

            if (selected.length < limit) {
                throw new Error(`Kho câu hỏi không đủ ${limit} câu loại ${type.toUpperCase()}`)
            }
            return selected
        }

        const mcQuestions = await fetchRandomQuestions('mc', mc_count)
        const tfQuestions = await fetchRandomQuestions('tf', tf_count)
        const saQuestions = await fetchRandomQuestions('sa', sa_count)

        const total_questions = mc_count + tf_count + sa_count

        // 2. Định dạng lại đáp án để lưu vào bảng exams (Backward Compatibility)
        const mcAnswers = mcQuestions.map((q, idx) => ({
            question: idx + 1,
            answer: String(q.correct_answer ?? "A") // Expected "A"|"B"|"C"|"D"
        }))

        const tfAnswers = tfQuestions.map((q, idx) => {
            const ans = (q.correct_answer ?? {}) as Partial<Record<"a" | "b" | "c" | "d", boolean>>
            return {
                question: idx + 1,
                a: ans.a ?? true,
                b: ans.b ?? false,
                c: ans.c ?? true,
                d: ans.d ?? false,
            }
        })

        const saAnswers = saQuestions.map((q, idx) => ({
            question: idx + 1,
            answer: q.correct_answer as string // Expected string/number
        }))

        // Gộp correct_answers (legacy array for MC)
        const correctAnswersArr = mcQuestions.map(q => String(q.correct_answer))

        // 3. Tạo đề thi
        const { data: newExam, error: examError } = await supabase
            .from('exams')
            .insert({
                teacher_id: user.id,
                created_by: user.id,
                title,
                duration,
                exam_type: 'digital',
                total_questions,
                correct_answers: correctAnswersArr,
                mc_answers: mcAnswers,
                tf_answers: tfAnswers,
                sa_answers: saAnswers,
                status: 'published',
                max_attempts: max_attempts || 1,
                security_level: security_level || 1,
                subject: subject || 'other',
                score_visibility_mode: 'always'
            })
            .select()
            .single()

        if (examError) throw examError

        // 4. Map câu hỏi vào bảng exam_questions
        const allSelectedQuestions = [...mcQuestions, ...tfQuestions, ...saQuestions]
        const examQuestionsData = allSelectedQuestions.map((q, idx) => ({
            exam_id: newExam.id,
            question_id: q.id,
            order_index: idx + 1
        }))

        if (examQuestionsData.length > 0) {
            const { error: mappingError } = await supabase
                .from('exam_questions')
                .insert(examQuestionsData)
                
            if (mappingError) {
                // Rollback if mapping fails
                await supabase.from('exams').delete().eq('id', newExam.id)
                throw mappingError
            }
        }

        return NextResponse.json({ success: true, examId: newExam.id })

    } catch (error: any) {
        console.error('Create exam from bank error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
