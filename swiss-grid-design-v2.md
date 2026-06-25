---
name: Swiss Grid
version: 2.0.0
colors:
  primary: "#111111"       # Deep Obsidian for main text and solid headers
  neutral-bg: "#F4F3EF"    # Soft Alpine Stone background (easier on eyes than pure white)
  neutral-fg: "#111111"    # Main foreground
  muted: "#666666"         # For metadata and borders (often used with opacity)
  accent: "#E60000"        # Iconic Helvetica Red - the single driver for focal interaction
  white: "#FFFFFF"         # Pure white for card components and crisp contrast
typography:
  fontFamily: "IBM Plex Sans, Inter, Helvetica, Arial, sans-serif"
  h1:
    fontSize: "3.5rem"
    fontWeight: "300"      # Light weight for display titles to enforce Swiss elegance
    lineHeight: "1.1"
    letterSpacing: "-0.04em"
  h2:
    fontSize: "2rem"
    fontWeight: "400"      # Normal weight
    lineHeight: "1.2"
    letterSpacing: "-0.02em"
  h3:
    fontSize: "1.25rem"
    fontWeight: "500"      # Medium weight for small titles
    lineHeight: "1.3"
    letterSpacing: "0"
  body:
    fontSize: "1rem"
    fontWeight: "400"
    lineHeight: "1.6"
    letterSpacing: "0"
  caption:
    fontSize: "0.75rem"
    fontWeight: "500"
    lineHeight: "1.4"
    letterSpacing: "0.05em"
rounded:
  none: "0px"              # Sharp corners are preferred in pure Swiss grid design
  sm: "2px"                # Micro-rounding for subtle touch
spacing:
  base: "8px"
  xs: "8px"
  sm: "16px"
  md: "24px"
  lg: "48px"
  xl: "80px"
components:
  scaffold:
    backgroundColor: "{colors.neutral-bg}"
    color: "{colors.primary}"
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.white}"
    borderRadius: "{rounded.none}"
    padding: "{spacing.sm} {spacing.md}"
    fontWeight: "500"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.primary}"
    borderColor: "{colors.primary}"
    borderWidth: "1px"
    borderRadius: "{rounded.none}"
    padding: "{spacing.sm} {spacing.md}"
  card:
    backgroundColor: "{colors.white}"
    borderColor: "{colors.muted}"
    borderWidth: "1px"
    padding: "{spacing.md}"
    borderRadius: "{rounded.none}"
---

## Overview
Hệ thống thiết kế **Swiss Grid (V2)** kế thừa trọn vẹn triết lý cốt lõi của Phong cách Đồ họa Quốc tế (International Typographic Style) phát triển tại Thụy Sĩ vào những năm 1950–1960. Hệ thống này ưu tiên tính khách quan, sự rõ ràng, cấu trúc lưới nghiêm ngặt và hệ chữ sans-serif thuần khiết. Giao diện không sử dụng các chi tiết trang trí thừa thãi mà dùng chính khoảng trắng (whitespace), kích thước chữ và sự bất đối xứng để tạo nên nhịp điệu thị giác và chiều sâu cấu trúc cho toàn bộ ứng dụng. Định dạng tài liệu này được tối ưu hóa để các AI Coding Agent (như Cursor, Claude Code, Stitch) có thể đọc hiểu và lập trình giao diện một cách nhất quán tuyệt đối.

