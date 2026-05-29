"""
ExamHub DeepFace Microservice v3.0
===================================
Face recognition API following DeepFace official standards.
Uses DeepFace.verify() for identity comparison (not manual cosine distance).

Changes from v2.0:
- DeepFace.verify() replaces manual cosine distance calculation
- enforce_detection=True + try/except for clean is_present detection
- Facenet512 model (512-d, threshold 0.30) replaces Facenet (128-d, 0.40)
- align=True for proper face alignment pipeline
- Removed dead emotion fields
- Added /health endpoint
"""

import os
import sys
import base64
import time
import numpy as np
import cv2
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import uvicorn

# Fix Windows console encoding for Vietnamese
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# =============================================
# Configuration — single source of truth
# =============================================
MODEL_NAME = "Facenet512"       # 512-d embeddings, threshold 0.30
DETECTOR_BACKEND = "opencv"     # Fast, sufficient for webcam
DISTANCE_METRIC = "cosine"      # Default for Facenet512
EXPECTED_EMBEDDING_DIM = 512    # Facenet512 output dimension

# =============================================
# Pre-loaded DeepFace module (singleton)
# =============================================
_df_module = None

def get_deepface():
    global _df_module
    if _df_module is None:
        try:
            from deepface import DeepFace
            _df_module = DeepFace
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"DeepFace not available: {str(e)}"
            )
    return _df_module

# =============================================
# FastAPI App
# =============================================
app = FastAPI(
    title="ExamHub DeepFace Microservice",
    description="Face recognition API following DeepFace official standards.",
    version="3.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =============================================
# Pydantic Request Models
# =============================================
class FaceRegisterRequest(BaseModel):
    image_base64: str

class FaceAnalyzeRequest(BaseModel):
    image_base64: str
    target_embedding: List[float]

# =============================================
# Helper: Decode base64 → numpy array (zero disk I/O)
# =============================================
def decode_base64_to_numpy(base64_str: str) -> np.ndarray:
    """Convert base64 image string to OpenCV BGR numpy array in-memory."""
    if "," in base64_str:
        base64_str = base64_str.split(",")[1]
    img_bytes = base64.b64decode(base64_str)
    nparr = np.frombuffer(img_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="Cannot decode image from base64")
    return img

# =============================================
# Startup: Pre-load model into memory
# =============================================
@app.on_event("startup")
async def preload_model():
    """Pre-load Facenet512 model on server start for instant first response."""
    try:
        df = get_deepface()
        dummy = np.zeros((160, 160, 3), dtype=np.uint8)
        df.represent(
            img_path=dummy,
            model_name=MODEL_NAME,
            enforce_detection=False,
            detector_backend="skip",
        )
        print(f"[OK] {MODEL_NAME} model pre-loaded into memory!")
    except Exception as e:
        print(f"[WARN] Model pre-load failed (will lazy-load on first request): {e}")

# =============================================
# GET / — Server status
# =============================================
@app.get("/")
def read_root():
    return {
        "status": "online",
        "version": "3.0.0",
        "model": MODEL_NAME,
        "detector": DETECTOR_BACKEND,
        "distance_metric": DISTANCE_METRIC,
        "embedding_dim": EXPECTED_EMBEDDING_DIM,
    }

# =============================================
# GET /health — Health check for monitoring
# =============================================
@app.get("/health")
def health_check():
    """Verify model is loaded and responsive."""
    try:
        df = get_deepface()
        dummy = np.zeros((160, 160, 3), dtype=np.uint8)
        t0 = time.perf_counter()
        df.represent(
            img_path=dummy,
            model_name=MODEL_NAME,
            enforce_detection=False,
            detector_backend="skip",
        )
        latency_ms = (time.perf_counter() - t0) * 1000
        return {
            "status": "healthy",
            "model": MODEL_NAME,
            "embedding_dim": EXPECTED_EMBEDDING_DIM,
            "inference_ms": round(latency_ms, 1),
        }
    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={"status": "unhealthy", "error": str(e)}
        )

