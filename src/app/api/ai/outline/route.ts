import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

// V98Store API (OpenAI compatible format)
const V98_API_KEY = process.env.GEMINI_API_KEY;
const V98_BASE_URL = process.env.GEMINI_BASE_URL || "https://v98store.com";

const SYSTEM_PROMPT = `Bạn là chuyên gia phân tích giáo trình học thuật cấp THPT tại Việt Nam.

NHIỆM VỤ: Tạo đề cương ôn tập lý thuyết chất lượng cao dưới dạng danh sách các khối nội dung JSON (Notion-like blocks) cho chuyên đề/chủ đề được cung cấp.

Mỗi khối nội dung (block) trong danh sách trả về phải là một đối tượng chứa:
- "id": chuỗi ngẫu nhiên duy nhất
- "type": "header" (tiêu đề), "text" (đoạn văn), "bullet" (gạch đầu dòng), "quote" (trích dẫn công thức quan trọng), "highlight" (hộp chú ý quan trọng)
- "content": nội dung văn bản (sử dụng ký hiệu toán/lý/hóa bằng LaTeX kẹp trong $ hoặc $$. VD: $E=mc^2$)

CẤU TRÚC ĐỀ CƯƠNG BẮT BUỘC:
1. 1 block type "header" với nội dung là Tên chuyên đề ôn tập.
2. 1 block type "highlight" tóm tắt mục tiêu ôn tập cốt lõi của chuyên đề.
3. 1 block type "header" với nội dung "I. Kiến thức nền tảng & Định nghĩa".
4. Ít nhất 3 block type "bullet" giải thích các khái niệm cốt lõi.
5. 1 block type "header" với nội dung "II. Công thức và Định luật quan trọng".
6. Ít nhất 2 block type "quote" trích dẫn các công thức toán/lý/hóa chính (sử dụng LaTeX $...$).
7. 1 block type "header" với nội dung "III. Các dạng bài tập & Phương pháp giải".
8. Ít nhất 2 block type "bullet" tóm tắt các bước giải và lưu ý tránh bẫy khi làm bài.

CHỈ TRẢ VỀ JSON ARRAY CHỨA CÁC BLOCK (BẮT ĐẦU BẰNG [ VÀ KẾT THÚC BẰNG ]), KHÔNG GIẢI THÍCH, KHÔNG MARKDOWN.`;

export async function POST(request: NextRequest) {
  try {
    // Paid LLM proxy: never reachable without an authenticated account.
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 🔒 Rate limit + hard input caps regardless of feature-flag state.
    const { allowed } = await checkRateLimit(`ai-outline:${user.id}`, 5, 300);
    if (!allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    if (!V98_API_KEY) {
      return NextResponse.json({ error: "AI outline service is disabled" }, { status: 503 });
    }

    const body = await request.json();
    const title = typeof body?.title === "string" ? body.title.slice(0, 200) : "";
    const subject = typeof body?.subject === "string" ? body.subject.slice(0, 80) : "";

    if (!title) {
      return NextResponse.json(
        { error: "Vui lòng cung cấp chủ đề cần viết đề cương" },
        { status: 400 }
      );
    }

    const userPrompt = `Chủ đề cần tạo đề cương: "${title}"${subject ? ` (Môn học: ${subject})` : ""}. Hãy viết bằng tiếng Việt chi tiết và đầy đủ kiến thức.`;

    const response = await fetch(`${V98_BASE_URL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${V98_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gemini-2.0-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 4000
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("V98 API error:", errText);
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const responseText = data.choices?.[0]?.message?.content || "[]";

    // Extract JSON array
    let jsonText = responseText.trim();
    if (jsonText.startsWith("```json")) jsonText = jsonText.slice(7);
    if (jsonText.startsWith("```")) jsonText = jsonText.slice(3);
    if (jsonText.endsWith("```")) jsonText = jsonText.slice(0, -3);
    jsonText = jsonText.trim();

    const jsonMatch = jsonText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("Không thể trích xuất mảng JSON từ phản hồi AI");
    }

    const blocks = JSON.parse(jsonMatch[0]);

    return NextResponse.json({
      success: true,
      blocks
    });

  } catch (error: any) {
    console.error("AI Outline error:", error);
    return NextResponse.json(
      { error: "Không thể kết nối dịch vụ AI: " + error.message },
      { status: 500 }
    );
  }
}
