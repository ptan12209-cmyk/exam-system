---
name: DOL English Main Theme
version: 2.0.0
colors:
  primary: "#d14242"                   # DOL Crimson Red - Brand core identity
  primary-hover: "#da6868"             # Lightened red for hover states
  primary-active: "#e38e8e"            # Softened red for active clicks
  primary-disabled: "#bcbec7"          # Neutral gray for blocked actions
  
  text-dark: "#242938"                 # Deep Slate Navy for maximum readability
  text-muted: "#95979f"                # Muted gray for captions and subtexts
  
  blue-accent: "#2074bb"               # Tech/LMS Blue for structural secondary actions
  blue-hover: "#4d90c9"
  blue-active: "#79acd6"
  
  bg-white: "#FFFFFF"                  # Base workspace container background
  bg-neutral: "#f4f4f6"                # Soft secondary background for section cards
  border-light: "#e9eaeb"              # Ultra-thin gray line for dividers
  selection-bg: "#edb3b366"            # Translucent soft crimson highlight for text selection
typography:
  fontFamily: "Inter, Plus Jakarta Sans, Roboto, system-ui, sans-serif"
  fontSize: "14px"                     # Tight, high-density baseline optimized for LMS
  lineHeight: "1.5715"                 # Ant Design derived line height for perfect alignment
rounded:
  sm: "10px"                           # Minimum rounding for input boxes and compact chips
  md: "12px"                           # Standard card and badge component rounding
  lg: "16px"                           # Main container or global alert modal rounding
components:
  scaffold:
    backgroundColor: "{colors.bg-white}"
    color: "{colors.text-dark}"
    paddingTop: "64px"                 # Fixed top navigation offset bar standard
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    borderRadius: "{rounded.sm}"
    transition: "all 0.2s ease"
  button-secondary:
    backgroundColor: "{colors.bg-neutral}"
    textColor: "{colors.text-dark}"
    borderRadius: "{rounded.sm}"
  card-interactive:
    backgroundColor: "{colors.bg-white}"
    borderColor: "{colors.border-light}"
    borderWidth: "1px"
    borderRadius: "{rounded.md}"
---

## Overview
Hệ thống thiết kế **DOL English Main Theme (V2)** phản ánh chính xác bản sắc thương hiệu của hệ sinh thái EdTech cao cấp (bao gồm `dolthpt.vn` và nền tảng quản lý học tập `superlms.dolenglish.vn`). Phong cách này là sự kết hợp hài hòa giữa cấu trúc trang trọng chuyên nghiệp của giáo dục và sự hiện đại, năng động của công nghệ số. Điểm đặc trưng nhất là việc tối ưu hóa mật độ hiển thị dữ liệu (Data-Dense Canvas Layout) để phục vụ cho các tính năng luyện tập thông minh, chấm chữa bài và sơ đồ tư duy (Linearthinking System). Tài liệu này cung cấp chỉ dẫn tường minh giúp các AI Coding Agent tái tạo chính xác giao diện chuẩn của DOL.

