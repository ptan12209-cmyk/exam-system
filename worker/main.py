"""
PDF Worker API - FastAPI server for parsing exam PDFs.
Provides endpoints for:
- /parse-pdf: Extract questions and answers from PDF
- /extract-answers: Get answer key from PDF
- /health: Health check
"""

import io
import time
import logging
from fastapi import FastAPI, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pdfplumber

from pdf_parser import parse_pdf_content, extract_answer_key

logger = logging.getLogger("worker")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(levelname)s: %(message)s")

MAX_FILE_SIZE = 20 * 1024 * 1024  # 20MB

app = FastAPI(
    title="Exam PDF Worker",
    description="PDF parsing service for the exam system",
    version="1.0.0"
)

# CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all domains including your Next.js frontend
    allow_credentials=False, # Must be False if allow_origins is ["*"]
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    """Root endpoint for Render health check."""
    return {"service": "exam-pdf-worker", "version": "1.1.0", "status": "ok"}


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "ok", "service": "pdf-worker"}


@app.post("/parse-pdf")
async def parse_pdf(file: UploadFile):
    """
    Parse a PDF file and extract questions/answers.
    
    Args:
        file: Uploaded PDF file
        
    Returns:
        Parsed content with questions and answer key
    """
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")
    
    try:
        # Read file content
        content = await file.read()
        
        # Extract text using pdfplumber
        full_text = ""
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    full_text += text + "\n"
        
        if not full_text.strip():
            raise HTTPException(
                status_code=400, 
                detail="Could not extract text from PDF. The PDF might be scanned/image-based."
            )
        
        # Parse the extracted text
        result = parse_pdf_content(full_text)
        result["filename"] = file.filename
        result["page_count"] = len(pdf.pages) if 'pdf' in dir() else 0
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error parsing PDF: {str(e)}")


