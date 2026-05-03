import re
import json

with open('worker/gemini_service.py', 'r', encoding='utf-8') as f:
    content = f.read()

prompt_addition = """
QUESTION_EXTRACTION_PROMPT = \"\"\"CHỈ TRẢ VỀ JSON THUẦN TÚY. KHÔNG giải thích, KHÔNG markdown, KHÔNG thêm text.

Bạn là trợ lý AI phân tích đề thi trắc nghiệm Việt Nam.
NHIỆM VỤ: Trích xuất toàn bộ câu hỏi và đáp án từ nội dung PDF, trả về JSON.

Mảng `questions` chứa các object với các trường:
- `content`: nội dung câu hỏi (Giữ nguyên công thức Toán/Lý/Hoá trong thẻ $math$ hoặc $$math$$. VD: "Giải phương trình $x^2 + 1 = 0$"). KHÔNG BAO GỒM CÁC LỰA CHỌN A,B,C,D TRONG NỘI DUNG.
- `question_type`: 'mc' (trắc nghiệm 1 đáp án), 'tf' (đúng sai 4 ý), 'sa' (trả lời ngắn).
- `options`: mảng các chuỗi (chỉ dùng cho 'mc', loại bỏ tiền tố A., B., C., D. ở đầu mỗi option). VD: ["1", "2", "3", "4"].
- `correct_answer`:
  + Với 'mc': chuỗi "A", "B", "C", hoặc "D". (NẾU ĐỀ KHÔNG CÓ ĐÁP ÁN THÌ ĐỂ "A" MẶC ĐỊNH)
  + Với 'tf': object dạng {"a":true,"b":false,"c":true,"d":false} (Nếu không biết thì cho false)
  + Với 'sa': chuỗi "đáp án" (Nếu không biết thì cho "")
- `explanation`: chuỗi giải thích (nếu có, không có thì "").

VÍ DỤ ĐẦU RA JSON:
{
  "questions": [
    {
      "content": "Giá trị của biểu thức $\\\\int_0^1 x^2 dx$ là:",
      "question_type": "mc",
      "options": ["$\\\\frac{1}{3}$", "1", "0", "$\\\\frac{1}{2}$"],
      "correct_answer": "A",
      "explanation": ""
    }
  ]
}

VĂN BẢN CẦN XỬ LÝ:
{text}\"\"\"
"""

content = content.replace('VĂN BẢN CẦN XỬ LÝ:\n{text}"""', 'VĂN BẢN CẦN XỬ LÝ:\n{text}"""\n' + prompt_addition)

methods_addition = """
    async def extract_bank_questions(self, pdf_text: str) -> dict:
        prompt = QUESTION_EXTRACTION_PROMPT.format(text=pdf_text[:15000])
        import json, re
        for model in MODELS:
            try:
                url = f"{self.base_url}/v1/chat/completions"
                headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
                payload = {"model": model, "messages": [{"role": "user", "content": prompt}], "temperature": 0.1, "max_tokens": 8192}
                client = await self._get_client()
                response = await client.post(url, headers=headers, json=payload)
                if response.status_code == 200:
                    text = response.json().get("choices", [{}])[0].get("message", {}).get("content", "")
                    if text:
                        text = text.strip()
                        if text.startswith("```json"): text = text[7:]
                        elif text.startswith("```"): text = text[3:]
                        if text.endswith("```"): text = text[:-3]
                        text = text.strip()
                        json_match = re.search(r'\\{[\\s\\S]*\\}', text)
                        if json_match: text = json_match.group(0)
                        try:
                            return json.loads(text)
                        except json.JSONDecodeError:
                            pass
            except Exception:
                pass
        return {"questions": []}

    async def extract_bank_questions_vision(self, base64_images: list) -> dict:
        try:
            url = f"{self.base_url}/v1/chat/completions"
            headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
            content_array = [{"type": "text", "text": QUESTION_EXTRACTION_PROMPT.format(text="Vui lòng đọc ảnh đính kèm.")}]
            for img in base64_images:
                content_array.append({"type": "image_url", "image_url": {"url": f"data:image/png;base64,{img}"}})
            payload = {"model": "gemini-2.5-flash", "messages": [{"role": "user", "content": content_array}], "temperature": 0.1, "max_tokens": 8192}
            client = await self._get_client()
            response = await client.post(url, headers=headers, json=payload)
            if response.status_code == 200:
                text = response.json().get("choices", [{}])[0].get("message", {}).get("content", "")
                if text:
                    text = text.strip()
                    if text.startswith("```json"): text = text[7:]
                    elif text.startswith("```"): text = text[3:]
                    if text.endswith("```"): text = text[:-3]
                    text = text.strip()
                    import re, json
                    json_match = re.search(r'\\{[\\s\\S]*\\}', text)
                    if json_match: text = json_match.group(0)
                    try:
                        return json.loads(text)
                    except json.JSONDecodeError:
                        pass
        except Exception:
            pass
        return {"questions": []}
"""

content = content.replace('gemini_client = GeminiClient()', methods_addition + '\n\ngemini_client = GeminiClient()')

with open('worker/gemini_service.py', 'w', encoding='utf-8') as f:
    f.write(content)
print("gemini_service.py patched successfully")
