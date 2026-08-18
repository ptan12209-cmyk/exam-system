# Feature flags

Single entry: `src/lib/features.ts`

| Flag | Default | Ý nghĩa |
|------|---------|---------|
| `ONLINE_STUDY_ENABLED` | `false` | Chặn trang/API học liệu, Discord/co-study và thanh toán |
| `GAMIFICATION_ENABLED` | `false` | Chặn UI và API achievements/rewards |
| `REGISTRATION_ENABLED` | `false` | Khóa vĩnh viễn `/register`; học sinh do giáo viên cấp |
| `SINGLE_DEVICE_ENABLED` | `true` | 1 thiết bị / HV (cần SQL migration) |
| `BUNNY_SECURITY_CHECKLIST_ENABLED` | `false` | Checklist Bunny của hệ học online |

Helpers: `isRegistrationOpen()`, `isOnlineStudyRoute()`,
`isOnlineStudyApiRoute()`, `isGamificationRoute()`, `isGamificationApiRoute()`.

**Guard:** `src/lib/__tests__/features.test.ts` fail nếu file rỗng / thiếu export.