@app.post("/extract-answers")
async def extract_answers(file: UploadFile, use_ai: bool = True):
    """
    Extract answer key from PDF using AI + regex fallback.
    
    Args:
        file: Uploaded PDF file
        use_ai: Use AI extraction (default True, fallback to regex if fails)
        
    Returns:
        Structured answer data with MC, TF, SA sections
    """
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")
    
    start_time = time.time()
    try:
        content = await file.read()
        
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail=f"File too large ({len(content) // 1024 // 1024}MB). Max: 20MB")
        
        full_text = ""
        last_page_has_text = True
        page_count = 0
        
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            page_count = len(pdf.pages)
            for i, page in enumerate(pdf.pages):
                text = page.extract_text()
                if text:
                    full_text += text + "\n"
                # Check if last page has text (might be image)
                if i == page_count - 1:
                    last_page_has_text = bool(text and len(text.strip()) > 50)
        
        logger.info(f"PDF has {page_count} pages, last page has text: {last_page_has_text}")
        
        # If last page is an image (no text), try vision extraction
        if not last_page_has_text and page_count > 0:
            logger.info("Last page is image-based, trying Vision extraction...")
            try:
                from pdf2image import convert_from_bytes
                import base64
                from io import BytesIO
                
                # Convert ONLY last page to image
                images = convert_from_bytes(content, first_page=page_count, last_page=page_count)
                if images:
                    # Convert to base64
                    img_buffer = BytesIO()
                    images[0].save(img_buffer, format='PNG')
                    img_base64 = base64.b64encode(img_buffer.getvalue()).decode('utf-8')
                    
                    logger.info(f"Converted last page to image ({len(img_base64)} bytes)")
                    
                    # Use vision extraction
                    from gemini_service import extract_answers_from_image
                    vision_result = await extract_answers_from_image(img_base64, "image/png")
                    
                    if vision_result and not vision_result.get("error"):
                        return {
                            "answers": vision_result.get("multiple_choice", []),
                            "total": len(vision_result.get("multiple_choice", [])),
                            "filename": file.filename,
                            "extraction_method": "vision",
                            "model": vision_result.get("model", "gemini-vision"),
                            "multiple_choice": vision_result.get("multiple_choice", []),
                            "true_false": vision_result.get("true_false", []),
                            "short_answer": vision_result.get("short_answer", [])
                        }
            except Exception as e:
                logger.warning(f"Vision extraction failed: {e}, falling back to text")
        
        logger.info(f"Extracted text preview ({len(full_text)} chars): {full_text[:500]}")
        
        # Try AI extraction first
        ai_result = None
        if use_ai:
            try:
                logger.info(f"Starting AI extraction for: {file.filename}")
                from gemini_service import extract_answers_with_ai
                ai_result = await extract_answers_with_ai(full_text)
                logger.info(f"AI result keys: {list(ai_result.keys())}, MC count: {len(ai_result.get('multiple_choice', []))}")
                
                # Check if AI returned meaningful data
                has_data = (
                    len(ai_result.get("multiple_choice", [])) > 0 or
                    len(ai_result.get("true_false", [])) > 0 or
                    len(ai_result.get("short_answer", [])) > 0
                )
                
                if has_data:
                    elapsed = round(time.time() - start_time, 2)
                    logger.info(f"AI extraction successful! Model: {ai_result.get('model')}, elapsed: {elapsed}s")
                    return {
                        "answers": ai_result.get("multiple_choice", []),
                        "total": len(ai_result.get("multiple_choice", [])),
                        "filename": file.filename,
                        "extraction_method": "ai",
                        "model": ai_result.get("model", "unknown"),
                        "multiple_choice": ai_result.get("multiple_choice", []),
                        "true_false": ai_result.get("true_false", []),
                        "short_answer": ai_result.get("short_answer", []),
                        "elapsed_seconds": elapsed
                    }
                else:
                    logger.warning("AI returned empty data, falling back to regex")
            except Exception as e:
                logger.error(f"AI extraction failed: {e}", exc_info=True)
        
        # Fallback to regex extraction
        answer_data = extract_answer_key(full_text)
        answers = answer_data.get("answers", [])
        valid_answers = [a for a in answers if a is not None]
        
        return {
            "answers": answers,
            "total": len(valid_answers),
            "filename": file.filename,
            "extraction_method": "regex",
            "raw_text_preview": full_text[:500],
            "multiple_choice": answer_data.get("multiple_choice", []),
            "true_false": answer_data.get("true_false", []),
            "short_answer": answer_data.get("short_answer", [])
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error extracting answers: {str(e)}")


@app.post("/parse-text")
async def parse_text(text: str):
    """
    Parse plain text content (for testing).
    
    Args:
        text: Plain text content
        
    Returns:
        Parsed content with questions and answer key
    """
    result = parse_pdf_content(text)
    return result


@app.get("/test-ai")
async def test_ai():
    """
    Test AI connectivity with a simple prompt.
    Use this to verify the Gemini API is working.
    """
    try:
        from gemini_service import gemini_client
        
        test_text = """
        ĐÁP ÁN ĐỀ THI
        Câu 1: A
        Câu 2: B
        Câu 3: C
        Câu 4: D
        Câu 5. a-Đ, b-S, c-Đ, d-S
        """
        
        result = await gemini_client.extract_answers(test_text)
        
        return {
            "status": "ok",
            "ai_available": True,
            "model": result.get("model", "unknown"),
            "test_result": result
        }
    except Exception as e:
        import traceback
        return {
            "status": "error",
            "ai_available": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        }

@app.post("/extract-bank-questions")
async def extract_bank_questions(file: UploadFile):
    """
    Extract full questions for Question Bank from PDF.
    """
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")
    
    try:
        content = await file.read()
        
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail=f"File too large ({len(content) // 1024 // 1024}MB)")
        
        full_text = ""
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    full_text += text + "\n"
        
        if not full_text.strip():
            logger.info("No text extracted from PDF, trying Vision extraction for bank questions...")
            try:
                from pdf2image import convert_from_bytes
                import base64
                from io import BytesIO
                
                # Convert up to first 5 pages to images to prevent timeout
                images = convert_from_bytes(content, first_page=1, last_page=5)
                if images:
                    base64_images = []
                    for img in images:
                        img_buffer = BytesIO()
                        img.save(img_buffer, format='PNG')
                        base64_images.append(base64.b64encode(img_buffer.getvalue()).decode('utf-8'))
                    
                    from gemini_service import gemini_client
                    result = await gemini_client.extract_bank_questions_vision(base64_images)
                    
                    if result and result.get("questions"):
                        return result
            except Exception as e:
                logger.error(f"Vision extraction failed for bank questions: {e}")
                
            raise HTTPException(
                status_code=400, 
                detail="Could not extract text from PDF. The PDF might be scanned/image-based, and vision fallback failed."
            )
        
        from gemini_service import gemini_client
        result = await gemini_client.extract_bank_questions(full_text)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error parsing PDF for bank questions: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error parsing PDF: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
