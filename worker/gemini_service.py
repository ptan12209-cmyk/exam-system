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
import time
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

# Models to try (must match v98store supported models)
MODELS = [
    "gemini-2.5-flash",        # Fast, reliable, cheap
    "gemini-3-flash-preview",  # Next gen
    "gemini-2.5-pro",          # Most capable fallback
]

# Retry config
MAX_RETRIES = 1
RETRY_DELAY = 2.0  # seconds
RETRYABLE_STATUS_CODES = {429, 503, 502, 500}

# ============================================================================
# ANSWER EXTRACTION PROMPT
# ============================================================================

EXTRACTION_PROMPT = """CHỈ TRẢ VỀ JSON THUẦN TÚY. KHÔNG giải thích, KHÔNG markdown, KHÔNG thêm bất kỳ text nào khác.

Bạn là AI trích xuất đáp án từ văn bản đề thi THPT Việt Nam.

NHIỆM VỤ: Tìm phần "ĐÁP ÁN" / "BẢNG ĐÁP ÁN" / "HƯỚNG DẪN CHẤM" và trích xuất thành JSON.

QUY TẮC:
- Phần 1 (Trắc nghiệm): đáp án A/B/C/D → mảng "phan_trac_nghiem"
- Phần 2 (Đúng/Sai): mỗi ý a,b,c,d → mảng "phan_dung_sai"
- Phần 3 (Trả lời ngắn): giá trị số → mảng "phan_tra_loi_ngan"
- Nếu đề chỉ có trắc nghiệm thuần → phan_dung_sai và phan_tra_loi_ngan là []
- Đáp án viết liền (1A 2B 3C) → tách riêng từng câu
- Đáp án trong bảng → đọc theo hàng/cột

VÍ DỤ 1 — Đề chỉ có trắc nghiệm:
{{"phan_trac_nghiem":[{{"cau":1,"dap_an":"D"}},{{"cau":2,"dap_an":"C"}}],"phan_dung_sai":[],"phan_tra_loi_ngan":[]}}

VÍ DỤ 2 — Đề có cả 3 phần:
{{"phan_trac_nghiem":[{{"cau":1,"dap_an":"A"}}],"phan_dung_sai":[{{"cau":13,"y_a":"Đúng","y_b":"Sai","y_c":"Đúng","y_d":"Sai"}}],"phan_tra_loi_ngan":[{{"cau":17,"dap_an":"2024"}}]}}

VĂN BẢN CẦN XỬ LÝ:
{text}"""


# ============================================================================
# GEMINI CLIENT
# ============================================================================

