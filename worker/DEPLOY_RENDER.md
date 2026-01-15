# Deploy PDF Worker lên Render

## Các bước deploy

### 1. Tạo Git Repository
Nếu chưa có, tạo Git repo cho worker:
```bash
cd worker
git init
git add .
git commit -m "Initial commit"
```

### 2. Push lên GitHub
1. Tạo repo mới trên GitHub: `exam-system-worker`
2. Push code:
```bash
git remote add origin https://github.com/YOUR_USERNAME/exam-system-worker.git
git push -u origin main
```

### 3. Tạo Web Service trên Render
1. Vào [render.com](https://render.com) → Sign up/Login
2. Click **New** → **Web Service**
3. Connect GitHub repo
4. Cấu hình:
   - **Name**: `exam-pdf-worker`
   - **Region**: Singapore
   - **Branch**: `main`
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Click **Create Web Service**

### 4. Lấy URL và cấu hình Next.js
Sau khi deploy xong, bạn sẽ có URL như:
```
https://exam-pdf-worker.onrender.com
```

Thêm vào `.env.local` của Next.js:
```env
NEXT_PUBLIC_WORKER_URL=https://exam-pdf-worker.onrender.com
```

### 5. Restart Next.js
```bash
npm run dev
```

---

## Test
1. Vào Teacher Dashboard → Tạo đề thi
2. Upload PDF có đáp án
3. Click "✨ Tự động lấy đáp án từ PDF"
4. Verify đáp án được fill tự động
