# Online Study Import (Bunny → ExamHub)

Machine API for the **Drive downloader local service** to publish completed Bunny uploads into ExamHub `online_folders` / `online_lessons`.

## Setup

1. Run SQL: `migrations/migration-online-import-sources.sql` in Supabase.
2. Set env on ExamHub (Vercel / `.env.local`):

```env
ONLINE_STUDY_IMPORT_SECRET=long-random-secret
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_SUPABASE_URL=...
# Optional signed Stream embeds for students:
BUNNY_STREAM_TOKEN_KEY=...
```

3. On downloader Settings (Phase 2 client): base URL + same secret.

## API

`POST /api/online-study/import`

Headers:

```http
Authorization: Bearer <ONLINE_STUDY_IMPORT_SECRET>
Content-Type: application/json
```

Body:

```json
{
  "courseKey": "combo-xps-2027",
  "subject": "toan",
  "defaultFolderName": "COMBO XPS 2027",
  "items": [
    {
      "driveFileId": "1xxx",
      "kind": "video",
      "title": "Bai 15.mp4",
      "relativePath": "01. MON TOAN/Chuong 1",
      "embedUrl": "https://iframe.mediadelivery.net/embed/702263/guid",
      "streamVideoId": "guid"
    },
    {
      "driveFileId": "1yyy",
      "kind": "pdf",
      "title": "De.pdf",
      "relativePath": "01. MON TOAN/Chuong 1",
      "cdnUrl": "https://xxx.b-cdn.net/courses/docs/.../De.pdf",
      "remotePath": "courses/docs/.../De.pdf"
    }
  ]
}
```

## Idempotency

Lessons are upserted by `source_drive_file_id` (unique partial index). Re-import updates URLs/title, does not duplicate.

## Subject codes (critical)

Teacher Online Study UI filters folders by **DB** subject values:

| UI tab (frontend) | Stored in `online_folders.subject` |
|-------------------|-------------------------------------|
| `toan` | `math` |
| `ly` | `physics` |
| `hoa` | `chemistry` |
| `sinh` | `biology` |
| `anh` | `english` |
| `van` | `literature` |
| `dgnl_hsa` / `dgnl_vact` / `dgnl_tsa` | same dbValue |

Import accepts **either** frontend keys or DB values and normalizes to DB codes.
If you store `subject=toan` while the UI queries `subject=math`, folders appear empty.

Folder tree is scoped by `(examhub_course_key, subject, source_path)` so each môn has its own root.

## Security

- Secret only on server + local downloader settings (never in client browser).
- Students still go through existing entitlement / playback routes for media.
