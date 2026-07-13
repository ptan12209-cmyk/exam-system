import { createHash } from 'crypto'

const FRONTEND_TO_DB: Record<string, string> = {
  toan: 'math',
  ly: 'physics',
  hoa: 'chemistry',
  sinh: 'biology',
  anh: 'english',
  van: 'literature',
  su: 'history',
  dia: 'geography',
  ktpl: 'civic_education',
  gdcd: 'civic_education',
  dgnl_hsa: 'dgnl_hsa',
  dgnl_tsa: 'dgnl_tsa',
  dgnl_vact: 'dgnl_vact',
  dgnl_sp: 'dgnl_sp',
  math: 'math',
  physics: 'physics',
  chemistry: 'chemistry',
  biology: 'biology',
  english: 'english',
  literature: 'literature',
  history: 'history',
  geography: 'geography',
  civic_education: 'civic_education',
}

function toDb(subject: string): string {
  const s = String(subject || '').trim()
  if (!s) return 'unknown'
  if (FRONTEND_TO_DB[s]) return FRONTEND_TO_DB[s]
  const lower = s.toLowerCase()
  if (FRONTEND_TO_DB[lower]) return FRONTEND_TO_DB[lower]
  return lower
}

function nfc(s: string): string {
  return String(s || '')
    .normalize('NFC')
    .replace(/\\/g, '/')
    .replace(/\s+/g, ' ')
    .trim()
}

function sha1Hex(s: string): string {
  return createHash('sha1').update(nfc(s), 'utf8').digest('hex')
}

export function buildRootFolderKey(courseKey: string, subjectFrontendOrDb: string): string {
  const course = nfc(courseKey) || 'course'
  const db = toDb(subjectFrontendOrDb)
  return `f:${course}:${db}:root`
}

export function buildFolderKey(
  courseKey: string,
  subjectFrontendOrDb: string,
  canonicalRelativePath: string
): string {
  const course = nfc(courseKey) || 'course'
  const db = toDb(subjectFrontendOrDb)
  const rel = nfc(canonicalRelativePath).replace(/^\/+|\/+$/g, '')
  if (!rel) return buildRootFolderKey(courseKey, subjectFrontendOrDb)
  return `f:${course}:${db}:${sha1Hex(rel)}`
}

export function buildLessonContentKey(opts: {
  kind?: string
  driveFileId?: string
  streamVideoId?: string
  streamLibraryId?: string
  remotePath?: string
}): string {
  const isVideo = String(opts.kind || '').toLowerCase() === 'video'
  const drive = String(opts.driveFileId || '').trim()
  const vid = String(opts.streamVideoId || '').trim()
  const lib = String(opts.streamLibraryId || '').trim()
  const remote = String(opts.remotePath || '').trim()

  if (isVideo) {
    if (vid) return `v:stream:${lib || 'lib'}:${vid}`
    if (drive) return `v:drive:${drive}`
    if (remote) return `v:bunny:${sha1Hex(remote)}`
    return ''
  }
  if (drive) return `d:drive:${drive}`
  if (remote) return `d:bunny:${sha1Hex(remote)}`
  return ''
}
