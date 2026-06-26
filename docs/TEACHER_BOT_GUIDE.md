# EXAMHUB TEACHER BOT GUIDE
> Design Theme: **Dream Engine** (Obsidian `#0B0A13` · Pearl `#F1EDF9` · Dream Violet `#C18CFF`)

Chào mừng thầy/cô đến với cẩm nang vận hành **ExamHub Discord Bot**. Hướng dẫn này được thiết kế theo ngôn ngữ thiết kế **Dream Engine**, giúp thầy/cô dễ dàng làm chủ các tính năng quản trị lớp học, tạo đề thi tự động bằng AI, và phân tích tiến độ học tập của học sinh trực tiếp từ Discord.

---

## 🎨 HỆ THỐNG THƯƠNG HIỆU & MÀU SẮC (DESIGN TOKENS)

Khi thiết kế giao diện tin nhắn hoặc embed phản hồi từ Bot, chúng ta tuân thủ nghiêm ngặt bảng màu phẳng (flat system) của **Dream Engine**:

| Tên Màu | Mã HEX | Vai trò | Tần suất sử dụng |
| :--- | :--- | :--- | :--- |
| **Obsidian Dark** | `#0B0A13` | Nền tảng (Neutral) | Toàn bộ khung nền tin nhắn/embed |
| **Pearl White** | `#F1EDF9` | Nội dung chính (Primary) | Tiêu đề chính, văn bản chi tiết |
| **Lavender Mist** | `#8C87A2` | Nội dung phụ (Secondary) | Chú thích, đường viền, metadata |
| **Dream Violet** | `#C18CFF` | Điểm nhấn tương tác (Tertiary) | Nút bấm quan trọng nhất, lời gọi hành động (CTA) |

---

## 🛠️ DANH SÁCH LỆNH QUẢN TRỊ CHO GIÁO VIÊN

### 1. Nhóm Công Cụ Soạn Đề (Exam Builder Tools)

#### 📝 Tạo Đề Thủ Công (`/taode`)
*   **Mô tả**: Tạo đề trắc nghiệm từng bước thông qua hộp thoại tương tác (Modal wizard).
*   **Quy trình sử dụng**:
    1.  Nhập lệnh `/taode`.
    2.  Điền thông tin cơ bản: *Tên đề, Môn học, Thời gian làm bài (phút), Mô tả, Khối lớp*.
    3.  Nhấp vào nút **➕ Thêm câu hỏi** (Hộp thoại Step 2 hiển thị để điền nội dung câu hỏi, 4 đáp án và giải thích).
    4.  Nhấp **👁️ Xem trước** để xem toàn bộ danh sách câu hỏi đã soạn.
    5.  Nhấp **🚀 Phát hành** để chính thức tải đề lên cơ sở dữ liệu ExamHub.

#### 🤖 AI Tự Động Tạo Đề (`/taode-ai`)
*   **Mô tả**: Tạo đề thi trắc nghiệm hoàn chỉnh bằng Trí tuệ nhân tạo Gemini chỉ từ một từ khóa chủ đề.
*   **Tham số lệnh**:
    *   `chu_de` (Bắt buộc): Chủ đề bài học (Ví dụ: *Tích phân lượng giác*, *Động lượng*).
    *   `so_cau` (Tùy chọn): Số câu từ `3` đến `10` câu.
    *   `do_kho` (Tùy chọn): *Dễ / Trung bình / Khó*.
    *   `lop` (Tùy chọn): *10 / 11 / 12 / TSTD* (Thí sinh tự do).
*   **Quy trình sử dụng**:
    1.  Nhập lệnh và điền các tùy chọn mong muốn.
    2.  Hệ thống AI sẽ trả về bản xem trước (Preview) gồm 3 câu hỏi đầu kèm đáp án.
    3.  Nhấp **🚀 Phát hành đề thi** để lưu trữ và mở đề trên ExamHub. Nhấp **❌ Hủy** nếu muốn tạo lại.

---

