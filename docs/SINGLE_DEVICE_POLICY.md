# Chính sách 1 thiết bị / 1 tài khoản

## Thầy cần chạy SQL (1 lần)

Trong **Supabase → SQL Editor**, chạy file:

`migrations/migration-single-device-binding.sql`

Nếu chưa chạy, API bind/verify sẽ **fail-open** (ghi log, không khóa hết học viên) hoặc báo lỗi bind tùy endpoint.

## Cách hoạt động

1. Học viên đăng nhập → browser nhận `device_id` (localStorage + cookie `sh_device_id`).
2. `POST /api/auth/device/bind` ghi thiết bị này là **duy nhất** cho tài khoản (máy cũ bị thay).
3. `DeviceSessionGuard` poll `POST /api/auth/device/verify` ~45s; conflict → đăng xuất + `/login?error=device_kicked`.
4. API học (playback, folders, lessons, …) gọi `requireSingleDevice` — máy lạ không xem video được.
5. **Teacher / admin** được miễn.

## Reset thiết bị (thầy)

Teacher → Online study → tab quyền học viên → nút **Reset TB**.

Hoặc API:

```http
POST /api/auth/device/reset
{ "userId": "<uuid học viên>" }
```

## Tắt tính năng

`src/lib/features.ts`:

```ts
export const SINGLE_DEVICE_ENABLED = false
```
