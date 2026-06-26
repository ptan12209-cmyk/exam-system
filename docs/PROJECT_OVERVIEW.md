# Tài Liệu Kỹ Thuật Dự Án ExamHub

Văn bản này trình bày đặc tả chi tiết về hệ thống kỹ thuật, luồng dữ liệu (Data Flow) và kiến trúc ứng dụng của ExamHub.

## 1. Giới Thiệu Tổng Quan (Executive Summary)

**ExamHub** là một nền tảng EdTech thế hệ mới tập trung vào trải nghiệm Học-thông-qua-Chơi (Gamified Learning). Dự án được xây dựng dựa trên nguyên tắc **Microservices Architecture** với sự tách biệt rõ ràng giữa Frontend (Next.js) và Backend Xử lý nặng (Python AI Worker).

Khác với các hệ thống Learning Management System (LMS) truyền thống, ExamHub áp dụng AI (Google Gemini) để giải bài toán hóc búa nhất của giáo viên: "Số hóa đề thi". Thông qua việc đẩy mạnh tự động hóa, ExamHub giúp giảm 90% thời gian tạo đề và chuẩn hóa ma trận tự động.

## 2. Kiến Trúc Hệ Thống (System Architecture)

![Architecture](https://img.shields.io/badge/Architecture-Serverless%20%2B%20Microservices-blue.svg)

Dự án áp dụng mô hình 3-Tier linh hoạt:

1.  **Client Tier (Frontend):** Vận hành trên Next.js 16.1 App Router. Xử lý toàn bộ UI/UX, Gamification Animation, và Single Page Application routing. Được host trên hệ thống Vercel Network.
2.  **Logic Tier (Services):**
    *   **Supabase Edge/PostgREST:** Xử lý trực tiếp 95% các tác vụ API CRUD tiêu chuẩn (Tạo/Xem/Xóa bài thi) mà không cần viết REST API rườm rà.
    *   **Python AI Worker:** 1 Microservice chạy độc lập trên Render, chuyên nhận Request chứa tệp PDF, chuyển hình ảnh qua pdf2image, giao tiếp với Gemini Core để bóc tách Dữ liệu thành JSON và trả ngược về Frontend.
3.  **Data Tier (Database):** CSDL PostgreSQL Serverless của Supabase. Tích hợp chặt chẽ với Supabase Auth, Row Level Security (RLS) để cô lập dữ liệu người dùng.

## 3. Đặc Tả Dữ Liệu & Bảo Mật (Database & RLS)

Sức mạnh bảo mật của ExamHub đều nằm dưới tầng Database, chặn đứng hacker từ cấp độ Query Database thay vì chặn tại File Logic:

*   **Bảng `profiles`**: Bản đồ hoá từ `auth.users`. Quyền `role` (teacher/student) quyết định mọi hành động vĩ mô trên website.
*   **Bảng `exams` & `submissions`**: 
    - Đề thi (`exams`) giữ quan hệ `1:N` với Bài Nộp (`submissions`). RLS Policy cài chặt chẽ luật: Học sinh chỉ xem được điểm của bản thân mình (Trừ khi đó là Arena Mode).
    - Submissions có Constraint `unique(exam_id, student_id)`: Chống gian lận không nộp bài 2 lần.
*   **Bảng Gamification (`achievements`, `user_rewards`)**: Tính toán điểm cống hiến (XP) một cách tự động khi có biến động trong bảng submissions thông qua  PostgreSQL **Triggers** và **Functions** thay vì dùng code JS (giảm nghẽn Backend ảo). 

## 4. Workflow Bóc Tách Đề Thi AI (AI Extraction Workflow)

Tính năng xương sống của ExamHub được luân chuyển dữ liệu như sau:

1.  **[Frontend]** Giáo viên upload 1 tệp `Đề_và_Đáp_án.pdf`.
2.  **[Storage]** Next.js tức thì đẩy tệp này lên Supabase Bucket `exam-pdfs` và lấy về URL công khai.
3.  **[Worker API]** Trình duyệt gọi POST thẳng tới Python Worker (`https://exam-system-xxx.onrender.com/extract-answers`) và đẩy nguyên mẫu FormData.
4.  **[Python Parser]** 
    - Worker nhận file trên RAM (BytesIO).
    - Thư viện `pdfplumber` quét toàn bộ Text ẩn. Nếu không có text -> Bật chế độ ảnh.
    - Gọi API Proxy `v98store` kết nối với bộ não **Gemini-3-Flash-Preview/Gemini-2.5-Pro**. Nhồi đoạn Prompt cực gắt định dạng Tiếng Việt + Yêu cầu JSON chuẩn đầu ra.
    - Chụp Fallback bằng Regex/Dict nếu mạng AI bị rớt (`503/429`).
5.  **[Frontend]** Nhận bộ JSON, Auto điền vào Form tạo đề. Giáo viên bấm "Xác nhận", đẩy vào CSDL gốc.

## 5. Danh Mục Công Nghệ (Tech Stack Insights)

*   **Core UI:** React 19 + Tailwind CSS 4.0. Component System dựa trên Shadcn UI, cho phép module hóa từng Card, Button hoàn hảo.
*   **Storage & Auth:** Supabase (Cung cấp Token JWT với độ tin cậy tuyệt đối dựa trên cấu trúc Row Level Security của Postgres).
*   **Security:** Cloudflare Turnstile (Anti-bot Captcha bảo vệ API).
*   **Tooling:** Biểu đồ Realtime qua thư viện Recharts cực nhẹ. Các Notification dạng Toast nâng tầm UI.

## 6. Hướng Dẫn Vận Hành Hệ Thống (Operations)

1.  **Khởi động Local**:
    ```bash
    # Tab 1: Khởi động UI Client
    npm install && npm run dev
    
    # Tab 2: Khởi động AI API (Python)
    cd worker
    .\venv\Scripts\Activate.ps1
    uvicorn main:app --reload --port 8000
    ```
2.  **Liên kết biến môi trường**: Phải nhớ quy luật: `NEXT_PUBLIC_APP_URL` là địa chỉ nơi khách hàng truy cập, `NEXT_PUBLIC_WORKER_URL` là địa chỉ Python Worker.
3.  **Scale (Mở Lớn)**: Với kiến trúc hiện tại, Frontend có thể mở rộng tự do trên Vercel Edge. Supabase hoàn toàn chịu tải 10,000 requests/s. Điểm cần giới hạn duy nhất là **Python Worker**, có thể Upgrade Instance trên Render khi lượng giáo viên upload tệp vượt quá 100 người/phút cùng lúc để chống treo RAM.
