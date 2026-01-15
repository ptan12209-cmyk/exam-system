import { NextRequest, NextResponse } from "next/server";

// V98Store API (OpenAI compatible format)
const V98_API_KEY = process.env.GEMINI_API_KEY || "sk-ewNhLj4fTcPUGWDstbRMibwnhjtZ5gB4q4CxMhEQ0gg5xZlx";
const V98_BASE_URL = process.env.GEMINI_BASE_URL || "https://v98store.com";

// Models to try (gemini-2.0-flash first as per user preference)
const MODELS = [
    "gemini-2.0-flash",            // Primary - fast + stable
    "gemini-3-flash-preview",      // Fallback - more capable
];

interface ExtractedQuestion {
    content: string;
    options: string[];
    correct_answer: string;
    explanation?: string;
    difficulty: number;
}

// System prompt optimized for scientific content
const EXTRACTION_PROMPT = `Bạn là chuyên gia phân tích đề thi Toán/Lý/Hóa Việt Nam cấp THPT.

NHIỆM VỤ: Trích xuất TẤT CẢ câu hỏi trắc nghiệm từ tài liệu.

QUY TẮC BẮT BUỘC:
1. GIỮ NGUYÊN ký hiệu toán học: √, ∫, Σ, π, θ, Ω, μ, λ, α, β, γ, Δ, ∞
2. GIỮ NGUYÊN đơn vị SI: m/s², kg, mol/L, Pa, J, W, N, A, V, Hz, °C, K
3. GIỮ NGUYÊN hằng số khoa học:
   - g = 10 m/s² (gia tốc trọng trường)
   - c = 3×10⁸ m/s (tốc độ ánh sáng)
   - N_A = 6.022×10²³ (số Avogadro)
   - R = 8.314 J/(mol·K) (hằng số khí)
   - h = 6.626×10⁻³⁴ J·s (hằng số Planck)

4. CHUYỂN công thức sang LaTeX inline:
   - E=mc² → $E=mc^2$
   - F=ma → $F=ma$
   - v=√(2gh) → $v=\\sqrt{2gh}$
   - ∫f(x)dx → $\\int f(x)dx$

5. ĐỘ KHÓ (difficulty):
   - 1: Dễ - Nhận biết, công thức cơ bản
   - 2: Trung bình - Thông hiểu, 1-2 bước tính
   - 3: Khó - Vận dụng, nhiều bước
   - 4: Rất khó - Vận dụng cao, tổng hợp kiến thức

6. ĐÁP ÁN phải là: "A", "B", "C", hoặc "D"

OUTPUT FORMAT (JSON Array):
[
  {
    "content": "Một vật có khối lượng $m = 2$ kg chuyển động...",
    "options": ["A. 10 m/s", "B. 20 m/s", "C. 30 m/s", "D. 40 m/s"],
    "correct_answer": "B",
    "explanation": "Áp dụng công thức $v = \\sqrt{2gh}$ với $g = 10$ m/s²...",
    "difficulty": 2
  }
]

CHỈ TRẢ VỀ JSON ARRAY, KHÔNG CÓ TEXT KHÁC.`;