## Colors
Bảng màu tập trung cao độ vào nhóm màu thương hiệu cốt lõi, phối hợp với hệ màu chức năng phân cấp rõ rệt.
- **Brand Primary Red (#d14242):** Màu đỏ Crimson đóng vai trò định vị thương hiệu. Được sử dụng cho các tương tác hành động chính (Primary Call-to-Action), các nút hoàn thành bài học, và trạng thái nổi bật.
- **Tech Accent Blue (#2074bb):** Sắc xanh dương thông minh, đại diện cho các tính năng AI, hệ thống LMS, thanh tiến độ học tập (Progress Bar) và liên kết tài liệu hướng dẫn.
- **Text & Contrast (#242938):** Hạn chế tối đa dùng màu đen thuần (#000). Thay vào đó, toàn bộ chữ hiển thị chính dùng sắc xanh navy sẫm Deep Slate để tạo cảm giác tinh tế, dễ chịu khi học viên phải nhìn vào màn hình liên tục từ 2-3 tiếng.
- **Selection Color (#edb3b366):** Điểm nhấn trải nghiệm người dùng nhỏ nhưng tinh tế – khi bôi đen văn bản, nền chọn sẽ có màu hồng đỏ mờ dịu mắt thay vì màu xanh dương mặc định của trình duyệt.

## Typography
Thiết kế chữ của DOL English đề cao tính cô đọng, rõ ràng và mật độ thông tin tối ưu.
- **Font Stack:** Sự kết hợp đồng đều giữa bộ phông giao diện **Inter** (giúp các ký tự icon và bảng số liệu gọn gàng) và **Plus Jakarta Sans / Roboto** (mang lại cảm giác mượt mà, liền mạch cho các đoạn văn đọc hiểu IELTS/THPT Quốc gia).
- **Mật độ hiển thị:** Kích thước chữ cơ sở (Base Font Size) được thiết lập ở mức **14px** thay vì 16px thông thường. Kết hợp cùng tỉ lệ `line-height: 1.5715` giúp chứa được nhiều thông tin câu hỏi, bài tập hơn trên một màn hình hiển thị mà không tạo cảm giác rối mắt.

## Layout & Spacing
Hệ thống bố cục được căn chỉnh theo chuẩn màn hình Dashboard tiện ích.
- **Fixed Navbar Grid:** Toàn bộ phần thân trang (`body`) bắt buộc phải có `padding-top: 64px` để nhường không gian cố định cho thanh điều hướng Header (chứa logo, thanh tiến trình học và thông tin tài khoản).
- **Hệ thống thanh cuộn (Scrollbar):** Sử dụng thanh cuộn tùy chỉnh siêu mảnh với nền `#fafafa` và con lăn (`thumb`) màu xám nhạt `#c1c1c1` bo tròn `16px`. Điều này giúp giao diện tổng thể của ứng dụng luôn đồng bộ trên cả hệ điều hành Windows lẫn macOS.

## Components
- **Bo góc thân thiện (Friendly Radius):** Các thành phần nút bấm, khung nhập liệu hoặc thẻ bài tập hoàn toàn loại bỏ góc vuông sắc nhọn, áp dụng mức bo góc lớn từ **10px đến 16px**. Điều này tạo cảm giác gần gũi, giảm áp lực tâm lý thi cử cho học viên.
- **Trạng thái Nút bấm (Button States):** Mọi nút bấm hệ thống đều khai báo rõ 4 trạng thái tuyến tính (`Mặc định` -> `Hover` -> `Active` -> `Disabled`) giúp AI hoặc lập trình viên dễ dàng tích hợp hiệu ứng CSS Transitions mượt mà.

## Do's and Don'ts
### Do's
- Luôn bám sát khoảng đệm đỉnh `64px` trên thẻ body khi thiết kế trang có cấu trúc thanh điều hướng cố định.
- Sử dụng màu xanh Navy `#242938` cho tất cả các thẻ tiêu đề (H1, H2, H3) và văn bản chính để đảm bảo tính đồng bộ của chủ đề.
- Áp dụng hiệu ứng bo góc `12px` cho các thẻ container (cards) chứa nội dung bài tập trắc nghiệm.

### Don't
- Không sử dụng màu đen tuyệt đối `#000000` cho phần văn bản lớn, điều này làm phá vỡ cấu trúc dịu mắt của theme.
- Không để các góc cạnh của nút bấm hoặc ô nhập liệu ở dạng sắc nhọn (`border-radius: 0px`).
- Tránh lạm dụng màu đỏ thương hiệu `#d14242` cho các thành phần cảnh báo lỗi (Error), thay vào đó hãy dùng màu đỏ lỗi chuẩn hệ thống để phân biệt với màu nút bấm chính.
