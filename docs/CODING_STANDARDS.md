# 🏆 Master Prompt — ECODEx Coding Standards (9+ Quality)

> **Mục đích**: Đây là bộ quy tắc bắt buộc khi viết code cho hệ thống ECODEx. Mọi output code phải tuân thủ 100% các tiêu chí bên dưới.
>
> **Stack**: Next.js 14+ (App Router) · TypeScript · Supabase (Auth + Postgres + RLS) · React · Framer Motion

---

## 📋 MỤC LỤC

1. [Authentication & Security](#1-authentication--security)
2. [Database & API Design](#2-database--api-design)
3. [Frontend Architecture](#3-frontend-architecture)
4. [Data Integrity & Validation](#4-data-integrity--validation)
5. [Error Handling](#5-error-handling)
6. [UI/UX Standards](#6-uiux-standards)
7. [Code Organization](#7-code-organization)
8. [Pre-commit Checklist](#8-pre-commit-checklist)

---

## 1. Authentication & Security

### 🔴 BẮT BUỘC

| Quy tắc | Lý do |
|---|---|
| **LUÔN dùng `supabase.auth.getUser()`** | `getSession()` đọc từ localStorage, KHÔNG xác minh JWT → kẻ tấn công có thể giả mạo session |
| **API routes: LUÔN dùng `requireAuth()` + `requireRole()`** | Đảm bảo xác thực 2 lớp ở mọi endpoint |
| **KHÔNG BAO GIỜ tin tưởng data từ client** | Luôn validate server-side, kể cả khi frontend đã validate |
| **Sensitive actions phải có ownership check** | Không chỉ check role, phải check user có sở hữu resource không |

### ❌ SAI
```typescript
// ĐỌC TỪ LOCALSTORAGE — KHÔNG AN TOÀN
const { data: { session } } = await supabase.auth.getSession();
if (!session) { router.push("/login"); return }
const userId = session.user.id; // ← Có thể bị giả mạo
```

### ✅ ĐÚNG
```typescript
// XÁC MINH JWT VỚI SERVER
const { data: { user } } = await supabase.auth.getUser();
if (!user) { router.push("/login"); return }
const userId = user.id; // ← Đã xác minh
```

### API Route Pattern chuẩn:
```typescript
async function handlePOST(request: NextRequest) {
  const supabase = await createClient()
  const user = await requireAuth(supabase)        // 401 nếu chưa login
  await requireRole(supabase, user.id, ["teacher", "admin"]) // 403 nếu sai role
  
  // Validate input
  const body = await request.json()
  if (!body.title?.trim()) {
    throw new ApiError("BAD_REQUEST", "Thiếu tiêu đề", 400)
  }
  
  // Ownership check cho UPDATE/DELETE
  if (body.id) {
    const { data: existing } = await supabase
      .from("resources")
      .select("uploader_id")
      .eq("id", body.id)
      .single()
    if (existing?.uploader_id !== user.id) {
      throw new ApiError("FORBIDDEN", "Không có quyền chỉnh sửa", 403)
    }
  }
  
  // Business logic...
}
```

### Online Study (product surface chính)

| Quy tắc | Lý do |
|---|---|
| **PUT `/api/online-study/orders` chỉ teacher/admin** | Học viên không được tự `status: success` |
| **VNPay return + IPN auto-unlock** | Optional / not used when VietQR+Casso is primary |
| **Casso bank webhook auto-unlock** | `POST /api/online-study/payments/casso` + header `secure-token` = `CASSO_SECURE_TOKEN` |
| **Casso match rule** | `amount` exact + bank `description` contains order `memo` tokens |
| **Manual approve** | Teacher PUT orders still works as backup |
| **Giá + memo chỉ server-side** | Không tin `amount`/`memo` từ client |
| **Checkout free-unlock bị cấm** | `POST /checkout` trả 403 |
| **Entitlement: `requireOnlineSubject` + RLS** | Chỉ môn đã mua/gán mới đọc folder/lesson |
| **Register luôn role `student`** | Không cho client set `teacher` |
| **Không hardcode Discord/VNPay secrets** | Fail closed nếu thiếu env |

---

## 2. Database & API Design

### 🔴 BẮT BUỘC

| Quy tắc | Lý do |
|---|---|
| **Mỗi enum value phải UNIQUE trong DB** | Nếu nhiều key map về cùng 1 value, data bị lẫn (VD: `gdcd`, `tin`, `dgnl` → `"other"`) |
| **Luôn dùng `ON DELETE CASCADE` cho foreign keys** | Tránh orphan data khi xóa parent |
| **CHECK constraints ở cả DB LẪN API** | Defense-in-depth: DB là tuyến cuối, API là tuyến đầu |
| **RLS Policies phải cover cả SELECT, INSERT, UPDATE, DELETE** | Không để sót operation nào |
| **Regex trong SQL phải dùng anchor `^`** | `class ~ '12'` match cả `'10A12'` → SAI. Phải dùng `class ~ '^12'` |

### Mapping Pattern chuẩn:
```typescript
// ✅ Centralized trong 1 file duy nhất (lib/subjects.ts)
// Mỗi môn có KEY RIÊNG — KHÔNG ĐƯỢC trùng nhau
export const MAP_SUBJECT_TO_DB: Record<string, string> = {
  toan: "math",
  ly: "physics",
  hoa: "chemistry",
  sinh: "biology",
  anh: "english",
  van: "literature",
  su: "history",
  dia: "geography",
  gdcd: "civic_education",   // ✅ Key riêng
  tin: "informatics",        // ✅ Key riêng
  dgnl: "aptitude_test",     // ✅ Key riêng
  other: "other",
}

// ❌ TUYỆT ĐỐI KHÔNG ĐƯỢC:
// gdcd: "other",  ← 3 môn cùng value = data bị trộn
// tin: "other",
// dgnl: "other",
```

### RLS Policy Pattern:
```sql
-- Student chỉ thấy data thuộc grade của mình
CREATE POLICY "students_view_own_grade" ON public.study_chapters
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND (p.role IN ('teacher', 'admin') OR p.grade = study_chapters.grade)
    )
  );

-- Teacher/Admin có full CRUD
CREATE POLICY "teachers_manage" ON public.study_chapters
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('teacher', 'admin')
    )
  );
```

---

## 3. Frontend Architecture

### 🔴 BẮT BUỘC

| Quy tắc | Lý do |
|---|---|
| **File ≤ 400 dòng** | File > 400 dòng → tách component. File 900+ dòng là KHÔNG CHẤP NHẬN |
| **Không duplicate logic giữa các page** | Extract vào custom hooks hoặc shared utils |
| **State update → PHẢI refetch data liên quan** | VD: Sau onboarding grade → phải reload danh sách exam |
| **Dùng `useMemo` cho filtered/computed lists** | Tránh re-render không cần thiết |
| **Lazy-load data theo tree structure** | Fetch children chỉ khi expand parent |

### Component Extraction Rules:
```
📁 app/teacher/study/
  ├── page.tsx              (< 200 dòng - orchestration only)
  ├── _components/
  │   ├── ChapterTree.tsx   (tree rendering)
  │   ├── ChapterModal.tsx  (create/edit form)
  │   ├── LessonModal.tsx   (create/edit form)
  │   ├── MaterialModal.tsx (create/edit form)
  │   └── StudyHeader.tsx   (header + stats)
  └── _hooks/
      └── useStudyTree.ts   (data fetching + state management)
```

### Custom Hook Pattern:
```typescript
// ✅ Extract data logic vào hook
function useStudyTree(subject: string, grade: number) {
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [lessons, setLessons] = useState<Record<string, Lesson[]>>({})
  const [materials, setMaterials] = useState<Record<string, Material[]>>({})
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  
  const fetchChapters = useCallback(async () => { /* ... */ }, [subject, grade])
  const fetchLessons = useCallback(async (chapterId: string) => { /* ... */ }, [])
  const toggleExpand = useCallback((id: string) => { /* ... */ }, [])
  
  useEffect(() => { fetchChapters() }, [fetchChapters])
  
  return { chapters, lessons, materials, expanded, fetchChapters, fetchLessons, toggleExpand }
}
```

### State Consistency Rule:
```typescript
// ❌ SAI: Update state nhưng KHÔNG refetch data phụ thuộc
onComplete={(grade, classSuffix) => {
  setProfile(prev => ({ ...prev, grade, class_suffix: classSuffix }))
  // BUG: Exam list vẫn dùng data cũ!
}}

// ✅ ĐÚNG: Refetch hoặc reload
onComplete={(grade, classSuffix) => {
  setProfile(prev => ({ ...prev, grade, class_suffix: classSuffix }))
  window.location.reload() // Đảm bảo mọi data được refetch
}}
```

---

## 4. Data Integrity & Validation

### 🔴 BẮT BUỘC

| Quy tắc | Lý do |
|---|---|
| **Validate ở CẢ 3 tầng**: Frontend → API → Database | Mỗi tầng là 1 lớp phòng thủ |
| **Format data phải THỐNG NHẤT xuyên suốt hệ thống** | VD: `target_classes` chứa suffix `"A1"` hay full `"12A1"`? Phải chọn 1 |
| **Grade enforcement: 6 ≤ grade ≤ 12** | CHECK ở DB + validate ở API + dropdown UI chỉ hiện 6-12 |
| **Trim + sanitize mọi text input** | `.trim()` trước khi lưu DB |

### Validation Chain:
```
┌─────────────┐    ┌──────────────┐    ┌──────────────────────┐
│  Frontend   │ →  │   API Route  │ →  │  Database CHECK +    │
│  (dropdown, │    │  (validate   │    │  RLS Policies        │
│   required) │    │   + sanitize)│    │  (final enforcement) │
└─────────────┘    └──────────────┘    └──────────────────────┘
```

### Format Consistency Pattern:
```typescript
// ✅ Quyết định 1 lần, dùng mãi:
// target_classes LUÔN chứa CLASS SUFFIX (không có grade prefix)
// VD: ["A1", "A2"] KHÔNG PHẢI ["12A1", "12A2"]

// Teacher side (create exam):
const classesArray = targetClasses.trim()
  ? targetClasses.split(",").map(c => c.trim().toUpperCase()).filter(Boolean)
  : null

// Student side (filter exams):
const studentSuffix = profile.class_suffix?.toUpperCase()
const visible = exams.filter(exam => {
  if (exam.target_classes?.length > 0) {
    return studentSuffix && exam.target_classes.includes(studentSuffix)
  }
  return true // Không chỉ định class → cả khối thấy
})
```

---

## 5. Error Handling

### 🔴 BẮT BUỘC

| Quy tắc | Lý do |
|---|---|
| **Mọi fetch/async phải có try-catch** | Không để unhandled rejection |
| **API errors phải có mã lỗi + message tiếng Việt** | UX tốt cho người dùng |
| **Dùng `withErrorHandler` wrapper cho API routes** | Consistent error format |
| **Loading states cho MỌI async operation** | User phải biết hệ thống đang xử lý |
| **Fallback UI cho empty states** | Không để trang trống không có gì |

### API Error Pattern:
```typescript
// lib/api-utils.ts
export class ApiError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number
  ) { super(message) }
}

// Sử dụng trong route:
if (!title?.trim()) {
  throw new ApiError("BAD_REQUEST", "Vui lòng nhập tiêu đề", 400)
}

if (grade < 6 || grade > 12) {
  throw new ApiError("BAD_REQUEST", "Khối lớp phải từ 6 đến 12", 400)
}
```

### Frontend Error Pattern:
```typescript
// ✅ Luôn có 3 trạng thái: loading, error, success
{loading ? (
  <div className="flex items-center justify-center py-20">
    <Loader2 className="h-10 w-10 animate-spin" />
    <p className="mt-3 text-sm">Đang tải...</p>
  </div>
) : error ? (
  <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4">
    <p className="text-sm text-red-500">{error}</p>
  </div>
) : items.length === 0 ? (
  <EmptyState message="Chưa có dữ liệu" />
) : (
  <ItemList items={items} />
)}
```

---

## 6. UI/UX Standards

### 🔴 BẮT BUỘC

| Quy tắc | Lý do |
|---|---|
| **Glassmorphism design system** | Đảm bảo premium look |
| **Border radius ≥ `rounded-xl` (0.75rem)** | Consistent rounded aesthetic |
| **Animations cho expand/collapse** | Framer Motion `AnimatePresence` |
| **Right-click disabled trên sensitive media** | Bảo vệ content cơ bản |
| **Responsive: Mobile-first** | BottomNav cho mobile, Sidebar cho desktop |
| **Confirm dialog cho destructive actions** | Tránh xóa nhầm |

### Design Token System:
```css
/* ✅ LUÔN dùng CSS variables, KHÔNG hardcode colors */
bg-[hsl(var(--background))]
text-[hsl(var(--foreground))]
border-[hsl(var(--border))]/60
bg-[hsl(var(--card))]/50
text-[hsl(var(--muted-foreground))]

/* ❌ KHÔNG ĐƯỢC: */
bg-white          /* ← Không hoạt động trong dark mode */
text-gray-900     /* ← Hardcoded color */
border-gray-200   /* ← Không consistent */
```

### YouTube Embed Security:
```tsx
// ✅ Chuẩn
<div className="relative">
  <iframe
    src={`${url}?controls=0&disablekb=1&rel=0&modestbranding=1&iv_load_policy=3`}
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
    allowFullScreen
  />
  {/* Overlay chặn click vào YouTube logo */}
  <div className="absolute top-0 left-0 right-0 h-[60px] bg-transparent" 
       onClick={e => e.stopPropagation()} />
  <div className="absolute bottom-0 right-0 w-[100px] h-[50px] bg-transparent"
       onClick={e => e.stopPropagation()} />
</div>
```

---

## 7. Code Organization

### 🔴 BẮT BUỘC

| Quy tắc | Lý do |
|---|---|
| **Constants/mappings → `lib/` hoặc `config/`** | Single source of truth |
| **KHÔNG duplicate code giữa các file** | Extract thành shared module |
| **Types/interfaces → `types/index.ts` hoặc colocated** | Consistent type definitions |
| **API routes → thin handlers, delegate to services** | Separation of concerns |
| **Comments bằng tiếng Việt cho business logic** | Team Việt Nam đọc dễ hơn |

### File Structure Convention:
```
src/
├── app/
│   ├── api/study/
│   │   ├── chapters/route.ts    (< 130 dòng)
│   │   ├── lessons/route.ts     (< 100 dòng)
│   │   └── materials/route.ts   (< 120 dòng)
│   ├── teacher/study/
│   │   ├── page.tsx             (< 200 dòng, orchestration)
│   │   └── _components/         (tách UI components)
│   └── resources/
│       ├── page.tsx             (< 300 dòng)
│       └── _components/
├── components/
│   ├── shared/                  (Loading, EmptyState, ConfirmDialog)
│   ├── student/                 (GradeOnboardingModal, etc.)
│   └── teacher/                 (TeacherShell, etc.)
├── hooks/                       (useStudyTree, useAuth, etc.)
├── lib/
│   ├── subjects.ts              (SUBJECTS, MAP_SUBJECT_TO_DB)
│   ├── auth-utils.ts            (requireAuth, requireRole)
│   ├── api-utils.ts             (withErrorHandler, ApiError)
│   └── supabase/
└── types/
    └── index.ts
```

---

## 8. Pre-commit Checklist

Trước khi commit, BẮT BUỘC kiểm tra:

### Security
- [ ] Không dùng `getSession()` ở bất kỳ đâu (chỉ `getUser()`)
- [ ] Mọi API route có `requireAuth()` + `requireRole()` phù hợp
- [ ] Destructive actions (DELETE, UPDATE) có ownership check
- [ ] Không expose sensitive data trong API response

### Data Integrity
- [ ] Mọi enum/mapping có key UNIQUE (không trùng value)
- [ ] Validate input ở cả frontend + API + DB constraints
- [ ] Format data nhất quán xuyên suốt (cùng quy ước cho dates, class names, etc.)
- [ ] Foreign keys có `ON DELETE CASCADE` hoặc `SET NULL` phù hợp

### Frontend
- [ ] State update → refetch data phụ thuộc
- [ ] Có loading state cho mọi async operation
- [ ] Có empty state khi danh sách rỗng
- [ ] Có error state + user-friendly message
- [ ] Không duplicate logic giữa các page (dùng hooks/utils)

### Code Quality
- [ ] File ≤ 400 dòng (nếu vượt → tách component)
- [ ] `npx tsc --noEmit` pass (0 errors)
- [ ] Không có `any` type trừ khi bắt buộc (và có comment giải thích)
- [ ] Constants centralized trong `lib/` (không local duplicate)

### UI/UX
- [ ] Dùng CSS variables (không hardcode colors)
- [ ] Responsive: test cả mobile (< 640px) và desktop
- [ ] Destructive actions có confirm dialog
- [ ] Animation cho transitions (expand/collapse/modal)

---

## ⚡ Quick Reference — Common Pitfalls

| Pitfall | Đã gặp? | Cách tránh |
|---|---|---|
| `getSession()` thay vì `getUser()` | ✅ | Search & replace toàn bộ |
| Nhiều môn map về cùng `"other"` | ✅ | Mỗi môn 1 unique DB key |
| Thiếu refetch sau state change | ✅ | `window.location.reload()` hoặc re-call fetch |
| SQL regex không anchor `^` | ✅ | Luôn dùng `'^12'` thay vì `'12'` |
| File 900+ dòng | ✅ | Tách thành components + hooks |
| `target_classes` format lẫn lộn | ✅ | Chọn 1 format, document rõ |
| Code duplicate giữa pages | ✅ | Extract vào `lib/` hoặc `hooks/` |
| Thiếu loading/empty/error states | ✅ | Luôn implement cả 3 |

---

> **Quy tắc vàng**: Nếu nghi ngờ, hãy chọn cách AN TOÀN HƠN. Code tốt là code mà người khác đọc 6 tháng sau vẫn hiểu ngay.
