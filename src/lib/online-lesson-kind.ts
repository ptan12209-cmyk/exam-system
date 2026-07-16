/**
 * Classify online_lessons for UI labels:
 * - video / lecture → "Bài giảng"
 * - pdf / document → "Tài liệu"
 */

export type OnlineLessonMediaKind = "video" | "document" | "mixed" | "unknown"

export type LessonMediaLike = {
  title?: string | null
  source_kind?: string | null
  video_url?: string | null
  document_url?: string | null
  videos?: Array<{ title?: string; url?: string }> | null
  documents?: Array<{ title?: string; url?: string }> | null
  has_video?: boolean | null
  has_documents?: boolean | null
}

export function lessonHasVideo(lesson: LessonMediaLike): boolean {
  if (lesson.has_video) return true
  if (lesson.video_url) return true
  if (Array.isArray(lesson.videos) && lesson.videos.some((v) => String(v?.url || "").trim())) {
    return true
  }
  return false
}

export function lessonHasDocument(lesson: LessonMediaLike): boolean {
  if (lesson.has_documents) return true
  if (lesson.document_url) return true
  if (
    Array.isArray(lesson.documents) &&
    lesson.documents.some((d) => String(d?.url || "").trim())
  ) {
    return true
  }
  return false
}

export function getOnlineLessonMediaKind(lesson: LessonMediaLike): OnlineLessonMediaKind {
  const kind = String(lesson.source_kind || "").toLowerCase()
  const hasV = lessonHasVideo(lesson)
  const hasD = lessonHasDocument(lesson)
  const titlePdf = /\.pdf$/i.test(String(lesson.title || ""))

  if (kind === "video") return hasD && !hasV ? "document" : hasD ? "mixed" : "video"
  if (kind === "pdf" || kind === "document" || kind === "docs" || kind === "image") {
    return hasV && !hasD ? "video" : hasV ? "mixed" : "document"
  }

  if (hasV && hasD) return "mixed"
  if (hasV) return "video"
  if (hasD || titlePdf) return "document"
  if (titlePdf) return "document"
  return "unknown"
}

/** Short label for list rows / badges */
export function getOnlineLessonTypeLabel(lesson: LessonMediaLike): string {
  const k = getOnlineLessonMediaKind(lesson)
  if (k === "document") return "Tài liệu"
  if (k === "video") return "Bài giảng"
  if (k === "mixed") return "Bài giảng + Tài liệu"
  return "Nội dung"
}

export function isDocumentLesson(lesson: LessonMediaLike): boolean {
  return getOnlineLessonMediaKind(lesson) === "document"
}

export function isVideoLesson(lesson: LessonMediaLike): boolean {
  const k = getOnlineLessonMediaKind(lesson)
  return k === "video" || k === "mixed"
}
