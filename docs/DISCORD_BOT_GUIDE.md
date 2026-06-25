# 📋 Hướng Dẫn Cấu Hình & Vận Hành Bot Giám Sát Discord

Hệ thống ECODEx / ExamHub hỗ trợ tính năng tự động ghi nhận thời gian học tập của học sinh thông qua hoạt động voice channel trên Discord. Để tính năng này hoạt động, cần cấu hình hai phần: **Học sinh liên kết Discord ID** và **Chạy Bot Discord giám sát**.

---

## 👤 PHẦN 1: Hướng Dẫn Học Sinh Liên Kết Tài Khoản

Để hệ thống web nhận diện được bạn khi tham gia lớp học trên Discord, bạn cần điền chính xác **Discord ID** vào hồ sơ cá nhân:

### Bước 1: Bật chế độ Nhà phát triển trên Discord
1. Mở ứng dụng Discord, vào phần **Cài đặt người dùng** (User Settings - biểu tượng bánh răng ở góc dưới bên trái).
2. Chọn mục **Nâng cao** (Advanced) trong phần cài đặt ứng dụng.
3. Kích hoạt tùy chọn **Chế độ dành cho nhà phát triển** (Developer Mode).

### Bước 2: Sao chép ID của bạn
1. Click chuột phải vào **Ảnh đại diện** hoặc **Tên tài khoản** của bạn (ở góc dưới bên trái hoặc trong danh sách thành viên server).
2. Chọn **Sao chép ID người dùng** (Copy User ID). ID sẽ là một chuỗi số dài (ví dụ: `318263590503694336`).

### Bước 3: Lưu ID lên Website
1. Đăng nhập vào trang web ExamHub.
2. Truy cập vào **Hồ sơ cá nhân** -> chọn **Chỉnh sửa**.
3. Dán ID đã sao chép vào trường **Discord ID** và nhấn **Lưu thay đổi**.

---

## 🤖 PHẦN 2: Hướng Dẫn Giáo Viên / Quản Trị Viên Thiết Lập Bot Discord

Bot Discord có nhiệm vụ theo dõi trạng thái tham gia kênh thoại của học sinh và đồng bộ thời gian học về máy chủ web.

### Bước 1: Tạo ứng dụng Bot trên Discord Developer Portal
1. Truy cập trang web: [Discord Developer Portal](https://discord.com/developers/applications) và đăng nhập bằng tài khoản Discord của bạn.
2. Chọn **New Application** ở góc trên bên phải, đặt tên cho ứng dụng (ví dụ: `ExamHub Study Monitor`) và nhấn **Create**.
3. Đi tới mục **Bot** ở menu bên trái.
4. Chọn **Reset Token** và sao chép mã Token hiển thị (ví dụ: `MTIy...`). **Lưu ý bảo mật mã này, không chia sẻ công khai**.
5. Cuộn xuống phần **Privileged Gateway Intents**, bật kích hoạt cả 3 tùy chọn sau:
   - **Presence Intent**
   - **Server Members Intent**
   - **Message Content Intent**
6. Nhấn **Save Changes** để lưu cấu hình.

### Bước 2: Thêm Bot vào Server học tập
1. Đi tới mục **OAuth2** -> chọn **URL Generator** ở menu bên trái.
2. Trong phần **Scopes**, tích chọn **bot**.
3. Trong phần **Bot Permissions** xuất hiện phía dưới, tích chọn các quyền:
   - `Read Messages/View Channels`
   - `Send Messages`
   - `Mute Members` (để quản lý phòng học nếu cần)
   - `Deafen Members`
   - `Move Members`
   - `Connect`
   - `Speak`
   - `Use Voice Activity`
4. Cuộn xuống dưới cùng và copy liên kết tại ô **Generated URL**.
5. Dán URL này vào trình duyệt, chọn Server học tập của bạn và nhấn **Ủy quyền** (Authorize) để mời Bot vào nhóm.

### Bước 3: Lấy ID kênh thoại học tập (Voice Channel ID)
1. Trên giao diện Discord, tìm kênh thoại (Voice Channel) dùng để học tập.
2. Click chuột phải vào tên kênh thoại đó và chọn **Sao chép ID kênh** (Copy Channel ID). ID này sẽ dùng để điền vào cấu hình biến môi trường của Bot.

---

## ⚙️ PHẦN 3: Cấu Hình & Chạy Bot Giám Sát

Mã nguồn Bot giám sát nằm tại thư mục [scripts/discord-bot/tracker.js](file:///x:/ECODEx/exam-system/scripts/discord-bot/tracker.js).

### Bước 1: Cấu hình biến môi trường
Tạo file `.env` nằm trong thư mục gốc của dự án hoặc ngay tại thư mục chứa bot `scripts/discord-bot/` với các giá trị sau:

```env
# Token của Bot đã tạo ở phần 2
DISCORD_BOT_TOKEN="TOKEN_BOT_CỦA_BẠN"

# ID của kênh thoại học tập đã lấy ở phần 2
CLASS_VOICE_CHANNEL_ID="ID_KÊNH_THOẠI_CỦA_BẠN"

# Đường dẫn API đồng bộ (Thay bằng domain thật nếu chạy production)
WEB_API_URL="http://localhost:3000/api/study-sessions/discord-sync"

# Khóa bí mật để xác thực webhook đồng bộ (Khớp với cấu hình Next.js)
DISCORD_SYNC_SECRET="discord_sync_secret_token_2026"
```

### Bước 2: Cài đặt thư viện dependencies
Bot yêu cầu các thư viện `discord.js`, `axios` và `dotenv` để hoạt động. Mở terminal tại thư mục gốc và chạy lệnh:
```bash
npm install discord.js axios dotenv
```

### Bước 3: Chạy Bot
Khởi chạy tiến trình bot bằng lệnh:
```bash
node scripts/discord-bot/tracker.js
```

Khi chạy thành công, bạn sẽ thấy thông báo trong terminal:
```text
=============================================
Discord voice tracker bot is logged in as ExamHub Study Monitor#1234
Target voice channel ID: 123456789012345678
API Target URL: http://localhost:3000/api/study-sessions/discord-sync
=============================================
```

Khi có học sinh tham gia/rời kênh thoại, bot sẽ ghi nhận log real-time và gửi yêu cầu đồng bộ hóa về trang web để cập nhật trực tiếp tiến độ học tập trên **Đài Giám Sát** của Giáo viên/Phụ huynh.
