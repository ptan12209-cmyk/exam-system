import {
  normalizeMediaUrlForStorage,
  type MediaItem,
} from '@/lib/lesson-media'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ONLINE_SUBJECTS } from '@/lib/subjects'

/**
 * Teacher UI filters folders by DB subject codes (math, physics, …)
 * via getOnlineSubjectInfo(selected).dbValue — NOT frontend keys (toan, ly).
 * Import payloads often send frontend keys; normalize here.
 */
export function toOnlineStudyDbSubject(input: string): string {
  const s = String(input || '').trim()
  if (!s) return 'math'
  const byValue = ONLINE_SUBJECTS.find((x) => x.value === s)
  if (byValue) return byValue.dbValue
  const byDb = ONLINE_SUBJECTS.find((x) => x.dbValue === s)
  if (byDb) return byDb.dbValue
  // Downloader / watch-job aliases
  const aliases: Record<string, string> = {
    dgnl: 'dgnl_hsa',
    hsa: 'dgnl_hsa',
    tsa: 'dgnl_tsa',
    vact: 'dgnl_vact',
    vatc: 'dgnl_vact', // Drive often labels V-ACT as VATC
    'dgnl-hsa': 'dgnl_hsa',
    'dgnl-tsa': 'dgnl_tsa',
    'dgnl-vact': 'dgnl_vact',
    khxh: 'history', // KHXH mixed — default history tab
    'khoa-hoc-xa-hoi': 'history',
    history: 'history',
    geography: 'geography',
    civic_education: 'civic_education',
  }
  if (aliases[s.toLowerCase()]) return aliases[s.toLowerCase()]
  return s
}

export type ImportItem = {
  driveFileId?: string
  kind?: string
  title?: string
  relativePath?: string
  embedUrl?: string
  cdnUrl?: string
  remotePath?: string
  streamVideoId?: string
  streamLibraryId?: string
}

export type ImportPayload = {
  courseKey: string
  subject: string
  teacherId?: string | null
  defaultFolderName?: string
  items: ImportItem[]
}

export type ImportResult = {
  created: number
  updated: number
  skipped: number
  errors: Array<{ index: number; error: string; driveFileId?: string }>
  logId?: string
}

function cleanTitle(name: string): string {
  return String(name || 'Bài học')
    .replace(/^📚\s*/u, '')
    .trim()
    .slice(0, 200) || 'Bài học'
}

function pathSegments(relativePath: string): string[] {
  return String(relativePath || '')
    .replace(/\\/g, '/')
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.slice(0, 180))
}

/**
 * Natural order from folder/file names so UI matches Drive/Bunny tree:
 *   "1. xxx" < "2. xxx" < "10. xxx"
 *   "1.2 Lộ trình" → 1002
 * Depth-based order_index was wrong (all siblings got the same index).
 */
export function naturalOrderIndex(name: string): number {
  const s = String(name || '').trim()
  if (!s) return 999_999

  // "1. Title", "01) Title", "10 - Title", "1.2 Title"
  let m = s.match(/^(\d{1,4})(?:[.\-_](\d{1,4}))?[.\-_)\]\s]/)
  if (m) {
    const major = parseInt(m[1], 10)
    const minor = m[2] != null ? parseInt(m[2], 10) : 0
    return major * 1000 + minor
  }

  // "Chương 1", "Bài 12", "Theme 3", "Phần 2"
  m = s.match(
    /(?:chương|chuong|bài|bai|theme|phần|phan|buổi|buoi|step|chapter)\s*(\d{1,4})(?:[.\-_](\d{1,4}))?/i
  )
  if (m) {
    const major = parseInt(m[1], 10)
    const minor = m[2] != null ? parseInt(m[2], 10) : 0
    return major * 1000 + minor
  }

  // Leading number anywhere early: "___ 03. xxx"
  m = s.match(/(\d{1,4})[.)\]]/)
  if (m) return parseInt(m[1], 10) * 1000

  // Stable alpha fallback (keeps relative order among unnumbered names)
  let h = 0
  const sample = s.toLocaleLowerCase('vi')
  for (let i = 0; i < Math.min(sample.length, 32); i++) {
    h = (h * 33 + sample.charCodeAt(i)) >>> 0
  }
  return 500_000 + (h % 400_000)
}

