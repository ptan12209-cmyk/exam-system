"""
Gemini AI Service for Exam PDF Answer Extraction
=================================================
Uses Gemini AI to intelligently extract answer keys from Vietnamese exam PDFs.
Supports MC (trắc nghiệm), TF (đúng/sai), and SA (trả lời ngắn) questions.
"""

import os
import logging
import httpx
import asyncio
import json
import re
from typing import Optional, Dict, Any, List

# ============================================================================
# LOGGING
# ============================================================================

logger = logging.getLogger("gemini_service")

# ============================================================================
# CONFIGURATION
# ============================================================================

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "sk-ewNhLj4fTcPUGWDstbRMibwnhjtZ5gB4q4CxMhEQ0gg5xZlx")
GEMINI_BASE_URL = os.getenv("GEMINI_BASE_URL", "https://v98store.com")

# Models to try
MODELS = [
    "gemini-2.0-flash",        # Fallback - fast + cheap
    "gemini-3-flash-preview",  # Try first - more capable
]

# ============================================================================
# ANSWER EXTRACTION PROMPT (User's improved version)
# ============================================================================

EXTRACTION_PROMPT = """# VAI TRÒ
Bạn là một trợ lý AI chuyên xử lý và trích xuất dữ liệu từ các tài liệu giáo dục. Nhiệm vụ của bạn là định vị chính xác phần "ĐÁP ÁN" hoặc "HƯỚNG DẪN CHẤM" (thường nằm ở cuối tài liệu) và trích xuất thông tin đó ra một định dạng có cấu trúc.

# NHIỆM VỤ CỤ THỂ
1. **Quét tài liệu:** Bỏ qua nội dung các câu hỏi đề bài. Hãy tìm các từ khóa báo hiệu phần đáp án như: "ĐÁP ÁN", "BẢNG ĐÁP ÁN", "HƯỚNG DẪN CHẤM", hoặc các bảng biểu nằm ở trang cuối cùng.
2. **Nhận diện định dạng:** Đề thi có thể bao gồm một hoặc kết hợp các phần sau:
   - **Phần 1 (Trắc nghiệm 4 lựa chọn):** Thường có dạng 1.A, 2.B...
   - **Phần 2 (Đúng/Sai):** Thường có dạng Câu 1: a) Đ, b) S, c) Đ, d) S...
   - **Phần 3 (Trả lời ngắn):** Thường có dạng Câu 1: 5.6, Câu 2: -10...
3. **Trích xuất & Chuẩn hóa:** Chuyển đổi dữ liệu tìm được thành định dạng JSON.

# QUY TẮC XỬ LÝ
- Nếu đáp án nằm trong bảng kẻ ô, hãy đọc theo từng hàng/cột tương ứng.
- Nếu đáp án viết liền (VD: 1A 2B 3C), hãy tách riêng từng câu.
- Với dạng Đúng/Sai: Phải ghi rõ từng ý nhỏ (a, b, c, d) là Đúng hay Sai.
- Loại bỏ các ký tự thừa, chỉ giữ lại số thứ tự câu và giá trị đáp án.
- **QUAN TRỌNG:** Nếu đề chỉ có trắc nghiệm thuần (30-40 câu A/B/C/D), thì phan_dung_sai và phan_tra_loi_ngan phải là mảng rỗng [].

# ĐỊNH DẠNG ĐẦU RA (JSON - không markdown, không giải thích)
{{
  "phan_trac_nghiem": [
    {{"cau": 1, "dap_an": "A"}},
    {{"cau": 2, "dap_an": "C"}}
  ],
  "phan_dung_sai": [
    {{
      "cau": 13,
      "y_a": "Đúng",
      "y_b": "Sai",
      "y_c": "Đúng",
      "y_d": "Sai"
    }}
  ],
  "phan_tra_loi_ngan": [
    {{"cau": 17, "dap_an": "2024"}},
    {{"cau": 18, "dap_an": "4.5"}}
  ]
}}

# VĂN BẢN CẦN XỬ LÝ
{text}
"""


# ============================================================================
# GEMINI CLIENT
# ============================================================================