# =============================================
# POST /register-face — Extract face embedding
# =============================================
@app.post("/register-face")
def register_face(payload: FaceRegisterRequest):
    """
    Extract face embedding from webcam snapshot.
    Uses enforce_detection=True to GUARANTEE a real face is found.
    
    Returns:
        embedding: List[float] — 512-d vector for Facenet512
        face_confidence: float — detector confidence score
        embedding_dim: int — dimension of the embedding
    """
    df = get_deepface()
    img = decode_base64_to_numpy(payload.image_base64)
    t0 = time.perf_counter()

    try:
        # enforce_detection=True: MUST find a real face for registration
        # align=True: apply face alignment for better embedding quality
        embeddings = df.represent(
            img_path=img,
            model_name=MODEL_NAME,
            enforce_detection=True,
            detector_backend=DETECTOR_BACKEND,
            align=True,
        )

        if not embeddings:
            raise HTTPException(status_code=400, detail="No face detected in image.")

        embedding = embeddings[0]["embedding"]
        face_conf = embeddings[0].get("face_confidence", 0)
        elapsed_ms = (time.perf_counter() - t0) * 1000

        print(
            f"[REGISTER] confidence={face_conf:.3f}, "
            f"dim={len(embedding)}, time={elapsed_ms:.0f}ms"
        )

        return {
            "success": True,
            "message": "Face registered successfully!",
            "embedding": [float(x) for x in embedding],
            "face_confidence": float(face_conf),
            "embedding_dim": len(embedding),
            "latency_ms": round(elapsed_ms, 1),
        }

    except ValueError as e:
        # DeepFace raises ValueError when enforce_detection=True and no face found
        raise HTTPException(
            status_code=400,
            detail=f"No clear face detected. Please look directly at the camera. ({str(e)})"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Face analysis error: {str(e)}")

# =============================================
# POST /analyze-face — Verify identity (Surveillance)
# =============================================
@app.post("/analyze-face")
def analyze_face(payload: FaceAnalyzeRequest):
    """
    Compare live snapshot against registered face embedding.
    
    Uses DeepFace.verify() — the OFFICIAL API for face comparison.
    - img1_path: numpy array (live webcam snapshot)  
    - img2_path: List[float] (pre-calculated embedding from registration)
    
    DeepFace.verify() handles:
    - Face detection + alignment on img1
    - Distance calculation (cosine)
    - Threshold comparison (auto-tuned per model)
    
    When no face is detected (enforce_detection=True), catches ValueError
    and returns is_present=False — cleaner than manual face_confidence checks.
    """
    df = get_deepface()
    img = decode_base64_to_numpy(payload.image_base64)
    t0 = time.perf_counter()

    try:
        # === DeepFace.verify() — Official API ===
        # Replaces manual: represent() → cosine_distance() → threshold check
        result = df.verify(
            img1_path=img,                        # numpy BGR array (live snapshot)
            img2_path=payload.target_embedding,   # List[float] (stored embedding)
            model_name=MODEL_NAME,
            detector_backend=DETECTOR_BACKEND,
            distance_metric=DISTANCE_METRIC,
            enforce_detection=True,               # Raise ValueError if no face
            align=True,                           # Face alignment pipeline
        )

        elapsed_ms = (time.perf_counter() - t0) * 1000

        return {
            "success": True,
            "is_present": True,
            "is_verified": bool(result["verified"]),
            "cosine_distance": float(result["distance"]),
            "threshold_used": float(result["threshold"]),
            "latency_ms": round(elapsed_ms, 1),
        }

    except ValueError:
        # No face detected → student is not present at the desk
        elapsed_ms = (time.perf_counter() - t0) * 1000
        return {
            "success": True,
            "is_present": False,
            "is_verified": False,
            "cosine_distance": 1.0,
            "threshold_used": 0.0,
            "latency_ms": round(elapsed_ms, 1),
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis error: {str(e)}")

# =============================================
# Entry point
# =============================================
if __name__ == "__main__":
    print("=" * 50)
    print(f"  DeepFace Server v3.0")
    print(f"  Model:    {MODEL_NAME} ({EXPECTED_EMBEDDING_DIM}-d)")
    print(f"  Detector: {DETECTOR_BACKEND}")
    print(f"  Metric:   {DISTANCE_METRIC}")
    print(f"  API:      DeepFace.verify() (official)")
    print("=" * 50)
    uvicorn.run(app, host="127.0.0.1", port=8000)
