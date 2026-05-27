import os
import base64
import json
import numpy as np
from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# Khởi tạo trễ cho deepface để server khởi động siêu tốc
# và chỉ load TensorFlow khi có yêu cầu đầu tiên hoặc khởi chạy thực tế
def get_deepface():
    try:
        from deepface import DeepFace
        return DeepFace
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500, 
            detail=f"Lỗi khởi chạy DeepFace: {str(e)}. Nếu là lỗi thiếu DLL (msvcp140_1.dll), vui lòng cài đặt 'Microsoft Visual C++ Redistributable' từ link: https://aka.ms/vs/17/release/vc_redist.x64.exe"
        )

app = FastAPI(
    title="ExamHub DeepFace Microservice",
    description="API Server phân tích nhận diện khuôn mặt và cảm xúc phục vụ đài giám sát học tập từ xa.",
    version="1.0.0"
)

# Cấu hình CORS để Next.js gọi trực tiếp từ client nếu cần
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class FaceRegisterRequest(BaseModel):
    image_base64: str  # Ảnh chụp chính diện dạng base64 string

class FaceAnalyzeRequest(BaseModel):
    image_base64: str  # Ảnh snapshot hiện tại dạng base64 string
    target_embedding: list  # Vector embedding mặt gốc đã lưu trong DB (Facenet 128-d hoặc 512-d)

# Helper để chuyển base64 thành file ảnh tạm
def save_temp_image(base64_str: str, filename: str = "temp.jpg") -> str:
    try:
        if "," in base64_str:
            base64_str = base64_str.split(",")[1]
        img_data = base64.b64decode(base64_str)
        temp_dir = os.path.join(os.getcwd(), "temp")
        os.makedirs(temp_dir, exist_ok=True)
        filepath = os.path.join(temp_dir, filename)
        with open(filepath, "wb") as f:
            f.write(img_data)
        return filepath
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Không thể giải mã ảnh base64: {str(e)}")

# Helper tính Cosine Distance giữa 2 vector
def calculate_cosine_distance(v1, v2):
    v1 = np.array(v1)
    v2 = np.array(v2)
    numerator = np.dot(v1, v2)
    denominator = np.linalg.norm(v1) * np.linalg.norm(v2)
    if not denominator:
        return 1.0
    return 1.0 - (numerator / denominator)

@app.get("/")
def read_root():
    return {"status": "online", "message": "DeepFace API Server đang sẵn sàng!"}

@app.post("/register-face")
def register_face(payload: FaceRegisterRequest):
    """
    Trích xuất vector khuôn mặt (embedding) từ ảnh đăng ký đầu tiên.
    Sử dụng model 'Facenet' mặc định (128 chiều) vì tốc độ nhanh và độ chính xác cao.
    """
    df = get_deepface()
    temp_file = save_temp_image(payload.image_base64, "register_face.jpg")
    
    try:
        # Trích xuất embeddings
        # model_name='Facenet' trích xuất ra vector 128 chiều
        embeddings = df.represent(
            img_path=temp_file,
            model_name="Facenet",
            enforce_detection=True,
            detector_backend="opencv"
        )
        
        if not embeddings or len(embeddings) == 0:
            raise HTTPException(status_code=400, detail="Không phát hiện thấy khuôn mặt trong ảnh chân dung đăng ký.")
            
        embedding = embeddings[0]["embedding"]
        
        # Dọn dẹp file tạm
        if os.path.exists(temp_file):
            os.remove(temp_file)
            
        return {
            "success": True,
            "message": "Trích xuất khuôn mặt thành công!",
            "embedding": embedding
        }
    except Exception as e:
        if os.path.exists(temp_file):
            os.remove(temp_file)
        raise HTTPException(status_code=500, detail=f"Lỗi phân tích khuôn mặt: {str(e)}")

@app.post("/analyze-face")
def analyze_face(payload: FaceAnalyzeRequest):
    """
    Nhận snapshot hiện tại, đối sánh danh tính qua Cosine Distance
    và phân tích cảm xúc (tập trung, buồn ngủ, mệt mỏi) của em trai.
    """
    df = get_deepface()
    temp_file = save_temp_image(payload.image_base64, "analyze_snapshot.jpg")
    
    try:
        # 1. Trích xuất embedding của ảnh snapshot mới
        embeddings = df.represent(
            img_path=temp_file,
            model_name="Facenet",
            enforce_detection=False, # Không ép buộc để tránh báo lỗi crash server khi em rời vị trí
            detector_backend="opencv"
        )
        
        is_present = False
        is_verified = False
        cosine_dist = 1.0
        dominant_emotion = "unknown"
        emotion_predictions = {}
        
        # Nếu phát hiện thấy khuôn mặt trong snapshot
        if embeddings and len(embeddings) > 0 and embeddings[0].get("face_relation", {}).get("left", 0) > 0 or len(embeddings) > 0:
            # Kiểm tra xem có thực sự phát hiện được face không (nếu enforce_detection=False, deepface vẫn trả về embedding toàn ảnh nếu ko nhận diện được mặt)
            # Ta kiểm chứng qua việc phân tích thuộc tính cảm xúc tiếp theo
            is_present = True
            current_embedding = embeddings[0]["embedding"]
            
            # Tính khoảng cách Cosine với mặt gốc
            # Ngưỡng (Threshold) Facenet Cosine là 0.40. Nhỏ hơn 0.4 là trùng khớp danh tính.
            cosine_dist = calculate_cosine_distance(current_embedding, payload.target_embedding)
            is_verified = cosine_dist < 0.40
            
            # 2. Phân tích cảm xúc
            try:
                analysis = df.analyze(
                    img_path=temp_file,
                    actions=["emotion"],
                    enforce_detection=False,
                    detector_backend="opencv"
                )
                if analysis and len(analysis) > 0:
                    dominant_emotion = analysis[0]["dominant_emotion"]
                    emotion_predictions = analysis[0]["emotion"]
            except Exception as emotion_err:
                print(f"Emotion analysis error: {str(emotion_err)}")
                dominant_emotion = "neutral"
                
        # Dọn dẹp file tạm
        if os.path.exists(temp_file):
            os.remove(temp_file)
            
        return {
            "success": True,
            "is_present": bool(is_present),
            "is_verified": bool(is_verified),
            "cosine_distance": float(cosine_dist),
            "dominant_emotion": dominant_emotion,
            "emotions_chart": emotion_predictions
        }
    except Exception as e:
        if os.path.exists(temp_file):
            os.remove(temp_file)
        raise HTTPException(status_code=500, detail=f"Lỗi phân tích snapshot học tập: {str(e)}")

if __name__ == "__main__":
    # Tạo thư mục temp nếu chưa có
    os.makedirs(os.path.join(os.getcwd(), "temp"), exist_ok=True)
    print("Starting FastAPI DeepFace Server on port 8000...")
    uvicorn.run(app, host="127.0.0.1", port=8000)