class GeminiClient:
    """Gemini AI client for answer extraction."""
    
    def __init__(self, api_key: str = None, base_url: str = None, timeout: float = 60.0):
        self.api_key = api_key or GEMINI_API_KEY
        self.base_url = (base_url or GEMINI_BASE_URL).rstrip('/')
        self.timeout = timeout
        logger.info(f"GeminiClient initialized with base URL: {self.base_url}")
    
    async def extract_answers(self, pdf_text: str) -> Dict[str, Any]:
        """
        Use AI to extract answers from PDF text.
        
        Args:
            pdf_text: Extracted text from PDF
            
        Returns:
            Dict with multiple_choice, true_false, short_answer arrays
        """
        prompt = EXTRACTION_PROMPT.format(text=pdf_text[:15000])  # Limit text length
        
        for model in MODELS:
            logger.info(f"Trying model: {model}")
            result = await self._try_model(model, prompt)
            if result:
                return result
        
        logger.error("All AI models failed, returning empty result")
        return {
            "multiple_choice": [],
            "true_false": [],
            "short_answer": [],
            "error": "AI extraction failed - all models unavailable"
        }
    
    async def _try_model(self, model: str, prompt: str) -> Optional[Dict]:
        """Try a specific model."""
        try:
            url = f"{self.base_url}/v1/chat/completions"
            
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "model": model,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.1,  # Low temp for consistent extraction
                "max_tokens": 8192
            }
            
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(url, headers=headers, json=payload)
                
                if response.status_code == 200:
                    data = response.json()
                    text = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                    
                    if text:
                        # Parse JSON from response
                        result = self._parse_json_response(text)
                        if result:
                            result["model"] = model
                            logger.info(f"Success with model: {model}")
                            return result
                
                logger.warning(f"Model {model} returned status {response.status_code}")
                
        except Exception as e:
            logger.error(f"Model {model} failed: {e}")
        
        return None
    
    def _parse_json_response(self, text: str) -> Optional[Dict]:
        """Parse JSON from AI response, handling potential markdown formatting."""
        try:
            # Remove markdown code blocks if present
            text = text.strip()
            if text.startswith("```json"):
                text = text[7:]
            elif text.startswith("```"):
                text = text[3:]
            if text.endswith("```"):
                text = text[:-3]
            text = text.strip()
            
            # Debug: print first part of response
            print(f"🔍 AI Raw Response (first 500 chars): {text[:500]}")
            
            # Try direct parsing first
            try:
                data = json.loads(text)
            except json.JSONDecodeError:
                # Try to fix common issues
                # 1. Truncated JSON - try to close brackets
                if text.count('{') > text.count('}'):
                    text += '}' * (text.count('{') - text.count('}'))
                if text.count('[') > text.count(']'):
                    text += ']' * (text.count('[') - text.count(']'))
                
                # 2. Try parsing again
                try:
                    data = json.loads(text)
                except json.JSONDecodeError:
                    # 3. Try to extract just the MC answers using regex
                    mc_match = re.search(r'"multiple_choice"\s*:\s*\[(.*?)\]', text, re.DOTALL)
                    if mc_match:
                        mc_str = mc_match.group(1)
                        # Extract individual answers
                        answers = re.findall(r'"([A-D])"', mc_str)
                        if answers:
                            print(f"⚡ Fallback: Extracted {len(answers)} MC answers via regex")
                            return {
                                "multiple_choice": answers,
                                "true_false": [],
                                "short_answer": []
                            }
                    
                    # Try Vietnamese regex fallback
                    vn_match = re.search(r'"phan_trac_nghiem"\s*:\s*\[(.*?)\]', text, re.DOTALL)
                    if vn_match:
                        # Extract from Vietnamese format
                        answers = re.findall(r'"dap_an"\s*:\s*"([A-D])"', vn_match.group(1))
                        if answers:
                            print(f"⚡ Fallback VN: Extracted {len(answers)} MC answers via regex")
                            return {
                                "multiple_choice": answers,
                                "true_false": [],
                                "short_answer": []
                            }
                    
                    print(f"❌ Cannot parse JSON, raw text: {text[:1000]}")
                    return None
            
            # Handle Vietnamese format and convert to English
            if "phan_trac_nghiem" in data:
                # Convert from Vietnamese format
                mc_list = data.get("phan_trac_nghiem", [])
                multiple_choice = [item.get("dap_an", "").upper() for item in mc_list if isinstance(item, dict)]
                
                tf_list = data.get("phan_dung_sai", [])
                true_false = []
                for item in tf_list:
                    if isinstance(item, dict):
                        true_false.append({
                            "question": item.get("cau", 0),
                            "answers": {
                                "a": item.get("y_a", "").lower() == "đúng",
                                "b": item.get("y_b", "").lower() == "đúng",
                                "c": item.get("y_c", "").lower() == "đúng",
                                "d": item.get("y_d", "").lower() == "đúng"
                            }
                        })
                
                sa_list = data.get("phan_tra_loi_ngan", [])
                short_answer = []
                for item in sa_list:
                    if isinstance(item, dict):
                        short_answer.append({
                            "question": item.get("cau", 0),
                            "answer": str(item.get("dap_an", ""))
                        })
                
                result = {
                    "multiple_choice": multiple_choice,
                    "true_false": true_false,
                    "short_answer": short_answer
                }
            else:
                # Already in English format
                result = {
                    "multiple_choice": data.get("multiple_choice", []),
                    "true_false": data.get("true_false", []),
                    "short_answer": data.get("short_answer", [])
                }
            
            # Normalize MC answers to uppercase
            result["multiple_choice"] = [
                ans.upper() if isinstance(ans, str) else ans 
                for ans in result["multiple_choice"]
            ]
            
            return result
            
        except Exception as e:
            logger.error(f"JSON parse error: {e}")
            print(f"❌ JSON parse exception: {e}")
            return None