async function ensureFolderChain(
  admin: SupabaseClient,
  {
    courseKey,
    subject,
    teacherId,
    rootName,
    segments,
  }: {
    courseKey: string
    subject: string
    teacherId?: string | null
    rootName: string
    segments: string[]
  }
): Promise<string> {
  // Root folder: courseKey + empty source_path
  let parentId: string | null = null
  let pathSoFar = ''

  // Ensure root — scoped by (courseKey + subject) so each môn has its own tree root.
  // Teacher UI lists folders with .eq('subject', dbValue); a single shared root with
  // subject=toan is invisible when browsing physics/chemistry tabs.
  {
    const { data: existingRoot } = await admin
      .from('online_folders')
      .select('id')
      .eq('examhub_course_key', courseKey)
      .eq('subject', subject)
      .eq('source_path', '')
      .maybeSingle()

    if (existingRoot?.id) {
      parentId = existingRoot.id
    } else {
      const { data: created, error } = await admin
        .from('online_folders')
        .insert({
          name: rootName.slice(0, 180) || courseKey,
          parent_id: null,
          subject,
          order_index: 1,
          teacher_id: teacherId || null,
          examhub_course_key: courseKey,
          source_path: '',
        })
        .select('id')
        .single()
      if (error) throw error
      parentId = created.id
    }
  }

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]
    pathSoFar = pathSoFar ? `${pathSoFar}/${seg}` : seg
    const orderIndex = naturalOrderIndex(seg)

    const { data: existing } = await admin
      .from('online_folders')
      .select('id, order_index')
      .eq('examhub_course_key', courseKey)
      .eq('subject', subject)
      .eq('source_path', pathSoFar)
      .maybeSingle()

    if (existing?.id) {
      // Fix legacy depth-based order_index on re-import
      if (Number(existing.order_index) !== orderIndex) {
        await admin
          .from('online_folders')
          .update({ order_index: orderIndex, name: seg })
          .eq('id', existing.id)
      }
      parentId = existing.id
      continue
    }

    const { data: created, error } = await admin
      .from('online_folders')
      .insert({
        name: seg,
        parent_id: parentId,
        subject,
        order_index: orderIndex,
        teacher_id: teacherId || null,
        examhub_course_key: courseKey,
        source_path: pathSoFar,
      })
      .select('id')
      .single()
    if (error) throw error
    parentId = created.id
  }

  if (!parentId) throw new Error('Failed to resolve folder chain')
  return parentId
}

function isVideoKind(kind: string): boolean {
  return kind === 'video'
}

function isDocKind(kind: string): boolean {
  return kind === 'pdf' || kind === 'image' || kind === 'document' || kind === 'docs'
}

/**
 * Idempotent import of Bunny/Drive items into online_folders + online_lessons.
 */
