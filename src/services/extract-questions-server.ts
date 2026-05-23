import { fileTypeFromBuffer } from 'file-type';

// V98Store API (OpenAI compatible format)
const V98_API_KEY = process.env.GEMINI_API_KEY || '';
const V98_BASE_URL = process.env.GEMINI_BASE_URL || '';

const MODELS = ['gemini-2.0-flash', 'gemini-3-flash-preview'];

export interface ExtractedQuestion {
  content: string;
  options: string[];
  correct_answer: string;
  explanation?: string;
  difficulty: number;
}

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
    const isPdfBase64 = text.startsWith('__PDF_BASE64__');

    let messages;
    if (isPdfBase64) {
      const base64Data = text.replace('__PDF_BASE64__', '');
      messages = [
        {
          role: 'user',
          content: [
            { type: 'text', text: EXTRACTION_PROMPT },
            {
              type: 'image_url',
              image_url: {
                url: `data:application/pdf;base64,${base64Data}`,
              },
            },
          ],
        },
      ];
    } else {
      messages = [
        {
          role: 'user',
          content: EXTRACTION_PROMPT + `\n\nTÀI LIỆU CẦN TRÍCH XUẤT:\n${text.slice(0, 15000)}`,
        },
      ];
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    const response = await fetch(`${V98_BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${V98_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.1,
        max_tokens: 8192,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      console.error('V98 API error:', errText);
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const responseText = data.choices?.[0]?.message?.content || '';

    let jsonText = responseText.trim();
    if (jsonText.startsWith('```json')) jsonText = jsonText.slice(7);
    if (jsonText.startsWith('```')) jsonText = jsonText.slice(3);
    if (jsonText.endsWith('```')) jsonText = jsonText.slice(0, -3);
    jsonText = jsonText.trim();

    const jsonMatch = jsonText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('Response without JSON:', responseText.slice(0, 500));
      throw new Error('No JSON array found in response');
    }

    let parsedJson = jsonMatch[0];

    try {
      const questions = JSON.parse(parsedJson) as ExtractedQuestion[];
      return questions.filter(
        (q) =>
          q.content &&
          q.options &&
          q.options.length >= 4 &&
          ['A', 'B', 'C', 'D'].includes(q.correct_answer) &&
          q.difficulty >= 1 &&
          q.difficulty <= 4
      );
    } catch (parseError) {
      console.debug('Initial JSON parse failed, attempting to fix...');

      if (parsedJson.includes('"content"') && parsedJson.includes('"options"')) {
        const lastCompleteObj = parsedJson.lastIndexOf('},');
        if (lastCompleteObj > 0) {
          parsedJson = parsedJson.slice(0, lastCompleteObj + 1) + ']';
          console.debug('Attempted to fix truncated JSON');
          try {
            const questions = JSON.parse(parsedJson) as ExtractedQuestion[];
            console.debug(`Recovered ${questions.length} questions from truncated response`);
            return questions.filter(
              (q) =>
                q.content &&
                q.options &&
                q.options.length >= 4 &&
                ['A', 'B', 'C', 'D'].includes(q.correct_answer) &&
                q.difficulty >= 1 &&
                q.difficulty <= 4
            );
          } catch {
            console.error('Fixed JSON still invalid');
          }
        }
      }

      console.error('JSON parse error, raw response:', jsonText.slice(0, 1000));
      throw new Error('Failed to parse AI response as JSON');
    }
  } catch (error) {
    console.error(`Error with model ${model}:`, error);
    throw error;
  }
}

export class ExtractQuestionsServerService {
  /**
   * Extract questions from a document file buffer.
   * Handles text extraction from PDF/DOCX/TXT/XLSX, chunking, AI extraction, merging, and dedup.
   */
  async extractFromFile(
    fileBuffer: Buffer,
    fileName: string,
    options?: { subject?: string; defaultDifficulty?: number }
  ): Promise<ExtractedQuestion[]> {
    // Extract text from file
    console.debug(`Extracting text from: ${fileName}`);
    const text = await this.extractTextFromFile(fileBuffer, fileName);

    if (!text || text.trim().length < 50) {
      throw new Error('Could not extract enough text from file');
    }

    console.debug(`Extracted ${text.length} characters`);

    // Split into chunks
    const CHUNK_SIZE = 10000;
    const chunks: string[] = [];

    if (text.startsWith('__PDF_BASE64__')) {
      chunks.push(text);
    } else if (text.length > CHUNK_SIZE) {
      let remaining = text;
      while (remaining.length > 0) {
        if (remaining.length <= CHUNK_SIZE) {
          chunks.push(remaining);
          break;
        }
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
      console.debug(`Split into ${chunks.length} chunks`);
    } else {
      chunks.push(text);
    }

    // Process all chunks
    let allQuestions: ExtractedQuestion[] = [];

    for (let i = 0; i < chunks.length; i++) {
      console.debug(`Processing chunk ${i + 1}/${chunks.length} (${chunks[i].length} chars)...`);

      try {
        const chunkQuestions = await extractWithV98(chunks[i], MODELS[0]);
        console.debug(`Chunk ${i + 1}: extracted ${chunkQuestions.length} questions`);
        allQuestions = [...allQuestions, ...chunkQuestions];
      } catch (flashError) {
        console.warn(`${MODELS[0]} failed on chunk ${i + 1}, trying ${MODELS[1]}...`);
        try {
          const chunkQuestions = await extractWithV98(chunks[i], MODELS[1]);
          console.debug(`Chunk ${i + 1} (fallback): extracted ${chunkQuestions.length} questions`);
          allQuestions = [...allQuestions, ...chunkQuestions];
        } catch (proError) {
          console.error(`Both models failed on chunk ${i + 1}:`, proError);
        }
      }

      if (i < chunks.length - 1) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    console.debug(`Total extracted: ${allQuestions.length} questions`);

    // Deduplicate
    const seen = new Set<string>();
    let questions = allQuestions.filter((q) => {
      const key = q.content.slice(0, 100);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Apply default subject/difficulty
    if (options?.subject || options?.defaultDifficulty) {
      questions = questions.map((q) => ({
        ...q,
        subject: options.subject || undefined,
        difficulty: options.defaultDifficulty ?? q.difficulty,
      }));
    }

    return questions;
  }

  private async extractTextFromFile(buffer: Buffer, fileName: string): Promise<string> {
    if (fileName.endsWith('.txt')) {
      return buffer.toString('utf-8');
    }

    if (fileName.endsWith('.docx')) {
      try {
        const mammoth = await import('mammoth');
        const result = await mammoth.extractRawText({ buffer });
        return result.value;
      } catch {
        throw new Error('Word parsing not available. Please install: npm install mammoth');
      }
    }

    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      try {
        const XLSX = await import('xlsx');
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        let text = '';
        workbook.SheetNames.forEach((sheetName) => {
          const sheet = workbook.Sheets[sheetName];
          text += XLSX.utils.sheet_to_txt(sheet) + '\n';
        });
        return text;
      } catch {
        throw new Error('Excel parsing not available. Please install: npm install xlsx');
      }
    }

    if (fileName.endsWith('.pdf')) {
      return `__PDF_BASE64__${buffer.toString('base64')}`;
    }

    throw new Error(`Unsupported file type: ${fileName}`);
  }
}
