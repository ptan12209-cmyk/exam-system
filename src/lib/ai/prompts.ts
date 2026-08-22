import type { AiMessage } from "./engine"

/**
 * Prompt builders for the ExamHub AI Engine (Vietnamese output contracts).
 * Every prompt ends with an explicit machine-readable format instruction.
 */

const SYSTEM_TUTOR = `Bạn là chuyên gia soạn đề và phân tích học thuật THPT tại Việt Nam. Bạn luôn trả về ĐÚNG định dạng JSON được yêu cầu, KHÔNG thêm giải thích, KHÔNG markdown.`

export interface GenerateQuestionsInput {
    content: string
    mcCount: number
    tfCount: number
    saCount: number
    subject?: string
    grade?: number | null
}

export function buildGenerateQuestionsMessages(input: GenerateQuestionsInput): AiMessage[] {
    const parts: string[] = []
    if (input.mcCount > 0) {
        parts.push(`- ${input.mcCount} câu TRẮC NGHIỆM (4 lựa chọn A/B/C/D, đúng 1 đáp án) dạng JSON:
{"question_type":"mc","question_text":"...","options":["Nội dung A","Nội dung B","Nội dung C","Nội dung D"],"correct_answer":"A","explanation":"..."}`)
    }
    if (input.tfCount > 0) {
        parts.push(`- ${input.tfCount} câu ĐÚNG/SALIÊN QUAN đến phát biểu trong nội dung dạng JSON:
{"question_type":"tf","question_text":"Phát biểu cần xét đúng/sai","options":["a. ...","b. ...","c. ...","d. ..."],"correct_answer":{"a":true,"b":false,"c":true,"d":false},"explanation":"..."}`)
    }
    if (input.saCount > 0) {
        parts.push(`- ${input.saCount} câu TRẢ LỜI NGẮN (số hoặc cụm từ ngắn) dạng JSON:
{"question_type":"sa","question_text":"...","correct_answer":"42","explanation":"..."}`)
    }

    return [
        { role: "system", content: SYSTEM_TUTOR },
        {
            role: "user",
            content: `Dựa CHỈ vào nội dung lý thuyết dưới đây, soạn bộ câu hỏi ôn tập chất lượng cao${input.subject ? ` cho môn ${input.subject}` : ""}${input.grade ? ` (lớp ${input.grade})` : ""}.

YÊU CẦU:
${parts.join("\n")}

QUY TẮC:
1. Câu hỏi bám sát nội dung đã cho, không bịa kiến thức ngoài phạm vi.
2. Đáp án sai của trắc nghiệm phải hợp lý (bẫy nhận thức), không quá dễ đoán.
3. "correct_answer" của mc là MỘT CHỮ CÁI trong "A"|"B"|"C"|"D".
4. explanation ngắn gọn (1–3 câu) bằng tiếng Việt, giải thích vì sao đáp án đúng.
5. Trả về MỘT mảng JSON duy nhất gồm tất cả các câu hỏi, bắt đầu bằng "[" và kết thúc bằng "]".

NỘI DUNG LÝ THUYẾT:
"""
${input.content}
"""`,
        },
    ]
}

export function buildParseAnswerImageMessages(
    imageDataUrl: string,
    hints?: { mcCount?: number; tfCount?: number; saCount?: number }
): AiMessage[] {
    const hintParts: string[] = []
    if (hints?.mcCount) hintParts.push(`${hints.mcCount} câu trắc nghiệm`)
    if (hints?.tfCount) hintParts.push(`${hints.tfCount} câu đúng/sai`)
    if (hints?.saCount) hintParts.push(`${hints.saCount} câu trả lời ngắn`)

    return [
        {
            role: "system",
            content: `Bạn là hệ thống OCR đáp án đề thi. Nhiệm vụ: đọc bảng đáp án trong ảnh và trả về DUY NHẤT một JSON hợp lệ theo schema, không giải thích.`,
        },
        {
            role: "user",
            content: [
                {
                    type: "text",
                    text: `Đọc ảnh bảng đáp án và trả về JSON với ĐÚNG schema:
{
  "multiple_choice": [{"question": 1, "answer": "A"}],
  "true_false": [{"question": 1, "a": true, "b": false, "c": true, "d": false}],
  "short_answer": [{"question": 1, "answer": "42"}]
}
Quy tắc:
- "question" là SỐ thứ tự câu ghi trên ảnh.
- multiple_choice.answer là MỘT CHỮ CÁI A/B/C/D.
- Chỉ đưa vào các phần có mặt trên ảnh (phần không có trả về mảng rỗng).
${hintParts.length ? `- Gợi ý số lượng: ảnh chứa ${hintParts.join(", ")}.` : ""}
- Nếu chữ mờ, chọn khả năng cao nhất; tuyệt đối không bỏ sót dòng nào đọc được.`,
                },
                { type: "image_url", image_url: { url: imageDataUrl } },
            ],
        },
    ]
}

export interface ExplainInput {
    questionText: string
    options?: string[]
    correctAnswer: string
    subject?: string
}

export function buildExplainMessages(input: ExplainInput): AiMessage[] {
    const optionsBlock = input.options?.length
        ? `\nCác lựa chọn:\n${input.options.map((o, i) => `${"ABCD"[i]}. ${o}`).join("\n")}`
        : ""

    return [
        { role: "system", content: SYSTEM_TUTOR },
        {
            role: "user",
            content: `Giải thích NGẮN GỌN (2–4 câu, tiếng Việt) vì sao đáp án sau là đúng${input.subject ? `, môn ${input.subject}` : ""}. Đi thẳng vào logic/lý do cốt lõi, có thể nêu cách làm nhanh nếu phù hợp.

Câu hỏi: ${input.questionText}${optionsBlock}
Đáp án đúng: ${input.correctAnswer}`,
        },
    ]
}
