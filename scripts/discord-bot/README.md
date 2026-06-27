# 🤖 ExamHub Discord Bot

> **Core Monitor Engine** • Giám sát học tập, quản trị lớp học, tạo đề bằng AI và Tự động điểm danh/nhắc nhở theo Thời khóa biểu.

ExamHub Discord Bot là thành phần cốt lõi của hệ thống giám sát học tập ExamHub. Bot hoạt động như một giám thị ảo giúp ghi nhận thời gian học voice của học sinh, gửi thông báo nhắc nhở thông minh, và hỗ trợ giáo viên soạn đề bằng trí tuệ nhân tạo (Gemini AI).

---

## ⚡ Các Tính Năng Cốt Lõi

### 1. Giám Sát Phòng Học Voice & Chống Treo Máy (AFK)
*   **Real-time Tracking**: Tự động ghi nhận thời gian tham gia kênh voice học tập (`Classroom`) và đồng bộ lên Website của Giáo viên.
*   **AFK Shield**: Phát hiện treo máy dựa trên hoạt động (không bật mic, tắt âm, không chia sẻ màn hình lâu hơn thời gian quy định) và tự động di chuyển học sinh vào phòng chờ (`AFK Voice Channel`) để đảm bảo tính trung thực.

### 2. Tự Động Giám Sát Thời Khóa Biểu (Timetable Auto-Proctoring)
*   **Nhắc nhở qua DMs**: Quét lịch học của học sinh và gửi **5 lần tin nhắn riêng** trước giờ học 10 phút (mỗi 2 phút một lần) để học sinh chuẩn bị.
*   **Cảnh báo trễ học**: Nếu lớp học đã bắt đầu nhưng học sinh chưa vào kênh voice, bot sẽ gửi tin nhắn cảnh báo tag tên học sinh công khai tại kênh nhắc nhở lúc vào giờ học và khi trễ **5 phút**.
*   **Tích lũy giờ học**: Ghi nhận trực tiếp số giây học thực tế vào bảng `timetable_study_logs`. Tự động đánh dấu hoàn thành ca học (tích xanh trên Web) khi học đủ giờ.
*   **Tùy biến lịch**: Tự động bỏ qua các ca học được học sinh đánh dấu là `"Nghỉ"`.

### 3. Công Cụ Giáo Viên (Teacher Slash Commands)
*   `/taode`: Thiết lập đề thi trắc nghiệm thủ công từng bước qua hộp thoại Discord.
*   `/taode-ai`: Soạn đề thi trắc nghiệm thông qua AI Gemini chỉ bằng một chủ đề từ khóa.
*   `/phantich`: Phân tích phổ điểm làm đề của học sinh và xuất báo cáo học thuật 2 tuần bằng AI.
*   `/hocsinh info | list | export`: Tra cứu cấp độ học tập, xuất danh sách học sinh liên kết ra file CSV.
*   `/diemdanh`: Kích hoạt bộ kiểm tra điểm danh đột xuất ngẫu nhiên trong kênh voice.
*   `/botstatus`: Xem tài nguyên hệ thống (RAM, CPU, Uptime) và Heatmap khung giờ học tập cao điểm.

---

## 📂 Cấu Trúc Thư Mục

```
scripts/discord-bot/
├── commands/            # Slash commands (/taode, /diemdanh, /hocsinh, /botstatus...)
├── handlers/            # Handlers tương tác, Voice state và Lịch trình giám sát
│   ├── timetableScheduler.js  # Bộ lập lịch nhắc nhở/giám sát thời khóa biểu
│   └── voiceState.js          # Xử lý sự kiện tham gia/rời phòng học voice
├── utils/               # Kết nối CSDL Supabase, nạp hằng số
├── expressServer.js     # Express API kết nối Web-to-Bot
├── index.js             # File chạy chính của Bot
└── .env.example         # File mẫu cấu hình biến môi trường
```

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Bot

### Bước 1: Cài đặt Thư viện
Di chuyển vào thư mục bot và cài đặt các thư viện cần thiết:
```bash
cd scripts/discord-bot
npm install
```

### Bước 2: Cấu hình Môi trường
Tạo tệp `.env` tại thư mục `scripts/discord-bot/` và điền đầy đủ các thông tin:

```env
# 1. Discord Bot Configuration
DISCORD_BOT_TOKEN="your_discord_bot_token"
CLASS_VOICE_CHANNEL_ID="your_voice_classroom_id"
CLASS_TEXT_CHANNEL_ID="your_text_reminder_channel_id"
ANNOUNCE_CHANNEL_ID="your_announcement_channel_id"

# 2. Database Sync Configuration
NEXT_PUBLIC_SUPABASE_URL="your_supabase_url"
SUPABASE_SERVICE_ROLE_KEY="your_supabase_service_role_key"

# 3. AFK & Tracker Settings (Seconds)
AFK_VOICE_CHANNEL_ID="your_afk_voice_channel_id"
AFK_DEAFEN_TIMEOUT_SECONDS=600
AFK_MUTE_TIMEOUT_SECONDS=1800
TEACHER_LOG_CHANNEL_ID="your_teacher_logs_channel_id"
```

### Bước 3: Đăng ký Commands & Chạy Bot
*   **Đăng ký Slash Commands**: Lệnh slash được tự động đăng ký toàn cầu khi bot khởi động thành công.
*   **Chạy Bot**:
    ```bash
    node index.js
    ```

---

## 💡 Nguyên Tắc Vận Hành
*   **Bảo Mật**: Tuyệt đối không đẩy tệp `.env` chứa `SUPABASE_SERVICE_ROLE_KEY` và `DISCORD_BOT_TOKEN` lên các kho lưu trữ công khai.
*   **Đồng Bộ**: Đảm bảo múi giờ trên server chạy bot là múi giờ Việt Nam (`UTC+7`) hoặc bot sẽ tự động cộng offset để đồng bộ hóa đúng với trang Web.