### 2. Nhóm Công Cụ Quản Lý & Phân Tích (Analytics & Roster)

#### 📊 Phân Tích Học Tập Thông Minh AI (`/phantich`)
*   **Mô tả**: Sử dụng AI để tổng hợp kết quả của 15 đề làm gần nhất của một học sinh và xuất báo cáo học tập chi tiết.
*   **Tham số**:
    *   `hoc_sinh` (Bắt buộc): Tag tên học sinh cần phân tích.
*   **Báo cáo đầu ra gồm**:
    *   🎯 **Phân tích học tập**: Đánh giá chi tiết điểm mạnh/yếu theo từng môn học dựa trên phổ điểm.
    *   💡 **Giải pháp cải thiện**: Các hành động cụ thể để khắc phục phần kiến thức bị hổng.
    *   📅 **Lộ trình ôn tập 2 tuần**: Lịch trình học tập và làm đề chi tiết từng ngày dành cho học sinh.

#### 👥 Roster Học Sinh (`/hocsinh`)
*   **Các lệnh con (Subcommands)**:
    *   `/hocsinh info student:@HocSinh`: Xem hồ sơ chi tiết (Cấp độ, Tổng XP, Streak ngày, Tổng số giờ ngồi Voice học tập thực tế và thời gian AFK treo máy).
    *   `/hocsinh list [lop:TSTD/12/...]`: Hiển thị danh sách các học sinh đã liên kết tài khoản Discord, hỗ trợ lọc theo khối lớp hoặc Thí sinh tự do (TSTD).
    *   `/hocsinh export`: Xuất toàn bộ tệp cơ sở dữ liệu học sinh ra file CSV (Họ tên, Email, Lớp, Discord ID, Ngày liên kết) để thầy/cô nhập vào Excel.

---

### 3. Nhóm Lệnh Vận Hành & Điểm Danh (Monitoring & Operations)

#### 🔔 Điểm Danh / Điểm danh ngẫu nhiên (`/diemdanh`)
*   **Mô tả**: Kích hoạt bộ kiểm tra điểm danh ngẫu nhiên đối với học sinh đang tham gia phòng học Voice.
*   **Cơ chế hoạt động**:
    *   Học sinh nhận được tin nhắn điểm danh kèm nút bấm **Xác nhận thành công**.
    *   Thời gian giới hạn phản hồi để tránh treo máy (AFK) hoặc gian lận.

#### 📝 Báo Cáo Tổng Hợp (`/baocao`)
*   **Mô tả**: Xuất nhanh số liệu thống kê thời gian học voice và hoạt động làm bài trong ngày/tuần.

#### ⚙️ Kiểm Tra Sức Khỏe Bot (`/botstatus`)
*   **Mô tả**: Xem thông số kỹ thuật hoạt động của bot: Uptime (thời gian chạy liên tục), Độ trễ mạng (Latency), Mức tiêu thụ RAM/CPU, Số lượng phiên học Voice đang hoạt động, và biểu đồ nhiệt (heatmap) thể hiện khung giờ học cao điểm của học sinh trong 24 giờ qua.

---

## 💡 NGUYÊN TẮC BẢO MẬT & VẬN HÀNH (DO'S AND DON'TS)

-   ✅ **Nên** hướng dẫn học sinh liên kết tài khoản bằng lệnh `/lienket` để hệ thống tự động ghi nhận học trình và tích lũy XP.
-   ✅ **Nên** sử dụng nút bấm **Phát hành** thay vì gõ tay lại cấu trúc đề nhằm tránh các lỗi định dạng ký tự.
-   ❌ **Không** chia sẻ file cấu hình `.env` hoặc mã `DISCORD_BOT_TOKEN` cho bất kỳ ai để tránh lộ thông tin kết nối Database.
-   ❌ **Không** lạm dụng lệnh `/diemdanh` liên tục trong khoảng thời gian ngắn để tránh gây phiền nhiễu (spam) cho trải nghiệm học tập của học sinh.
