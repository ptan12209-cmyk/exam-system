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

---

## 👩‍🏫 PHẦN 4: Hướng Dẫn Giáo Viên / Phụ Huynh Giám Sát Trên Website

Sau khi bot đã được chạy và học sinh đã điền Discord ID, giáo viên có thể bắt đầu giám sát tiến trình học tập của học sinh trực tiếp trên giao diện web:

### Bước 1: Liên kết tài khoản học sinh cần giám sát
1. Đăng nhập với tài khoản có vai trò **Giáo viên** (Teacher) hoặc **Phụ huynh** (Parent).
2. Truy cập vào trang **Đài Giám Sát** (`/teacher/monitor`).
3. Nếu chưa liên kết học sinh nào:
   - Hệ thống sẽ hiển thị một form để kết nối.
   - Nhập chính xác email đăng ký tài khoản của học sinh và nhấn **Kết nối**.
4. Nếu đã có tài khoản liên kết, bạn sẽ thấy tên học sinh hiển thị trong hộp chọn (dropdown) **Học sinh đang quan sát** ở góc trên bên phải.

### Bước 2: Theo dõi hoạt động học tập qua Discord
1. Chọn học sinh cần theo dõi trên thanh dropdown.
2. Nhấp vào tab **Giám sát Discord**.
3. Tại đây, bạn sẽ thấy 2 phần dữ liệu trực quan:
   - **Biểu đồ hoạt động Discord (Stacked Bar Chart)**: Thống kê tổng số phút học tập voice (màu xanh lá) và số phút treo máy/AFK (màu cam) của học sinh trong 7 ngày gần nhất.
   - **Chi tiết các phiên học**: Bảng danh sách ghi nhận chi tiết thời gian chính xác học sinh tham gia phòng thoại (`Vào phòng`), rời phòng thoại (`Rời phòng`), cũng như tổng thời gian học và thời gian treo máy của từng ngày.

### Bước 3: Trạng thái kết nối Real-time & Cảnh báo AFK
*   **Kết nối trực tiếp**: Nếu học sinh hiện đang ở trong kênh thoại Discord học tập, tại cột **Rời phòng** sẽ hiển thị nhãn trạng thái động nhấp nháy: `Đang kết nối 🟢`.
*   **Cảnh báo Treo máy quá 50%**: Nếu tổng thời gian học sinh tắt tai nghe (Deafened) hoặc không phát âm thanh vượt quá 50% tổng lượng thời gian tham gia lớp học, một nhãn cảnh báo đỏ `Cảnh báo: Treo máy > 50%` sẽ xuất hiện tự động để giáo viên nhanh chóng nắm bắt.
*   **Cảnh báo AFK quá 10 phút**: Trong trường hợp học sinh tắt tai nghe liên tục trong kênh thoại trên 10 phút, hệ thống sẽ tự động phát một cảnh báo đỏ nổi bật `active_alert` trên giao diện web của học sinh yêu cầu học sinh bật lại tai nghe để tập trung học.

