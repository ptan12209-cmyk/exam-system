# Tài Liệu Kỹ Thuật Dự Án ExamHub

Văn bản này trình bày đặc tả chi tiết về hệ thống kỹ thuật, luồng dữ liệu (Data Flow) và kiến trúc ứng dụng của ExamHub.

## 1. Giới Thiệu Tổng Quan (Executive Summary)

**ExamHub** là hệ thống giao bài và làm bài trực tuyến, tập trung vào ba nhu cầu: giáo viên cấp tài khoản, tạo đề và quản lý kết quả học sinh. Các màn hình học liệu online và đăng ký công khai được khóa bằng feature flag/middleware.

## 2. Kiến Trúc Hệ Thống (System Architecture)

![Architecture](https://img.shields.io/badge/Architecture-Serverless%20%2B%20Microservices-blue.svg)

Dự án áp dụng mô hình 3-Tier linh hoạt:

1.  **Client Tier (Frontend):** Vận hành trên Next.js 16.1 App Router. Xử lý toàn bộ UI/UX, Gamification Animation, và Single Page Application routing. Được host trên hệ thống Vercel Network.
2.  **Logic Tier (Services):**
    *   **Next.js API Routes:** xác thực thao tác nhạy cảm như cấp tài khoản, nộp bài và chấm điểm.
    *   **Supabase Edge/PostgREST:** xử lý các thao tác CRUD có Row Level Security bảo vệ.
3.  **Data Tier (Database):** CSDL PostgreSQL Serverless của Supabase. Tích hợp chặt chẽ với Supabase Auth, Row Level Security (RLS) để cô lập dữ liệu người dùng.

## 3. Đặc Tả Dữ Liệu & Bảo Mật (Database & RLS)

Sức mạnh bảo mật của ExamHub đều nằm dưới tầng Database, chặn đứng hacker từ cấp độ Query Database thay vì chặn tại File Logic:

*   **Bảng `profiles`**: Bản đồ hoá từ `auth.users`. Quyền `role` (teacher/student) quyết định mọi hành động vĩ mô trên website.
*   **Bảng `exams` & `submissions`**: 
    - Đề thi (`exams`) giữ quan hệ `1:N` với Bài Nộp (`submissions`). RLS Policy cài chặt chẽ luật: Học sinh chỉ xem được điểm của bản thân mình (Trừ khi đó là Arena Mode).
    - Submissions có Constraint `unique(exam_id, student_id, attempt_number)` để quản lý chính xác từng lượt làm bài.
*   **Bảng `parent_student_links`**: xác định học sinh nào thuộc quyền quản lý của từng giáo viên.

## 4. Workflow Nạp Đáp Án Bằng JSON

Việc quét đáp án bằng AI đã bị loại bỏ. Giáo viên chủ động dán một JSON duy nhất gồm tối đa ba nhóm câu hỏi:

1. **`multiple_choice`**: câu trắc nghiệm với đáp án `A`–`D`.
2. **`true_false`**: mỗi câu có bốn mệnh đề `a`–`d` nhận giá trị boolean.
3. **`short_answer`**: đáp án ngắn dạng chuỗi hoặc số.

Frontend kiểm tra schema, số thứ tự liên tục và chuẩn hóa dữ liệu ngay trên máy. Chỉ sau khi JSON hợp lệ, hệ thống mới nạp đáp án vào biểu mẫu tạo đề hoặc ngân hàng đề; nội dung JSON không được gửi tới dịch vụ AI bên ngoài.

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
    
    ```
2.  **Liên kết biến môi trường**: `NEXT_PUBLIC_APP_URL` là địa chỉ website; `SUPABASE_SERVICE_ROLE_KEY` chỉ được cấu hình phía server để giáo viên cấp tài khoản.
3.  **Database**: sao lưu dữ liệu rồi chạy duy nhất `supabase-core-exam.sql` trong Supabase SQL Editor.
