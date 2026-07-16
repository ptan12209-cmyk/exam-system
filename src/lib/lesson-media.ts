import { createHash } from 'crypto'

export type MediaItem = { title: string; url: string }

export interface LessonMediaRow {
  id: string
  folder_id: string
  title: string
  description?: string | null
  order_index?: number
  video_url?: string | null
  document_url?: string | null
  videos?: MediaItem[] | null
  documents?: MediaItem[] | null
  [key: string]: unknown
}

/** Public list item — no raw media URLs for students */
export function sanitizeLessonForCatalog(lesson: LessonMediaRow) {
  const videos = Array.isArray(lesson.videos) ? lesson.videos : []
  const documents = Array.isArray(lesson.documents) ? lesson.documents : []
  const hasVideo = videos.length > 0 || !!lesson.video_url
  const hasDocuments = documents.length > 0 || !!lesson.document_url

  const sourceKind =
    typeof lesson.source_kind === 'string' ? lesson.source_kind : null

  return {
    id: lesson.id,
    folder_id: lesson.folder_id,
    title: lesson.title,
    description: lesson.description ?? null,
    order_index: lesson.order_index ?? 1,
    // For UI: video = bài giảng, pdf = tài liệu
    source_kind: sourceKind,
    has_video: hasVideo,
    video_count: videos.length || (lesson.video_url ? 1 : 0),
    has_documents: hasDocuments,
    document_count: documents.length || (lesson.document_url ? 1 : 0),
    // Titles only — no URLs
    video_titles: videos.map((v, i) => v.title || `Video ${i + 1}`),
    document_titles: documents.map((d, i) => d.title || `Tài liệu ${i + 1}`),
  }
}

/**
 * Normalize media URL for storage:
 * - Bunny play → embed
 * - strip token/expires so server can re-sign on playback
 */
export function normalizeMediaUrlForStorage(url: string): string {
  if (!url || typeof url !== 'string') return url
  const trimmed = url.trim()
  if (!trimmed) return trimmed

  try {
    let working = trimmed

    if (working.includes('mediadelivery.net') || working.includes('bunny.net')) {
      if (working.includes('/play/')) {
        const parts = working.split('/play/')
        if (parts.length === 2) {
          const rest = parts[1].split('?')[0]
          working = `https://iframe.mediadelivery.net/embed/${rest}`
        }
      }

      const u = new URL(working.startsWith('http') ? working : `https://${working}`)
      u.searchParams.delete('token')
      u.searchParams.delete('expires')
      // Prefer clean embed base + non-auth query (autoplay etc.)
      return u.toString()
    }

    return trimmed
  } catch {
    return trimmed
  }
}

export function normalizeMediaItemsForStorage(
  items: MediaItem[] | null | undefined
): MediaItem[] {
  if (!Array.isArray(items)) return []
  return items
    .filter((i) => i && typeof i.url === 'string' && i.url.trim())
    .map((i) => ({
      title: (i.title || '').trim() || 'Media',
      url: normalizeMediaUrlForStorage(i.url),
    }))
}

/**
 * Optional Bunny Stream token auth.
 * Env: BUNNY_STREAM_TOKEN_KEY (security key from library)
 * If set, embed URLs for mediadelivery.net get token+expires.
 * @see https://docs.bunny.net/docs/stream-embed-token-authentication
 */
export function maybeSignBunnyEmbedUrl(url: string, ttlSeconds = 3600): string {
  const key = process.env.BUNNY_STREAM_TOKEN_KEY
  if (!key || !url) return url

  try {
    let path = url
    if (url.includes('/play/')) {
      const parts = url.split('/play/')
      if (parts.length === 2) {
        const rest = parts[1].split('?')[0]
        path = `https://iframe.mediadelivery.net/embed/${rest}`
      }
    }
    const m = path.match(
      /iframe\.mediadelivery\.net\/embed\/(\d+)\/([a-f0-9-]+)/i
    )
    if (!m) return url

    const libraryId = m[1]
    const videoId = m[2]
    const expires = Math.floor(Date.now() / 1000) + ttlSeconds
    // token = SHA256_HEX(token_security_key + video_id + expiration)
    const token = createHash('sha256')
      .update(key + videoId + expires)
      .digest('hex')

    const base = `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}`
    const u = new URL(base)
    // preserve existing query except token/expires
    try {
      const orig = new URL(path.startsWith('http') ? path : url)
      orig.searchParams.forEach((v, k) => {
        if (k !== 'token' && k !== 'expires') u.searchParams.set(k, v)
      })
    } catch {
      /* ignore */
    }
    u.searchParams.set('token', token)
    u.searchParams.set('expires', String(expires))
    return u.toString()
  } catch {
    return url
  }
}

export function buildPlaybackPayload(lesson: LessonMediaRow) {
  let videos: MediaItem[] =
    Array.isArray(lesson.videos) && lesson.videos.length > 0
      ? lesson.videos.map((v) => ({
          title: v.title || 'Video',
          url: maybeSignBunnyEmbedUrl(v.url),
        }))
      : []

  if (videos.length === 0 && lesson.video_url) {
    videos = [
      {
        title: 'Video bài học',
        url: maybeSignBunnyEmbedUrl(lesson.video_url),
      },
    ]
  }

  let documents: MediaItem[] =
    Array.isArray(lesson.documents) && lesson.documents.length > 0
      ? lesson.documents.map((d) => ({
          title: d.title || 'Tài liệu',
          url: d.url,
        }))
      : []

  if (documents.length === 0 && lesson.document_url) {
    documents = [{ title: 'Tài liệu học tập', url: lesson.document_url }]
  }

  return {
    lesson_id: lesson.id,
    title: lesson.title,
    description: lesson.description ?? null,
    videos,
    documents,
    expires_in: process.env.BUNNY_STREAM_TOKEN_KEY ? 3600 : null,
  }
}
