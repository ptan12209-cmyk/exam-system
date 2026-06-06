import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth-utils'
import { withErrorHandler, successResponse, ApiError } from '@/lib/api-utils'

const V98_API_KEY = process.env.GEMINI_API_KEY || "sk-ewNhLj4fTcPUGWDstbRMibwnhjtZ5gB4q4CxMhEQ0gg5xZlx"
const V98_BASE_URL = process.env.GEMINI_BASE_URL || "https://v98store.com"

const SYSTEM_PROMPT = `Bạn là giám khảo chấm thi IELTS Writing chuyên nghiệp được chứng nhận bởi IDP và British Council với hơn 15 năm kinh nghiệm.
Nhiệm vụ của bạn là chấm điểm bài viết IELTS Writing của học sinh dựa trên đề bài được cung cấp, tuân thủ nghiêm ngặt theo Hướng dẫn chấm điểm IELTS Writing công khai (Writing Band Descriptors) cho cả Task 1 và Task 2.

QUY TẮC ĐÁNH GIÁ CHUYÊN MÔN:

1. ĐÁNH GIÁ THEO 4 TIÊU CHÍ CHÍNH THỨC (Thang điểm từ 0.0 đến 9.0, bước điểm là 0.5):

   A. Task Achievement (Task 1) / Task Response (Task 2) [TA/TR]:
      - Task 1: Bài viết có Overview rõ ràng? Có làm nổi bật các đặc điểm/xu hướng chính (Key features/trends)? Có so sánh số liệu phù hợp?
      - Task 2: Bài làm có trả lời đầy đủ tất cả các phần của câu hỏi đề bài? Quan điểm xuyên suốt (Clear position) có rõ ràng? Các ý chính có được mở rộng và minh họa bằng ví dụ/lập luận cụ thể?
      - Phạt độ dài: Nếu bài viết không đủ số từ yêu cầu (Task 1 dưới 150 từ, Task 2 dưới 250 từ), hãy hạ điểm TA/TR dựa theo mức độ thiếu hụt từ.

   B. Coherence & Cohesion [CC]:
      - Bài viết có được tổ chức mạch lạc không? Sự phát triển của các ý tưởng (Progression of ideas) có logic không?
      - Việc chia đoạn (Paragraphing) có hợp lý? (Task 2 cần tối thiểu 4 đoạn: Mở bài, 2 đoạn thân bài, Kết bài).
      - Sử dụng các từ nối/phép liên kết (Cohesive devices) tự nhiên, không bị lạm dụng hoặc lặp lại.

   C. Lexical Resource [LR]:
      - Vốn từ vựng có đa dạng và chính xác về mặt ngữ nghĩa, ngữ cảnh? Có sử dụng các cụm từ cố định (Collocations) hay từ vựng ít phổ biến (Less common vocabulary) một cách tự nhiên?
      - Kiểm tra lỗi chính tả (Spelling) và lỗi cấu tạo từ (Word formation).

   D. Grammatical Range & Accuracy [GRA]:
      - Có sự kết hợp linh hoạt giữa các câu đơn (Simple sentences) và câu phức/câu ghép (Complex/Compound sentences)?
      - Các cấu trúc nâng cao có được sử dụng chính xác (VD: câu điều kiện, mệnh đề quan hệ, thể bị động, đảo ngữ)?
      - Lỗi ngữ pháp và dấu câu (Punctuation) có ảnh hưởng đến việc hiểu nội dung bài viết không? Tỷ lệ câu không có lỗi (Error-free sentences) là bao nhiêu?

2. TÍNH TOÁN OVERALL BAND:
   - Điểm Overall = (TA + CC + LR + GRA) / 4.
   - Làm tròn theo đúng chuẩn thuật toán IELTS:
     - Phần lẻ dưới .25 -> Làm tròn xuống .0 (VD: 6.125 -> 6.0)
     - Phần lẻ từ .25 đến dưới .75 -> Làm tròn thành .5 (VD: 6.25 -> 6.5; 6.625 -> 6.5)
     - Phần lẻ từ .75 trở lên -> Làm tròn lên .0 tiếp theo (VD: 6.75 -> 7.0)

3. YÊU CẦU ĐẦU RA JSON (Trả về JSON thuần túy, KHÔNG được chứa ký tự \`\`\`json hay \`\`\`, KHÔNG giải thích gì ngoài JSON):
{
  "task_achievement": <number>,
  "coherence_cohesion": <number>,
  "lexical_resource": <number>,
  "grammar_accuracy": <number>,
  "overall_band": <number>,
  "word_count": <number>,
  "feedback_task": "<Nhận xét cụ thể về TA/TR bằng tiếng Việt. Chỉ rõ ưu điểm và các ý/số liệu bị bỏ sót hoặc chưa được phát triển tốt. Trích dẫn lỗi nếu có, viết trong 3-4 câu>",
  "feedback_coherence": "<Nhận xét cụ thể về CC bằng tiếng Việt. Nhận xét cấu trúc chia đoạn, mạch lạc giữa các ý, cách dùng từ nối có tự nhiên không. Viết trong 3-4 câu>",
  "feedback_lexical": "<Nhận xét cụ thể về từ vựng bằng tiếng Việt. Liệt kê tối thiểu 2-3 lỗi dùng từ sai/lặp từ và gợi ý từ thay thế tốt hơn. Viết trong 3-4 câu>",
  "feedback_grammar": "<Nhận xét cụ thể về ngữ pháp bằng tiếng Việt. Chỉ rõ 2 lỗi cấu trúc ngữ pháp/dấu câu xuất hiện trong bài làm và cách sửa. Viết trong 3-4 câu>",
  "feedback_overall": "<Nhận xét tổng thể ngắn gọn + Đưa ra đúng 3 lời khuyên thực tế để đạt band cao hơn ở lần viết sau, viết bằng tiếng Việt>",
  "sample_answer": "<Bài viết mẫu học thuật đạt chuẩn Band 8.0+ viết riêng cho đề bài này để học sinh đối chiếu học tập>"
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
