import { describe, it, expect } from 'vitest'
import { parseSupabaseStorageUrl, isSupabaseStorageUrl } from '../document-sign'

describe('document-sign', () => {
  it('parses public storage url', () => {
    const u =
      'https://abc.supabase.co/storage/v1/object/public/lesson-docs/toan/de1.pdf'
    const p = parseSupabaseStorageUrl(u)
    expect(p).toEqual({ bucket: 'lesson-docs', path: 'toan/de1.pdf' })
    expect(isSupabaseStorageUrl(u)).toBe(true)
  })

  it('parses signed storage url path', () => {
    const u =
      'https://abc.supabase.co/storage/v1/object/sign/private-docs/a/b.pdf?token=xyz'
    const p = parseSupabaseStorageUrl(u)
    expect(p?.bucket).toBe('private-docs')
    expect(p?.path).toBe('a/b.pdf')
  })

  it('returns null for non-storage urls', () => {
    expect(parseSupabaseStorageUrl('https://iframe.mediadelivery.net/embed/1/x')).toBeNull()
    expect(parseSupabaseStorageUrl('https://drive.google.com/file/d/x')).toBeNull()
  })
})