export async function importOnlineStudyItems(
  admin: SupabaseClient,
  payload: ImportPayload
): Promise<ImportResult> {
  const courseKey = String(payload.courseKey || '').trim()
  const subject = String(payload.subject || '').trim()
  if (!courseKey) throw new Error('courseKey is required')
  if (!subject) throw new Error('subject is required')

  const items = Array.isArray(payload.items) ? payload.items : []
  const result: ImportResult = { created: 0, updated: 0, skipped: 0, errors: [] }
  const rootName = payload.defaultFolderName || courseKey
  // CRITICAL: store DB subject codes (math/physics/…) so teacher UI filters work
  const subjectDb = toOnlineStudyDbSubject(subject)

  for (let index = 0; index < items.length; index++) {
    const item = items[index] || {}
    try {
      const driveFileId = String(item.driveFileId || '').trim()
      const kind = String(item.kind || 'document').toLowerCase()
      const title = cleanTitle(item.title || 'Bài học')
      let rel = String(item.relativePath || '').replace(/\\/g, '/')
      // Strip long Drive package root if still present (📚 COMBO XPS … Zalo …)
      {
        const segs0 = pathSegments(rel)
        if (segs0.length >= 1) {
          const head = segs0[0]
          const looksLikeDriveRoot =
            head.length >= 40 &&
            (/combo\s*xps/i.test(head) ||
              /zalo/i.test(head) ||
              /📚/.test(head) ||
              (/thpt/i.test(head) && /2027/.test(head)))
          if (looksLikeDriveRoot) {
            rel = segs0.slice(1).join('/')
          }
        }
      }
      const segments = pathSegments(rel)

      const folderId = await ensureFolderChain(admin, {
        courseKey,
        subject: subjectDb,
        teacherId: payload.teacherId,
        rootName,
        segments,
      })

      let videoItems: MediaItem[] = []
      let docItems: MediaItem[] = []

      if (isVideoKind(kind) && item.embedUrl) {
        videoItems = [
          {
            title,
            url: normalizeMediaUrlForStorage(String(item.embedUrl)),
          },
        ]
      } else if (isDocKind(kind)) {
        const url = String(item.cdnUrl || item.embedUrl || '').trim()
        if (!url) {
          result.skipped++
          continue
        }
        docItems = [{ title, url }]
      } else {
        result.skipped++
        continue
      }

      const lessonOrder = naturalOrderIndex(title)
      const rowBase = {
        folder_id: folderId,
        title,
        description: rel || null,
        order_index: lessonOrder,
        teacher_id: payload.teacherId || null,
        source_drive_file_id: driveFileId || null,
        source_bunny_video_id: item.streamVideoId || null,
        source_remote_path: item.remotePath || null,
        source_kind: kind,
        last_synced_at: new Date().toISOString(),
        video_url: videoItems[0]?.url || null,
        document_url: docItems[0]?.url || null,
        videos: videoItems,
        documents: docItems,
      }

      // Prefer update by drive file id, else by remote path (rebuilt manifest has empty drive ids)
      let existingId: string | null = null
      let existingVideos: unknown = null
      let existingDocuments: unknown = null
      if (driveFileId) {
        const { data: existing } = await admin
          .from('online_lessons')
          .select('id, videos, documents')
          .eq('source_drive_file_id', driveFileId)
          .maybeSingle()
        if (existing?.id) {
          existingId = existing.id
          existingVideos = existing.videos
          existingDocuments = existing.documents
        }
      }
      if (!existingId && item.remotePath) {
        const { data: byPath } = await admin
          .from('online_lessons')
          .select('id, videos, documents')
          .eq('source_remote_path', String(item.remotePath))
          .maybeSingle()
        if (byPath?.id) {
          existingId = byPath.id
          existingVideos = byPath.videos
          existingDocuments = byPath.documents
        }
      }
      // Last resort: same folder + same title (fixes duplicate creates from empty driveFileId)
      if (!existingId) {
        const { data: byTitle } = await admin
          .from('online_lessons')
          .select('id, videos, documents')
          .eq('folder_id', folderId)
          .eq('title', title)
          .maybeSingle()
        if (byTitle?.id) {
          existingId = byTitle.id
          existingVideos = byTitle.videos
          existingDocuments = byTitle.documents
        }
      }

      if (existingId) {
        const prevVideos = Array.isArray(existingVideos) ? existingVideos : []
        const prevDocs = Array.isArray(existingDocuments) ? existingDocuments : []
        const nextVideos = videoItems.length > 0 ? videoItems : prevVideos
        const nextDocs = docItems.length > 0 ? docItems : prevDocs

        const { error } = await admin
          .from('online_lessons')
          .update({
            ...rowBase,
            videos: nextVideos,
            documents: nextDocs,
            video_url: nextVideos[0]?.url || null,
            document_url: nextDocs[0]?.url || null,
          })
          .eq('id', existingId)
        if (error) throw error
        result.updated++
        continue
      }

      const { error } = await admin.from('online_lessons').insert(rowBase)
      if (error) throw error
      result.created++
    } catch (err) {
      result.errors.push({
        index,
        driveFileId: item.driveFileId,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  try {
    const { data: logRow } = await admin
      .from('online_import_logs')
      .insert({
        course_key: courseKey,
        payload_summary: {
          subject,
          itemCount: items.length,
          rootName,
        },
        created_count: result.created,
        updated_count: result.updated,
        skipped_count: result.skipped,
        error_count: result.errors.length,
        errors: result.errors.slice(0, 50),
      })
      .select('id')
      .maybeSingle()
    if (logRow?.id) result.logId = logRow.id
  } catch {
    /* log table may not exist yet */
  }

  return result
}
