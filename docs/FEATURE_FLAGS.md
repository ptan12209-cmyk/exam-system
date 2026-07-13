# Feature flags

Single entry: `src/lib/features.ts`

| Flag | Default | Ý nghĩa |
|------|---------|---------|
| `GAMIFICATION_ENABLED` | `false` | Ẩn UI achievements/rewards |
| `REGISTRATION_ENABLED` | `false` | Cho phép `/register` (hoặc auto theo ngày) |
| `REGISTRATION_REOPEN_DATE` | `2026-07-29` | Auto-mở đăng ký từ ngày này (VN) |
| `SINGLE_DEVICE_ENABLED` | `true` | 1 thiết bị / HV (cần SQL migration) |
| `BUNNY_SECURITY_CHECKLIST_ENABLED` | `true` | Checklist Bunny trên teacher (UI còn ẩn/hiện local) |

Helpers: `isRegistrationOpen()`, `isGamificationRoute()`.

**Guard:** `src/lib/__tests__/features.test.ts` fail nếu file rỗng / thiếu export.