class GeminiClient:
    """Gemini AI client for answer extraction."""
    
    def __init__(self, api_key: str = None, base_url: str = None, timeout: float = 60.0):
        self.api_key = api_key or GEMINI_API_KEY
        self.base_url = (base_url or GEMINI_BASE_URL).rstrip('/')
        self.timeout = timeout
        self._client: Optional[httpx.AsyncClient] = None
        logger.info(f"GeminiClient initialized with base URL: {self.base_url}")
    
    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create a reusable HTTP client."""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(timeout=self.timeout)
        return self._client
    
    async def extract_answers(self, pdf_text: str) -> Dict[str, Any]:
        """
        Use AI to extract answers from PDF text.
        Tries each model with retry logic for transient errors.
        """
        prompt = EXTRACTION_PROMPT.format(text=pdf_text[:15000])
        
        for model in MODELS:
            logger.info(f"Trying model: {model}")
            result = await self._try_model_with_retry(model, prompt)
            if result:
                return result
        
        logger.error("All AI models failed, returning empty result")
        return {
            "multiple_choice": [],
            "true_false": [],
            "short_answer": [],
            "error": "AI extraction failed - all models unavailable"
        }
    
    async def _try_model_with_retry(self, model: str, prompt: str) -> Optional[Dict]:
        """Try a model with retry on transient errors (429, 503)."""
        for attempt in range(MAX_RETRIES + 1):
            result = await self._try_model(model, prompt)
            if result is not None:
                return result
            
            # Check if we should retry (only if _try_model stored a retryable status)
            if attempt < MAX_RETRIES and self._last_status in RETRYABLE_STATUS_CODES:
                logger.info(f"Retrying {model} in {RETRY_DELAY}s (attempt {attempt + 1})...")
                await asyncio.sleep(RETRY_DELAY)
            else:
                break
        
        return None
    
    _last_status: int = 0
    
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
                "temperature": 0.1,
                "max_tokens": 8192
            }
            
            client = await self._get_client()
            response = await client.post(url, headers=headers, json=payload)
            self._last_status = response.status_code
            
            if response.status_code == 200:
                data = response.json()
                text = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                
                if text:
                    result = self._parse_json_response(text)
                    if result:
                        result["model"] = model
                        logger.info(f"Success with model: {model}")
                        return result
            
            logger.warning(f"Model {model} returned status {response.status_code}")
            
        except httpx.TimeoutException:
            logger.error(f"Model {model} timed out")
            self._last_status = 0
        except Exception as e:
            logger.error(f"Model {model} failed: {e}")
            self._last_status = 0
        
        return None
    
    def _parse_json_response(self, text: str) -> Optional[Dict]:
        """Parse JSON from AI response with robust fallbacks."""
        try:
            text = text.strip()
            
            # Step 1: Strip markdown code blocks
            if text.startswith("```json"):
                text = text[7:]
            elif text.startswith("```"):
                text = text[3:]
            if text.endswith("```"):
                text = text[:-3]
            text = text.strip()
            
            # Step 2: Extract JSON object from surrounding text
            # Gemini sometimes adds explanation before/after the JSON
            json_match = re.search(r'\{[\s\S]*\}', text)
            if json_match:
                text = json_match.group(0)
            
            logger.info(f"AI response preview: {text[:300]}")
            
            # Step 3: Fix common LLM JSON errors
            # Remove trailing commas before ] or }
            text = re.sub(r',\s*([}\]])', r'\1', text)
            
            # Step 4: Try parsing
            try:
                data = json.loads(text)
            except json.JSONDecodeError:
                # Try to fix truncated JSON
                if text.count('{') > text.count('}'):
                    text += '}' * (text.count('{') - text.count('}'))
                if text.count('[') > text.count(']'):
                    text += ']' * (text.count('[') - text.count(']'))
                
                try:
                    data = json.loads(text)
                except json.JSONDecodeError:
                    # Last resort: regex extraction
                    return self._regex_fallback(text)
            
            # Step 5: Normalize to English keys
            return self._normalize_response(data)
            
        except Exception as e:
            logger.error(f"JSON parse error: {e}")
            return None
    
    def _regex_fallback(self, text: str) -> Optional[Dict]:
        """Extract answers via regex when JSON parsing fails entirely."""
        # Try Vietnamese format
        vn_match = re.search(r'"phan_trac_nghiem"\s*:\s*\[(.*?)\]', text, re.DOTALL)
        if vn_match:
            answers = re.findall(r'"dap_an"\s*:\s*"([A-D])"', vn_match.group(1))
            if answers:
                logger.info(f"Regex fallback (VN): extracted {len(answers)} MC answers")
                return {"multiple_choice": answers, "true_false": [], "short_answer": []}
        
        # Try English format
        en_match = re.search(r'"multiple_choice"\s*:\s*\[(.*?)\]', text, re.DOTALL)
        if en_match:
            answers = re.findall(r'"([A-D])"', en_match.group(1))
            if answers:
                logger.info(f"Regex fallback (EN): extracted {len(answers)} MC answers")
                return {"multiple_choice": answers, "true_false": [], "short_answer": []}
        
        logger.error(f"All parsing failed. Raw text: {text[:500]}")
        return None
    
    def _normalize_response(self, data: Dict) -> Dict:
        """Convert Vietnamese or English format to standardized output."""
        if "phan_trac_nghiem" in data:
            # Vietnamese format → convert
            mc_list = data.get("phan_trac_nghiem", [])
            multiple_choice = [
                item.get("dap_an", "").upper() 
                for item in mc_list if isinstance(item, dict)
            ]
            
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
            result = {
                "multiple_choice": data.get("multiple_choice", []),
                "true_false": data.get("true_false", []),
                "short_answer": data.get("short_answer", [])
            }
        
        # Normalize MC to uppercase
        result["multiple_choice"] = [
            ans.upper() if isinstance(ans, str) else ans 
            for ans in result["multiple_choice"]
        ]
        
        return result

# ============================================================================
# GLOBAL INSTANCE
# ============================================================================

gemini_client = GeminiClient()

# ============================================================================
# VISION PROMPT FOR IMAGE-BASED ANSWER KEYS (Vietnamese format)
# ============================================================================

VISION_PROMPT = """CHỈ TRẢ VỀ JSON THUẦN TÚY. KHÔNG giải thích, KHÔNG markdown.

Đọc bảng đáp án trong ảnh và trích xuất:
- Phần 1 (Trắc nghiệm): A/B/C/D → "phan_trac_nghiem"
- Phần 2 (Đúng/Sai): mỗi ý a,b,c,d → "phan_dung_sai"  
- Phần 3 (Trả lời ngắn): giá trị số → "phan_tra_loi_ngan"
- Nếu chỉ có trắc nghiệm thuần → phan_dung_sai và phan_tra_loi_ngan là []

VÍ DỤ:
{"phan_trac_nghiem":[{"cau":1,"dap_an":"A"}],"phan_dung_sai":[{"cau":13,"y_a":"Đúng","y_b":"Sai","y_c":"Đúng","y_d":"Sai"}],"phan_tra_loi_ngan":[{"cau":17,"dap_an":"2,5"}]}"""


# ============================================================================
# VISION EXTRACTION FUNCTION
# ============================================================================

async def extract_answers_from_image(image_base64: str, mime_type: str = "image/png") -> Dict[str, Any]:
    """Extract answers from an image of answer key using Gemini Vision."""
    try:
        url = f"{gemini_client.base_url}/v1/chat/completions"
        
        headers = {
            "Authorization": f"Bearer {gemini_client.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": "gemini-2.5-flash",
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
        
        logger.info("Sending image to Gemini Vision...")
        
        client = await gemini_client._get_client()
        response = await client.post(url, headers=headers, json=payload)
        
        if response.status_code == 200:
            data = response.json()
            text = data.get("choices", [{}])[0].get("message", {}).get("content", "")
            
            logger.info(f"Vision response preview: {text[:300]}")
            
            if text:
                result = gemini_client._parse_json_response(text)
                if result:
                    result["model"] = "gemini-2.5-flash-vision"
                    result["extraction_method"] = "vision"
                    logger.info("Vision extraction successful!")
                    return result
        else:
            logger.error(f"Vision API error: {response.status_code} - {response.text[:300]}")
                
    except Exception as e:
        logger.error(f"Vision extraction error: {e}", exc_info=True)
    
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
    """Main function to extract answers using AI (text mode)."""
    return await gemini_client.extract_answers(pdf_text)