# ============================================================================
# GLOBAL INSTANCE
# ============================================================================

gemini_client = GeminiClient()

# ============================================================================
# VISION PROMPT FOR IMAGE-BASED ANSWER KEYS (Vietnamese format)
# ============================================================================

VISION_PROMPT = """# VAI TRÒ
Bạn là AI trích xuất đáp án từ ảnh bảng đáp án đề thi THPT Việt Nam.

# NHIỆM VỤ
Đọc bảng đáp án trong ảnh và trích xuất:
- **Phần 1 (Trắc nghiệm):** Đáp án A/B/C/D
- **Phần 2 (Đúng/Sai):** Mỗi ý a,b,c,d là Đúng hay Sai
- **Phần 3 (Trả lời ngắn):** Giá trị số (giữ nguyên dấu phẩy)

# LƯU Ý
- Nếu chỉ có trắc nghiệm thuần → phan_dung_sai và phan_tra_loi_ngan là []
- Đọc theo thứ tự hàng/cột trong bảng

# OUTPUT JSON (không markdown)
{
  "phan_trac_nghiem": [
    {"cau": 1, "dap_an": "A"},
    {"cau": 2, "dap_an": "C"}
  ],
  "phan_dung_sai": [
    {"cau": 13, "y_a": "Đúng", "y_b": "Sai", "y_c": "Đúng", "y_d": "Sai"}
  ],
  "phan_tra_loi_ngan": [
    {"cau": 17, "dap_an": "2,5"}
  ]
}

CHỈ TRẢ VỀ JSON."""


# ============================================================================
# VISION EXTRACTION FUNCTION
# ============================================================================

async def extract_answers_from_image(image_base64: str, mime_type: str = "image/png") -> Dict[str, Any]:
    """
    Extract answers from an image of answer key using Gemini Vision.
    
    Args:
        image_base64: Base64 encoded image data
        mime_type: MIME type of the image (image/png, image/jpeg)
        
    Returns:
        Dict with answer data
    """
    try:
        url = f"{gemini_client.base_url}/v1/chat/completions"
        
        headers = {
            "Authorization": f"Bearer {gemini_client.api_key}",
            "Content-Type": "application/json"
        }
        
        # Message with image for vision model
        payload = {
            "model": "gemini-2.0-flash",  # Vision capable
            "messages": [{
                "role": "user",
                "content": [
                    {"type": "text", "text": VISION_PROMPT},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{mime_type};base64,{image_base64}"
                        }
                    }
                ]
            }],
            "temperature": 0.1,
            "max_tokens": 4096
        }
        
        print(f"🖼️ Sending image to Gemini Vision...")
        
        async with httpx.AsyncClient(timeout=90.0) as client:
            response = await client.post(url, headers=headers, json=payload)
            
            if response.status_code == 200:
                data = response.json()
                text = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                
                print(f"🖼️ Vision response: {text[:500]}")
                
                if text:
                    result = gemini_client._parse_json_response(text)
                    if result:
                        result["model"] = "gemini-2.0-flash-vision"
                        result["extraction_method"] = "vision"
                        print(f"✅ Vision extraction successful!")
                        return result
            else:
                print(f"❌ Vision API error: {response.status_code}")
                print(f"Response: {response.text[:500]}")
                
    except Exception as e:
        print(f"❌ Vision extraction error: {e}")
        import traceback
        print(traceback.format_exc())
    
    return {
        "multiple_choice": [],
        "true_false": [],
        "short_answer": [],
        "error": "Vision extraction failed"
    }

# ============================================================================
# CONVENIENCE FUNCTION
# ============================================================================

async def extract_answers_with_ai(pdf_text: str) -> Dict[str, Any]:
    """
    Main function to extract answers using AI (text mode).
    
    Args:
        pdf_text: Text extracted from PDF
        
    Returns:
        Dict with answer data
    """
    return await gemini_client.extract_answers(pdf_text)
