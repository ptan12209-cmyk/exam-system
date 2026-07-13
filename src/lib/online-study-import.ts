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

const VI_DIACRITIC =
  /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/

/** Count “bad” display chars that make titles look broken on web. */
function countBadDisplayChars(s: string): number {
  let n = 0
  for (const ch of s) {
    if (ch === '?' || ch === '\uFFFD' || ch === '�') n++
    // private-use / replacement-looking
    const c = ch.charCodeAt(0)
    if (c === 0xfffd) n++
  }
  return n
}

/**
 * Repair common UTF-8 mojibake (e.g. "MÃ”N" → "MÔN") and normalize NFC.
 * Does not invent Vietnamese for ASCII-only Drive names (t_i_li_u…).
 */
export function repairDisplayText(input: string): string {
  let s = String(input || '')
  if (!s) return s
  // Strip UTF-8 BOM / zero-width junk
  s = s.replace(/^\uFEFF/, '').replace(/[\u200B-\u200D\uFEFF]/g, '')

  const looksMojibake =
    /Ã[\x80-\xBF]|Ä[\x80-\xBF]|Å[\x80-\xBF]|Æ[\x80-\xBF]|Â[\x80-\xBF]|â€|â€™|â€œ|ðŸ/.test(s) ||
    /MÃ.|TIÃ.|LÃ.|HÃ.|Äá»|Æ°á»/.test(s)

  if (looksMojibake) {
    try {
      // mis-decoded as latin1/windows-1252 → re-interpret bytes as utf8
      const bytes = Uint8Array.from(Array.from(s, (ch) => ch.charCodeAt(0) & 0xff))
      const fixed = new TextDecoder('utf-8', { fatal: false }).decode(bytes)
      if (
        countBadDisplayChars(fixed) < countBadDisplayChars(s) ||
        (VI_DIACRITIC.test(fixed) && !VI_DIACRITIC.test(s))
      ) {
        s = fixed
      }
    } catch {
      /* keep original */
    }
  }

  // NFC so ê + combining ≠ precomposed mismatch / missing-glyph surprises
  try {
    s = s.normalize('NFC')
  } catch {
    /* ignore */
  }
  return s
}

function cleanTitle(name: string): string {
  const repaired = repairDisplayText(name)
  return (
    repaired
      .replace(/^📚\s*/u, '')
      .trim()
      .slice(0, 200) || 'Bài học'
  )
}

function pathSegments(relativePath: string): string[] {
  return String(relativePath || '')
    .replace(/\\/g, '/')
    .split('/')
    .map((s) => repairDisplayText(s).trim())
    .filter(Boolean)
    .map((s) => s.slice(0, 180))
}

/** Prefer a label with fewer ?/� and more Vietnamese when re-importing. */
function shouldRefreshStoredName(current: string, incoming: string): boolean {
  const a = String(current || '')
  const b = String(incoming || '')
  if (!b || a === b) return false
  const badA = countBadDisplayChars(a)
  const badB = countBadDisplayChars(b)
  if (badB < badA) return true
  if (badA === badB && VI_DIACRITIC.test(b) && !VI_DIACRITIC.test(a)) return true
  // Same quality but different spelling after repair — refresh
  if (badA === 0 && badB === 0 && a.normalize('NFC') !== b.normalize('NFC')) return true
  return false
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
    const rootLabel = repairDisplayText(rootName).slice(0, 180) || courseKey
    const { data: existingRoot } = await admin
      .from('online_folders')
      .select('id, name')
      .eq('examhub_course_key', courseKey)
      .eq('subject', subject)
      .eq('source_path', '')
      .maybeSingle()

    if (existingRoot?.id) {
      if (shouldRefreshStoredName(String(existingRoot.name || ''), rootLabel)) {
        await admin.from('online_folders').update({ name: rootLabel }).eq('id', existingRoot.id)
      }
      parentId = existingRoot.id
    } else {
      const { data: created, error } = await admin
        .from('online_folders')
        .insert({
          name: rootLabel,
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
      .select('id, order_index, name')
      .eq('examhub_course_key', courseKey)
      .eq('subject', subject)
      .eq('source_path', pathSoFar)
      .maybeSingle()

    if (existing?.id) {
      const patch: { order_index?: number; name?: string } = {}
      // Fix legacy depth-based order_index on re-import
      if (Number(existing.order_index) !== orderIndex) {
        patch.order_index = orderIndex
      }
      // Refresh mojibake / "?" labels when a cleaner UTF-8 name arrives
      if (shouldRefreshStoredName(String(existing.name || ''), seg)) {
        patch.name = seg
      }
      if (Object.keys(patch).length) {
        await admin.from('online_folders').update(patch).eq('id', existing.id)
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
      // Strip leading mon folder ("01. MÔN TOÁN 2009") so video + PDF share one tree.
      // Without this, videos land in a duplicate folder path under the mon name
      // while PDFs (imported without mon prefix) sit in a sibling folder of the same label.
      {
        const segs1 = pathSegments(rel)
        if (segs1.length >= 2) {
          const head = segs1[0]
          const looksLikeMonFolder =
            /^0?\d{1,2}\.\s*m[oô]n\b/i.test(head) ||
            /^m[oô]n\s+(to[aá]n|l[yý]|h[oó]a|sinh|anh|v[aă]n)/i.test(head) ||
            /khoa\s*h[oọ]c\s*x[aã]\s*h[oộ]i/i.test(head)
          if (looksLikeMonFolder) {
            rel = segs1.slice(1).join('/')
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
