import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth-utils'
import { withErrorHandler, successResponse, ApiError } from '@/lib/api-utils'

const V98_API_KEY = process.env.GEMINI_API_KEY || "sk-ewNhLj4fTcPUGWDstbRMibwnhjtZ5gB4q4CxMhEQ0gg5xZlx"
const V98_BASE_URL = process.env.GEMINI_BASE_URL || "https://v98store.com"

const SYSTEM_PROMPT = `Bạn là giám khảo chấm thi IELTS Writing chuyên nghiệp với hơn 15 năm kinh nghiệm.
Nhiệm vụ của bạn là chấm điểm bài viết IELTS Writing của học sinh dựa trên đề bài được cung cấp và đưa ra phản hồi mang tính xây dựng.

Hãy chấm điểm theo 4 tiêu chí chính thức của IELTS (thang điểm 0.0 - 9.0, bước điểm là 0.5):
1. Task Achievement / Task Response (TA/TR): Mức độ hoàn thành yêu cầu đề bài.
2. Coherence & Cohesion (CC): Sự mạch lạc và liên kết giữa các câu, các đoạn.
3. Lexical Resource (LR): Sự phong phú và chính xác trong sử dụng từ vựng.
4. Grammatical Range & Accuracy (GRA): Sự đa dạng và chính xác của các cấu trúc ngữ pháp.

Overall Band Score sẽ là điểm trung bình cộng của 4 tiêu chí trên, làm tròn theo quy tắc IELTS (VD: 6.25 -> 6.5, 6.125 -> 6.0, 6.75 -> 7.0).

Bạn PHẢI trả về kết quả dưới dạng JSON thuần túy (KHÔNG chứa ký tự \`\`\`json ở đầu/cuối, KHÔNG giải thích gì thêm bên ngoài). Cấu trúc JSON như sau:
{
  "task_achievement": <number>,
  "coherence_cohesion": <number>,
  "lexical_resource": <number>,
  "grammar_accuracy": <number>,
  "overall_band": <number>,
  "word_count": <number>,
  "feedback_task": "<nhận xét chi tiết về TA/TR bằng tiếng Việt, từ 2-4 câu>",
  "feedback_coherence": "<nhận xét chi tiết về CC bằng tiếng Việt, từ 2-4 câu>",
  "feedback_lexical": "<nhận xét chi tiết về LR bằng tiếng Việt, từ 2-4 câu>",
  "feedback_grammar": "<nhận xét chi tiết về GRA bằng tiếng Việt, từ 2-4 câu>",
  "feedback_overall": "<nhận xét tổng hợp cùng 3 lời khuyên cụ thể để học sinh cải thiện bài viết, viết bằng tiếng Việt>",
  "sample_answer": "<bài mẫu tham khảo đạt chuẩn Band 7.5+ cho đề bài này>"
}`

