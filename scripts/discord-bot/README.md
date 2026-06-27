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

## 📂 Cấu Trúc Chi Tiết Mã Nguồn

```
scripts/discord-bot/
├── commands/                # Thư mục chứa các Slash Commands của Bot (21 lệnh)
│   ├── alertDm.js           # Gửi cảnh báo trực tiếp (DM) đến học sinh
│   ├── alertPing.js         # Gửi tin nhắn ping cảnh báo công khai trên kênh chat
│   ├── arena.js             # Lệnh /arena quản trị và tham gia đấu trường học tập realtime
│   ├── baocao.js            # Lệnh /baocao xuất số liệu học tập và làm đề trong ngày/tuần
│   ├── botstatus.js         # Lệnh /botstatus kiểm tra tài nguyên Bot và vẽ Heatmap học tập
│   ├── daily.js             # Quản lý sự kiện thử thách hàng ngày và điểm danh nhận thưởng
│   ├── diemdanh.js          # Lệnh /diemdanh đột xuất ngẫu nhiên học sinh trong kênh voice
│   ├── hocsinh.js           # Lệnh /hocsinh xem thông tin, lọc danh sách và xuất roster CSV
│   ├── hoibai.js            # Lệnh tích hợp AI Hỏi Bài (Thread AI Tutor)
│   ├── lienket.js           # Lệnh /lienket hướng dẫn học sinh liên kết Discord ID lên web
│   ├── phantich.js          # Lệnh /phantich phân tích học tập và lập lộ trình học bằng AI
│   ├── status.js            # Kiểm tra trạng thái cơ bản của Bot
│   ├── streak.js            # Tra cứu streak điểm danh hàng ngày của học sinh
│   ├── taode-ai.js          # Lệnh /taode-ai tự động sinh đề thi trắc nghiệm bằng Gemini AI
│   ├── taode.js             # Lệnh /taode thiết lập đề thi trắc nghiệm thủ công qua Discord Modal
│   ├── thacdau.js           # Lệnh quản lý đấu trường thách đấu học tập giữa các học sinh
│   ├── thi.js               # Tra cứu thông tin kỳ thi và đề thi đang mở
│   ├── thongke.js           # Lệnh thống kê điểm số và số lượng nộp bài của học sinh
│   ├── topstudy.js          # Xem bảng xếp hạng (Leaderboard) học tập tuần/tháng
│   ├── xeploai.js           # Tra cứu danh hiệu, cấp bậc xếp loại của học sinh
│   └── xp.js                # Tra cứu và quản lý điểm kinh nghiệm (XP) của học sinh
├── handlers/                # Thư mục xử lý các luồng sự kiện và tác vụ nền
│   ├── interactions.js      # Xử lý các Button click và Select Menu tương tác trên Discord
│   ├── messages.js          # Định tuyến tin nhắn và trả lời tự động trong Thread AI
│   ├── modals.js            # Xử lý sự kiện Submit của các Form/Modal điền thông tin
│   ├── timetableScheduler.js# Bộ lập lịch tự động quét thời khóa biểu, nhắc nhở & ghi nhận giờ học
│   └── voiceState.js        # Giám sát học sinh vào/ra phòng học voice, tự động phạt AFK treo máy
├── utils/                   # Thư mục chứa các hàm tiện ích và kết nối hệ thống
│   ├── ai.js                # Kết nối Google Gemini API để tạo đề và phân tích kết quả
│   ├── constants.js         # Quản lý hằng số, nạp biến môi trường từ tệp .env
│   ├── embeds.js            # Cấu trúc hiển thị các khung thông tin (Embeds) chuẩn hóa
│   ├── sessions.js          # Quản lý danh sách các phiên học voice đang hoạt động trong bộ nhớ tạm
│   ├── supabase.js          # Khởi tạo Supabase Client kết nối Cơ sở dữ liệu
│   └── sync.js              # Xử lý đồng bộ hóa thời lượng học voice về Web API
├── expressServer.js         # Khởi tạo API Server Express giao tiếp ngược từ Web sang Bot
├── index.js                 # Điểm khởi chạy chính (Entry Point) cấu hình Client & Gateway
├── tracker.js               # Trình theo dõi Voice phụ (đã tích hợp trong index.js)
└── README.md                # Tài liệu hướng dẫn chi tiết dự án Discord Bot
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
