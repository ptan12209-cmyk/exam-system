/**
 * Tiny client SWR-style cache (sessionStorage) for catalog fetches.
 * Not for auth secrets or media URLs.
 */

type CacheEntry<T> = { at: number; data: T }

const memory = new Map<string, CacheEntry<unknown>>()

export function cacheGet<T>(key: string, maxAgeMs: number): T | null {
  const now = Date.now()
  const mem = memory.get(key) as CacheEntry<T> | undefined
  if (mem && now - mem.at <= maxAgeMs) return mem.data

  if (typeof sessionStorage === "undefined") return null
  try {
    const raw = sessionStorage.getItem(`swr:${key}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CacheEntry<T>
    if (!parsed?.at || now - parsed.at > maxAgeMs) return null
    memory.set(key, parsed)
    return parsed.data
  } catch {
    return null
  }
}

export function cacheSet<T>(key: string, data: T): void {
  const entry: CacheEntry<T> = { at: Date.now(), data }
  memory.set(key, entry)
  if (typeof sessionStorage === "undefined") return
  try {
    sessionStorage.setItem(`swr:${key}`, JSON.stringify(entry))
  } catch {
    /* quota */
  }
}

export function cacheInvalidate(prefix: string): void {
  for (const k of memory.keys()) {
    if (k.startsWith(prefix)) memory.delete(k)
  }
  if (typeof sessionStorage === "undefined") return
  try {
    const keys: string[] = []
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i)
      if (k?.startsWith(`swr:${prefix}`)) keys.push(k)
    }
    keys.forEach((k) => sessionStorage.removeItem(k))
  } catch {
    /* ignore */
  }
}