async function extractWithV98(
    text: string,
    model: string = MODELS[0]
): Promise<ExtractedQuestion[]> {
    try {
        // Check if this is a PDF base64
        const isPdfBase64 = text.startsWith("__PDF_BASE64__");

        let messages;
        if (isPdfBase64) {
            const base64Data = text.replace("__PDF_BASE64__", "");
            // OpenAI-compatible vision format
            messages = [{
                role: "user",
                content: [
                    { type: "text", text: EXTRACTION_PROMPT },
                    {
                        type: "image_url",
                        image_url: {
                            url: `data:application/pdf;base64,${base64Data}`
                        }
                    }
                ]
            }];
        } else {
            messages = [{
                role: "user",
                content: EXTRACTION_PROMPT + `\n\nTÀI LIỆU CẦN TRÍCH XUẤT:\n${text.slice(0, 15000)}`
            }];
        }

        const response = await fetch(`${V98_BASE_URL}/v1/chat/completions`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${V98_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model,
                messages,
                temperature: 0.1,
                max_tokens: 8192
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error("V98 API error:", errText);
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        const responseText = data.choices?.[0]?.message?.content || "";

        // Extract JSON from response
        let jsonText = responseText.trim();
        if (jsonText.startsWith("```json")) jsonText = jsonText.slice(7);
        if (jsonText.startsWith("```")) jsonText = jsonText.slice(3);
        if (jsonText.endsWith("```")) jsonText = jsonText.slice(0, -3);
        jsonText = jsonText.trim();

        const jsonMatch = jsonText.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            console.error("Response without JSON:", responseText.slice(0, 500));
            throw new Error("No JSON array found in response");
        }

        let parsedJson = jsonMatch[0];

        // Try to fix common JSON issues (truncated responses)
        try {
            // First try direct parse
            const questions = JSON.parse(parsedJson) as ExtractedQuestion[];
            return questions.filter(q =>
                q.content &&
                q.options &&
                q.options.length >= 4 &&
                ["A", "B", "C", "D"].includes(q.correct_answer) &&
                q.difficulty >= 1 && q.difficulty <= 4
            );
        } catch (parseError) {
            console.log("Initial JSON parse failed, attempting to fix...");

            // Try to fix truncated JSON by closing brackets
            if (parsedJson.includes('"content"') && parsedJson.includes('"options"')) {
                // Find last complete object ending with }
                const lastCompleteObj = parsedJson.lastIndexOf('},');
                if (lastCompleteObj > 0) {
                    parsedJson = parsedJson.slice(0, lastCompleteObj + 1) + ']';
                    console.log("Attempted to fix truncated JSON");
                    try {
                        const questions = JSON.parse(parsedJson) as ExtractedQuestion[];
                        console.log(`Recovered ${questions.length} questions from truncated response`);
                        return questions.filter(q =>
                            q.content &&
                            q.options &&
                            q.options.length >= 4 &&
                            ["A", "B", "C", "D"].includes(q.correct_answer) &&
                            q.difficulty >= 1 && q.difficulty <= 4
                        );
                    } catch {
                        console.error("Fixed JSON still invalid");
                    }
                }
            }

            console.error("JSON parse error, raw response:", jsonText.slice(0, 1000));
            throw new Error("Failed to parse AI response as JSON");
        }
    } catch (error) {
        console.error(`Error with model ${model}:`, error);
        throw error;
    }
}

async function extractTextFromFile(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (file.name.endsWith(".txt")) {
        return buffer.toString("utf-8");
    }

    if (file.name.endsWith(".docx")) {
        // Use mammoth for Word files
        try {
            const mammoth = await import("mammoth");
            const result = await mammoth.extractRawText({ buffer });
            return result.value;
        } catch {
            throw new Error("Word parsing not available. Please install: npm install mammoth");
        }
    }

    if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
        // Use xlsx for Excel files
        try {
            const XLSX = await import("xlsx");
            const workbook = XLSX.read(buffer, { type: "buffer" });
            let text = "";
            workbook.SheetNames.forEach(sheetName => {
                const sheet = workbook.Sheets[sheetName];
                text += XLSX.utils.sheet_to_txt(sheet) + "\n";
            });
            return text;
        } catch {
            throw new Error("Excel parsing not available. Please install: npm install xlsx");
        }
    }

    if (file.name.endsWith(".pdf")) {
        // For PDF, we'll send directly to Gemini as base64 (Gemini can read PDFs)
        // Return special marker to indicate PDF should be sent as file
        return `__PDF_BASE64__${buffer.toString("base64")}`;
    }

    throw new Error(`Unsupported file type: ${file.name}`);
}

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        const subject = formData.get("subject") as string | null;
        const defaultDifficulty = formData.get("difficulty") as string | null;

        if (!file) {
            return NextResponse.json(
                { error: "No file provided" },
                { status: 400 }
            );
        }

        // Validate file type
        const validExtensions = [".txt", ".docx", ".xlsx", ".xls", ".pdf"];
        const hasValidExtension = validExtensions.some(ext =>
            file.name.toLowerCase().endsWith(ext)
        );

        if (!hasValidExtension) {
            return NextResponse.json(
                { error: "Invalid file type. Supported: Word, Excel, PDF, TXT" },
                { status: 400 }
            );
        }

        // Extract text from file
        console.log(`Extracting text from: ${file.name}`);
        const text = await extractTextFromFile(file);

        if (!text || text.trim().length < 50) {
            return NextResponse.json(
                { error: "Could not extract enough text from file" },
                { status: 400 }
            );
        }

        console.log(`Extracted ${text.length} characters`);

        // Split into chunks for long documents
        const CHUNK_SIZE = 10000; // 10K chars per chunk
        const chunks: string[] = [];

        if (text.startsWith("__PDF_BASE64__")) {
            // For PDF base64, send as single request (can't chunk binary)
            chunks.push(text);
        } else if (text.length > CHUNK_SIZE) {
            // Split text into chunks at sentence boundaries
            let remaining = text;
            while (remaining.length > 0) {
                if (remaining.length <= CHUNK_SIZE) {
                    chunks.push(remaining);
                    break;
                }
                // Find a good break point (sentence end, paragraph, or fallback)
                let breakPoint = remaining.lastIndexOf('\n\n', CHUNK_SIZE);
                if (breakPoint < CHUNK_SIZE / 2) {
                    breakPoint = remaining.lastIndexOf('. ', CHUNK_SIZE);
                }
                if (breakPoint < CHUNK_SIZE / 2) {
                    breakPoint = remaining.lastIndexOf('\n', CHUNK_SIZE);
                }
                if (breakPoint < CHUNK_SIZE / 2) {
                    breakPoint = CHUNK_SIZE;
                }

                chunks.push(remaining.slice(0, breakPoint + 1));
                remaining = remaining.slice(breakPoint + 1);
            }
            console.log(`Split into ${chunks.length} chunks`);
        } else {
            chunks.push(text);
        }

        // Process all chunks and merge results
        let allQuestions: ExtractedQuestion[] = [];

        for (let i = 0; i < chunks.length; i++) {
            console.log(`Processing chunk ${i + 1}/${chunks.length} (${chunks[i].length} chars)...`);

            try {
                const chunkQuestions = await extractWithV98(chunks[i], MODELS[0]);
                console.log(`Chunk ${i + 1}: extracted ${chunkQuestions.length} questions`);
                allQuestions = [...allQuestions, ...chunkQuestions];
            } catch (flashError) {
                console.log(`${MODELS[0]} failed on chunk ${i + 1}, trying ${MODELS[1]}...`);
                try {
                    const chunkQuestions = await extractWithV98(chunks[i], MODELS[1]);
                    console.log(`Chunk ${i + 1} (fallback): extracted ${chunkQuestions.length} questions`);
                    allQuestions = [...allQuestions, ...chunkQuestions];
                } catch (proError) {
                    console.error(`Both models failed on chunk ${i + 1}:`, proError);
                    // Continue with other chunks even if one fails
                }
            }

            // Small delay between chunks to avoid rate limiting
            if (i < chunks.length - 1) {
                await new Promise(r => setTimeout(r, 500));
            }
        }

        console.log(`Total extracted: ${allQuestions.length} questions`);

        // Deduplicate by content (in case of overlap)
        const seen = new Set<string>();
        const questions = allQuestions.filter(q => {
            const key = q.content.slice(0, 100); // First 100 chars as key
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        // Apply default subject/difficulty if provided
        let finalQuestions = questions;
        if (subject || defaultDifficulty) {
            finalQuestions = questions.map(q => ({
                ...q,
                subject: subject || undefined,
                difficulty: defaultDifficulty ? parseInt(defaultDifficulty) : q.difficulty
            }));
        }

        return NextResponse.json({
            success: true,
            count: finalQuestions.length,
            questions: finalQuestions
        });

    } catch (error) {
        console.error("Extraction error:", error);
        return NextResponse.json(
            { error: "Failed to extract questions: " + (error as Error).message },
            { status: 500 }
        );
    }
}
