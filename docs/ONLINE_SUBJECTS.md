# Online subjects — single source of truth

## Keys

| Layer | Field | Example |
|-------|--------|---------|
| UI / grant / order | catalog `value` | `toan`, `dgnl_hsa` |
| `online_folders.subject` | `dbValue` | `math`, `dgnl_hsa` |

Source list: `src/lib/subjects.ts` → `ONLINE_SUBJECTS`.

Helpers: `expandSubjectAliases`, `toCatalogSubjectKey`, `isValidOnlineSubjectKey` in `src/lib/online-study-auth.ts`.

## Price (charge)

1. **`payment_settings`** (teacher cấu hình) — ưu tiên  
2. Fallback **`ONLINE_SUBJECTS[].price`**

Intro marketing (`src/data/courses-intro.ts` → `PRICING`) is **display only** (gạch + % giảm). Không charge theo intro.

## Teachers on intro page

Teacher names live in `INTRO_SUBJECTS` (`courses-intro.ts`). Catalog labels/icons should stay aligned with `ONLINE_SUBJECTS` (same `value` keys).