## Colors
Bảng màu của Swiss Grid cực kỳ tinh giản và tập trung vào độ tương phản cao, tuân thủ nguyên tắc nghiêm ngặt "Một dự án - Một màu nhấn".
- **Primary (#111111):** Sắc đen Obsidian sâu thẳm dùng cho văn bản chính, tiêu đề và các khối cấu trúc nền tảng.
- **Neutral Background (#F4F3EF):** Màu đá Alpine Stone thanh lịch, mang lại cảm giác dễ chịu, cao cấp và giảm mỏi mắt so với màu trắng tinh thuần túy.
- **Accent (#E60000):** Sắc đỏ Thụy Sĩ (Swiss Red) rực rỡ, là yếu tố duy nhất được dùng để điều hướng sự chú ý, nhấn mạnh các hành động quan trọng (Call to Action) hoặc trạng thái tương tác quan trọng.
- **Hierarchy qua Độ mờ (Opacity):** Để tạo phân cấp thông tin mà không làm nhiễu bảng màu, hệ thống sử dụng các mức độ mờ của chính màu `Primary` thay vì thêm các mã màu xám mới (ví dụ: `text-black/70` cho nội dung phụ, `text-black/40` cho caption).

## Typography
Hệ thống chữ sử dụng trường phái Grotesque sans-serif hiện đại với họ phông ưu tiên là **IBM Plex Sans**, kết hợp chặt chẽ cùng các phông chữ hệ thống tiêu chuẩn như Helvetica và Inter.
- **Tiêu đề lớn (H1):** Định dạng `font-light` (trọng lượng mảnh) kết hợp với khoảng cách chữ thu hẹp (`letter-spacing: -0.04em`) tạo ra sự căng thẳng thị giác đầy tính nghệ thuật mà không bị nặng nề.
- **Chữ nội dung (Body):** Chiều rộng của các cột văn bản không bao giờ vượt quá **60 ký tự (60ch)** để đảm bảo tối ưu hóa tốc độ đọc và khả năng ghi nhớ của người dùng.

## Layout & Spacing
Hệ thống lưới (Grid) là xương sống quy định toàn bộ bố cục của sản phẩm.
- **Hệ thống đơn vị gốc:** Mọi khoảng cách (padding, margin, khoảng cách dòng) đều dựa trên bội số của **8px** nhằm tạo ra một nhịp điệu hình học đồng nhất.
- **Lưới 12 cột (12-Column Grid):** Trên màn hình desktop, bố cục bắt buộc phải bám sát hệ thống lưới 12 cột với khoảng cách giữa các cột (gutter) cố định là `24px` (`spacing.md`). Khoảng trắng không phải là phần không gian bị bỏ phí, mà chính là chất liệu cấu trúc định hình nên giao diện. Bố cục linh hoạt chuyển đổi từ một cột trên di động sang cấu trúc đa cột đối xứng hoặc bất đối xứng trên desktop dựa trên các tỷ lệ toán học rõ ràng.

## Components
Các thành phần giao diện được thiết kế theo trường phái tối giản hình học tối đa, loại bỏ hoàn toàn các yếu tố trang trí giả lập chất liệu (skeuomorphism).
- **Sharp Corners (Góc cạnh sắc nét):** Mặc định các thành phần như nút bấm (Buttons), ô nhập liệu (Inputs), và thẻ thông tin (Cards) đều sử dụng bo góc bằng `0px` (`rounded.none`). Các góc vuông tuyệt đối thể hiện tính kỷ luật và kiến trúc vững chãi.
- **Buttons:** Nút bấm chính có nền màu đỏ Accent với chữ trắng tương phản, khi hover sẽ tăng độ đậm hoặc thay đổi opacity nhẹ. Nút bấm phụ sử dụng dạng đường viền (outline) đen mảnh, tạo sự tinh tế tối giản.
- **Cards & Containers:** Đường viền mảnh 1px với màu sắc mờ (`colors.muted`) phân chia không gian rõ ràng mà không gây nặng nề thị giác.

## Do's and Don'ts
### Do's
- Luôn giới hạn chiều rộng của khối văn bản body trong khoảng từ 45ch đến 60ch để tối ưu hóa trải nghiệm đọc.
- Sử dụng độ mờ (opacity) của màu đen để phân cấp thông tin thay vì dùng thêm các mã màu xám khác trong bảng mã.
- Đảm bảo tỷ lệ khoảng trắng lớn xung quanh các khối tiêu đề lớn để tạo điểm nghỉ thị giác rõ rệt.
- Giữ nguyên kỷ luật căn lề trái (left-aligned) cho hầu hết các khối văn bản để duy trì trục dọc vững chắc của lưới.

### Don'ts
- Không bao giờ được sử dụng nhiều hơn một màu nhấn (Accent Color) trong cùng một giao diện sản phẩm.
- Nghiêm cấm sử dụng hiệu ứng bóng đổ (box-shadow), hiệu ứng chuyển màu (gradients) hoặc các góc bo tròn lớn (trừ khi là hình tròn hoàn hảo cho avatar).
- Không tự ý phá vỡ hệ thống lưới cơ sở 8px khi thiết lập khoảng cách lề và đệm của các phần tử.
