# 🔔 Nhắc thầy: Mở lại đăng ký tài khoản — 29/07/2026

**Ngày mở lại:** **29 tháng 7 năm 2026**  
**Việc cần làm:** Bật lại tính năng **tạo tài khoản / đăng ký** cho học viên sau giai đoạn chỉ xem trang giới thiệu khóa học.

## Vì sao đang khóa?

- Khách chỉ **overview** trang giới thiệu môn học + giá + landing.
- Tránh đăng ký ồ ạt trước khi thầy sẵn sàng vận hành mua khóa / cấp quyền.

## Cách mở lại (5 phút)

1. Mở file: `src/lib/features.ts`
2. Đổi:

```ts
export const REGISTRATION_ENABLED = false
```

thành:

```ts
export const REGISTRATION_ENABLED = true
```

3. (Tuỳ chọn) Xóa hoặc cập nhật dòng `REGISTRATION_REOPEN_DATE` nếu không cần auto-mở theo ngày nữa.
4. Commit + deploy Vercel như bình thường.

**Lưu ý:** Trong code có `isRegistrationOpen()` — nếu để `REGISTRATION_ENABLED = false` nhưng đã qua **29/07/2026**, hệ thống **tự coi là mở** theo ngày. Muốn khóa cứng sau ngày đó, giữ `false` và sửa `isRegistrationOpen()` chỉ return `REGISTRATION_ENABLED` (bỏ nhánh auto theo ngày).

## Checklist sau khi mở

- [ ] `/register` vào được form đăng ký
- [ ] Nút “Đăng ký” trên trang giới thiệu + landing hoạt động
- [ ] Thông báo Zalo/email hỗ trợ vẫn đúng
- [ ] Giá khóa học (99k / 250k / 450k / 599k) khớp cấu hình thanh toán thực tế nếu đã đổi

## Liên quan

| File | Vai trò |
|------|---------|
| `src/lib/features.ts` | Cờ `REGISTRATION_ENABLED` |
| `src/app/page.tsx` | Trang giới thiệu khóa học (entry) |
| `src/app/landing/page.tsx` | Landing marketing |
| `src/app/register/page.tsx` | Form đăng ký (bị khóa khi cờ off) |
| `src/data/courses-intro.ts` | Môn / GV / bảng giá intro |

---

*Tạo lúc khóa đăng ký tạm thời. Xóa file này sau khi đã mở lại nếu không cần lưu.*