// POST /api/ielts/grade-writing
// Chấm bài viết Writing bằng AI
async function handlePOST(request: NextRequest) {
  const supabase = await createClient()
  const user = await requireAuth(supabase)

  const body = await request.json()
  const { submission_id } = body as { submission_id: string }

  if (!submission_id) {
    throw new ApiError('BAD_REQUEST', 'Thiếu ID bài làm (submission_id)', 400)
  }

  // 1. Kiểm tra tồn tại và quyền truy cập
  const { data: submission, error: subError } = await supabase
    .from('ielts_submissions')
    .select('*, ielts_tests(id, skill, title)')
    .eq('id', submission_id)
    .single()

  if (subError || !submission) {
    throw new ApiError('NOT_FOUND', 'Bài làm không tồn tại', 404)
  }

  // Chỉ cho phép học sinh sở hữu hoặc giáo viên chấm
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (submission.student_id !== user.id && profile?.role !== 'teacher' && profile?.role !== 'admin') {
    throw new ApiError('FORBIDDEN', 'Bạn không có quyền chấm bài làm này', 403)
  }

  if (submission.ielts_tests?.skill !== 'writing') {
    throw new ApiError('BAD_REQUEST', 'Bài làm này không thuộc kỹ năng Writing', 400)
  }

  if (!submission.writing_response?.trim()) {
    throw new ApiError('BAD_REQUEST', 'Bài làm trống, không thể chấm điểm', 400)
  }

  // 2. Lấy thông tin đề bài (các sections của bài test)
  const { data: sections, error: secError } = await supabase
    .from('ielts_sections')
    .select('*')
    .eq('test_id', submission.test_id)
    .order('order_index', { ascending: true })

  if (secError || !sections || sections.length === 0) {
    throw new ApiError('NOT_FOUND', 'Đề bài không chứa nội dung câu hỏi nào', 404)
  }

  // Tổng hợp đề bài và bài viết của thí sinh
  let promptsContent = ''
  sections.forEach((sec, idx) => {
    promptsContent += `\n--- NHIỆM VỤ ${idx + 1} (${sec.writing_task_type || 'Task'}): ---\n`
    promptsContent += `Đề bài: ${sec.writing_prompt}\n`
    if (sec.min_words) {
      promptsContent += `Yêu cầu từ tối thiểu: ${sec.min_words} từ.\n`
    }
  })

  const studentEssay = submission.writing_response

  const userContent = `ĐỀ BÀI IELTS WRITING:
${promptsContent}

BÀI LÀM CỦA HỌC SINH:
${studentEssay}

Hãy chấm điểm bài làm trên và trả về kết quả định dạng JSON.`

  // 3. Gọi Gemini API qua V98Store
  const response = await fetch(`${V98_BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${V98_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gemini-2.0-flash',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContent }
      ],
      temperature: 0.2,
      max_tokens: 3000
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Gemini API Error:', errorText)
    throw new ApiError('INTERNAL_ERROR', 'Không thể kết nối với dịch vụ AI chấm điểm', 500)
  }

  const responseData = await response.json()
  const content = responseData.choices?.[0]?.message?.content?.trim() || ''

  // 4. Trích xuất JSON từ nội dung phản hồi
  let jsonText = content
  if (jsonText.startsWith('```json')) jsonText = jsonText.slice(7)
  if (jsonText.startsWith('```')) jsonText = jsonText.slice(3)
  if (jsonText.endsWith('```')) jsonText = jsonText.slice(0, -3)
  jsonText = jsonText.trim()

  const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    console.error('Không tìm thấy JSON hợp lệ từ AI:', content)
    throw new ApiError('INTERNAL_ERROR', 'Dữ liệu trả về từ AI không đúng định dạng', 500)
  }

  let aiResult
  try {
    aiResult = JSON.parse(jsonMatch[0])
  } catch (err) {
    console.error('Lỗi parse JSON từ AI:', jsonMatch[0])
    throw new ApiError('INTERNAL_ERROR', 'Lỗi phân tích cú pháp điểm số từ AI', 500)
  }

  const {
    task_achievement,
    coherence_cohesion,
    lexical_resource,
    grammar_accuracy,
    overall_band,
    feedback_task,
    feedback_coherence,
    feedback_lexical,
    feedback_grammar,
    feedback_overall,
    sample_answer
  } = aiResult

  // 5. Lưu điểm chi tiết vào bảng ielts_writing_scores
  const { error: scoreSaveError } = await supabase
    .from('ielts_writing_scores')
    .upsert({
      submission_id,
      task_achievement: Number(task_achievement),
      coherence_cohesion: Number(coherence_cohesion),
      lexical_resource: Number(lexical_resource),
      grammar_accuracy: Number(grammar_accuracy),
      overall_band: Number(overall_band),
      feedback_task: feedback_task || null,
      feedback_coherence: feedback_coherence || null,
      feedback_lexical: feedback_lexical || null,
      feedback_grammar: feedback_grammar || null,
      feedback_overall: feedback_overall || null,
      sample_answer: sample_answer || null,
      ai_model: 'gemini-2.0-flash',
      graded_at: new Date().toISOString()
    }, { onConflict: 'submission_id' })

  if (scoreSaveError) throw scoreSaveError

  // 6. Cập nhật trạng thái và điểm tổng của submission
  const { error: subUpdateError } = await supabase
    .from('ielts_submissions')
    .update({
      score: Number(overall_band),
      band_score: Number(overall_band),
      status: 'graded'
    })
    .eq('id', submission_id)

  if (subUpdateError) throw subUpdateError

  return NextResponse.json(
    successResponse({
      submission_id,
      overall_band: Number(overall_band),
      scores: {
        task_achievement,
        coherence_cohesion,
        lexical_resource,
        grammar_accuracy
      },
      feedback: {
        task: feedback_task,
        coherence: feedback_coherence,
        lexical: feedback_lexical,
        grammar: feedback_grammar,
        overall: feedback_overall
      },
      sample_answer
    })
  )
}

export const POST = withErrorHandler(handlePOST)
