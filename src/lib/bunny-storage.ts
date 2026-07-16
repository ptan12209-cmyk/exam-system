/**
 * Bunny Storage helpers — used when public Pull Zone CDN is down / unresolvable.
 * Env:
 *   BUNNY_STORAGE_ZONE
 *   BUNNY_STORAGE_ACCESS_KEY
 *   BUNNY_STORAGE_HOST (e.g. sg.storage.bunnycdn.com)
 *   BUNNY_CDN_BASE_URL (optional, e.g. https://studyhubx-tailieu.b-cdn.net)
 */

export function isBunnyCdnUrl(url: string): boolean {
  try {
    const u = new URL(url)
    if (u.hostname.endsWith('.b-cdn.net')) return true
    const base = process.env.BUNNY_CDN_BASE_URL || ''
    if (base) {
      try {
        if (u.hostname === new URL(base).hostname) return true
      } catch {
        /* ignore */
      }
    }
    return false
  } catch {
    return false
  }
}

/** Path inside storage zone, e.g. courses/docs/... */
export function bunnyCdnUrlToStoragePath(url: string): string | null {
  try {
    const u = new URL(url)
    if (!isBunnyCdnUrl(url) && !u.pathname.includes('/courses/')) {
      return null
    }
    return decodeURIComponent(u.pathname.replace(/^\/+/, ''))
  } catch {
    return null
  }
}

export function encodeBunnyStoragePath(path: string): string {
  return path
    .replace(/^\/+/, '')
    .split('/')
    .filter(Boolean)
    .map((seg) => encodeURIComponent(seg))
    .join('/')
}

export function bunnyStorageConfigured(): boolean {
  return Boolean(
    process.env.BUNNY_STORAGE_ZONE?.trim() &&
      process.env.BUNNY_STORAGE_ACCESS_KEY?.trim()
  )
}

/**
 * Fetch a file from Bunny Storage by zone-relative path.
 * Returns the upstream Response (stream body) or null if not configured / failed.
 */
export async function fetchBunnyStorageFile(
  storagePath: string,
  init?: RequestInit
): Promise<Response | null> {
  const zone = process.env.BUNNY_STORAGE_ZONE?.trim()
  const key = process.env.BUNNY_STORAGE_ACCESS_KEY?.trim()
  const host =
    process.env.BUNNY_STORAGE_HOST?.trim() || 'storage.bunnycdn.com'
  if (!zone || !key || !storagePath) return null

  const enc = encodeBunnyStoragePath(storagePath)
  const url = `https://${host}/${zone}/${enc}`
  try {
    const res = await fetch(url, {
      ...init,
      headers: {
        AccessKey: key,
        Accept: '*/*',
        ...(init?.headers || {}),
      },
      // large PDFs
      cache: 'no-store',
    })
    return res
  } catch {
    return null
  }
}

/**
 * Prefer Storage when URL is our Bunny CDN (pull zone may be DNS-broken).
 */
export async function fetchDocumentUpstream(url: string): Promise<{
  res: Response | null
  via: 'storage' | 'cdn' | 'none'
}> {
  if (isBunnyCdnUrl(url) && bunnyStorageConfigured()) {
    const path = bunnyCdnUrlToStoragePath(url)
    if (path) {
      const res = await fetchBunnyStorageFile(path)
      if (res && res.ok) return { res, via: 'storage' }
    }
  }

  try {
    const res = await fetch(url, {
      cache: 'no-store',
      headers: { Accept: '*/*' },
      redirect: 'follow',
    })
    if (res.ok) return { res, via: 'cdn' }
  } catch {
    /* fall through */
  }

  // last resort storage even if hostname not recognized as CDN
  if (bunnyStorageConfigured()) {
    try {
      const u = new URL(url)
      const path = decodeURIComponent(u.pathname.replace(/^\/+/, ''))
      if (path.startsWith('courses/')) {
        const res = await fetchBunnyStorageFile(path)
        if (res && res.ok) return { res, via: 'storage' }
      }
    } catch {
      /* ignore */
    }
  }

  return { res: null, via: 'none' }
}
