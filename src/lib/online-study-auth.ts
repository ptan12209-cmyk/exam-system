import { timingSafeEqual } from 'crypto'
import { SupabaseClient } from '@supabase/supabase-js'
import { ApiError } from '@/lib/api-utils'
import { ONLINE_SUBJECTS } from '@/lib/subjects'

/** Frontend catalog keys (toan, ly, …) — used in orders / grants */
export const ONLINE_SUBJECT_KEYS = new Set(
  ONLINE_SUBJECTS.map((s) => s.value as string)
)

/** DB content keys stored on online_folders.subject (math, physics, …) */
export const ONLINE_SUBJECT_DB_KEYS = new Set(
  ONLINE_SUBJECTS.map((s) => s.dbValue as string)
)

export function isValidOnlineSubjectKey(subjectKey: string): boolean {
  return ONLINE_SUBJECT_KEYS.has(subjectKey)
}

export function isValidOnlineSubjectAny(subjectKey: string): boolean {
  return ONLINE_SUBJECT_KEYS.has(subjectKey) || ONLINE_SUBJECT_DB_KEYS.has(subjectKey)
}

/** Map catalog value ↔ dbValue for entitlement checks */
export function expandSubjectAliases(subjectKey: string): string[] {
  const byValue = ONLINE_SUBJECTS.find((s) => s.value === subjectKey)
  if (byValue) return Array.from(new Set([byValue.value, byValue.dbValue]))
  const byDb = ONLINE_SUBJECTS.find((s) => s.dbValue === subjectKey)
  if (byDb) return Array.from(new Set([byDb.value, byDb.dbValue]))
  return [subjectKey]
}

export function toCatalogSubjectKey(subjectKey: string): string | null {
  if (ONLINE_SUBJECT_KEYS.has(subjectKey)) return subjectKey
  const byDb = ONLINE_SUBJECTS.find((s) => s.dbValue === subjectKey)
  return byDb?.value ?? null
}

export function getDefaultSubjectPrice(subjectKey: string): number {
  const catalog = toCatalogSubjectKey(subjectKey) || subjectKey
  const subject = ONLINE_SUBJECTS.find((s) => s.value === catalog)
  return subject?.price ?? 299000
}

/**
 * Resolve price server-side from payment_settings with catalog fallback.
 * Never trust client-provided amount.
 */
export async function getServerSubjectPrice(
  adminSupabase: SupabaseClient,
  subjectKey: string
): Promise<number> {
  if (!isValidOnlineSubjectKey(subjectKey)) {
    throw new ApiError('BAD_REQUEST', 'Mã môn học không hợp lệ', 400)
  }

  const defaultPrice = getDefaultSubjectPrice(subjectKey)

  try {
    const { data, error } = await adminSupabase
      .from('payment_settings')
      .select('value')
      .eq('key', 'settings')
      .maybeSingle()

    if (error || !data?.value) return defaultPrice

    const prices = (data.value as { prices?: Record<string, number> })?.prices
    if (prices && typeof prices[subjectKey] === 'number' && prices[subjectKey] >= 0) {
      return prices[subjectKey]
    }
  } catch {
    // fall through to default
  }

  return defaultPrice
}

/**
 * Short unique code for bank transfer matching (Casso webhook).
 * Letters+digits only so banks keep it in description.
 */
export function generatePaymentCode(length = 6): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let out = ''
  for (let i = 0; i < length; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return out
}

/**
 * Build transfer memo server-side so clients cannot forge unlock references.
 * Format: STUDYHUB {EMAIL_LOCAL} {SUBJECT} {CODE}
 * Casso matches description containing this memo + exact amount.
 */
export function buildOrderMemo(
  email: string | null | undefined,
  subjectKey: string,
  paymentCode?: string
): string {
  const local =
    (email || 'HV').split('@')[0].toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20) || 'HV'
  const subj = subjectKey.toUpperCase().replace(/[^A-Z0-9_]/g, '')
  const code = (paymentCode || generatePaymentCode()).toUpperCase().replace(/[^A-Z0-9]/g, '')
  return `STUDYHUB ${local} ${subj} ${code}`.trim()
}

/** Normalize bank description / memo for comparison */
export function normalizeBankText(text: string): string {
  return text
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * True if bank description contains the order memo tokens
 * (banks often prepend extra text to the transfer content).
 */
export function descriptionMatchesMemo(description: string, memo: string): boolean {
  const desc = normalizeBankText(description)
  const mem = normalizeBankText(memo)
  if (!desc || !mem) return false
  if (desc.includes(mem)) return true
  // All memo tokens must appear in description (order may vary slightly)
  const tokens = mem.split(' ').filter((t) => t.length >= 2)
  if (tokens.length === 0) return false
  return tokens.every((t) => desc.includes(t))
}

/**
 * Ensure the student has entitlement for a subject (purchased or teacher-assigned).
 * Teachers/admins skip this check.
 */
export async function requireOnlineSubject(
  supabase: SupabaseClient,
  userId: string,
  subjectKey: string,
  options?: { allowTeacher?: boolean }
): Promise<void> {
  if (!isValidOnlineSubjectAny(subjectKey) && subjectKey !== 'all') {
    throw new ApiError('BAD_REQUEST', 'Mã môn học không hợp lệ', 400)
  }

  if (options?.allowTeacher !== false) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (profile?.role === 'teacher' || profile?.role === 'admin') {
      return
    }
  }

  const { data: rows, error } = await supabase
    .from('student_online_subjects')
    .select('subject')
    .eq('student_id', userId)

  if (error) throw error

  const subjects = (rows || []).map((r) => r.subject)
  if (subjects.includes('all')) return

  const aliases = expandSubjectAliases(subjectKey)
  if (aliases.some((a) => subjects.includes(a))) {
    return
  }

  throw new ApiError(
    'SUBJECT_LOCKED',
    'Bạn chưa được mở khóa môn học này',
    403
  )
}

/**
 * Constant-time string compare for webhook secrets.
 */
export function safeEqualSecret(provided: string, expected: string): boolean {
  if (!provided || !expected) return false
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
