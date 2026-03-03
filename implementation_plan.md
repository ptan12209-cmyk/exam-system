# Implementation Plan: Anti-Cheat Nâng Cao & Mobile PDF Viewer

## Phần 1: Hệ thống chống gian lận nâng cao

### Lớp 1 — Webcam & Micro Proctoring (getUserMedia)
- Bắt buộc bật Camera + Micro trước khi vào thi
- Hiển thị ô video nhỏ (picture-in-picture) để răn đe
- Chụp snapshot webcam định kỳ (mỗi 30s) lưu vào Supabase Storage để giáo viên hậu kiểm

### Lớp 2 — AI Face Detection (face-api.js)
- Chạy trực tiếp trên trình duyệt, không cần server
- Phát hiện: không có mặt (vắng), nhiều hơn 1 mặt (thi hộ)
- Mỗi vi phạm tăng bộ đếm, vượt ngưỡng → tự nộp bài

### Lớp 3 — Audio Monitoring (AudioContext API)
- Phân tích cường độ âm thanh từ micro
- Phát hiện tiếng nói chuyện kéo dài → cảnh báo

### Lớp 4 — Session Lockdown (đã có, nâng cấp)
- Chuyển tab, thoát fullscreen, chặn copy/paste/DevTools (giữ nguyên)
- Ghi log tất cả vi phạm vào DB kèm timestamp

### Files thay đổi:
- `[MODIFY]` src/components/exam/AntiCheatProvider.tsx — thêm webcam/audio hooks
- `[NEW]` src/components/exam/WebcamProctor.tsx — component camera + face detection
- `[NEW]` src/components/exam/AudioProctor.tsx — component giám sát âm thanh
- `[MODIFY]` src/app/student/exams/[id]/take/page.tsx — tích hợp proctoring mới

---

## Phần 2: Mobile PDF Viewer (thay iframe)

### Vấn đề
- `<iframe src="pdf_url">` trên mobile bị Safari ép tải, Chrome mở tab mới
- Gián đoạn luồng làm bài rất khó chịu

### Giải pháp
- Dùng `react-pdf` (wrapper PDF.js) render PDF thành `<canvas>` inline
- Trên mobile: hiển thị trong Dialog/Drawer vuốt lên, không mở tab mới

### Files thay đổi:
- `[NEW]` src/components/exam/InlinePdfViewer.tsx
- `[MODIFY]` src/app/student/exams/[id]/take/page.tsx — thay iframe bằng InlinePdfViewer
- `[MODIFY]` src/app/student/exams/[id]/result/page.tsx — thêm nút xem đề inline

## Thứ tự triển khai
1. Cài thư viện: `react-pdf`, `face-api.js`
2. Tạo InlinePdfViewer component
3. Tạo WebcamProctor + AudioProctor components
4. Nâng cấp AntiCheatProvider
5. Cập nhật trang Take Exam
6. Type check + test
