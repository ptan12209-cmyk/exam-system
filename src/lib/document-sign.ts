import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Parse Supabase Storage object URL → bucket + path.
 * Supports public and signed object paths.
 */
export function parseSupabaseStorageUrl(
  url: string
): { bucket: string; path: string } | null {
  if (!url || typeof url !== 'string') return null
  try {
    const u = new URL(url)
    // /storage/v1/object/public/{bucket}/{path}
    // /storage/v1/object/sign/{bucket}/{path}
    // /storage/v1/object/authenticated/{bucket}/{path}
    const m = u.pathname.match(
      /\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/(.+)$/
    )
    if (!m) return null
    return {
      bucket: decodeURIComponent(m[1]),
      path: decodeURIComponent(m[2]),
    }
  } catch {
    return null
  }
}

export function isSupabaseStorageUrl(url: string): boolean {
  return parseSupabaseStorageUrl(url) !== null
}

/**
 * Issue a short-lived signed URL for Supabase Storage objects.
 * External URLs (Bunny CDN, Drive, etc.) are returned unchanged —
 * use the document proxy API for audit on those.
 */
export async function maybeSignDocumentUrl(
  admin: SupabaseClient,
  url: string,
  ttlSeconds = 3600
): Promise<{ url: string; signed: boolean; expires_in: number | null }> {
  const parsed = parseSupabaseStorageUrl(url)
  if (!parsed) {
    return { url, signed: false, expires_in: null }
  }

  try {
    const { data, error } = await admin.storage
      .from(parsed.bucket)
      .createSignedUrl(parsed.path, ttlSeconds)

    if (error || !data?.signedUrl) {
      // Fall back to original (may still work if public bucket)
      return { url, signed: false, expires_in: null }
    }

    return {
      url: data.signedUrl,
      signed: true,
      expires_in: ttlSeconds,
    }
  } catch {
    return { url, signed: false, expires_in: null }
  }
}

export async function signDocumentList(
  admin: SupabaseClient,
  documents: Array<{ title: string; url: string }>,
  ttlSeconds = 3600
): Promise<{
  documents: Array<{ title: string; url: string; signed?: boolean }>
  any_signed: boolean
  expires_in: number | null
}> {
  let anySigned = false
  let expires: number | null = null

  const out = []
  for (const doc of documents) {
    const r = await maybeSignDocumentUrl(admin, doc.url, ttlSeconds)
    if (r.signed) {
      anySigned = true
      expires = r.expires_in
    }
    out.push({
      title: doc.title,
      url: r.url,
      signed: r.signed,
    })
  }

  return {
    documents: out,
    any_signed: anySigned,
    expires_in: anySigned ? expires : null,
  }
}
