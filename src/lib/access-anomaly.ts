/**
 * V4c — detect suspicious content-access patterns from audit rows.
 * Pure functions (unit-testable). Thresholds are intentionally simple.
 */

export type AccessLogLike = {
  user_id: string | null
  ip: string | null
  action: string
  created_at: string
  lesson_id?: string | null
}

export type AnomalyKind = 'multi_ip' | 'high_volume' | 'burst'

export type AccessAnomaly = {
  kind: AnomalyKind
  severity: 'medium' | 'high'
  user_id: string
  message: string
  detail: {
    unique_ips?: number
    ips?: string[]
    event_count?: number
    window_hours?: number
    burst_count?: number
  }
}

const DEFAULTS = {
  /** Distinct IPs per user in window → multi_ip */
  multiIpThreshold: 3,
  /** Events per user in window → high_volume */
  highVolumeThreshold: 80,
  /** Events in a 10-minute bucket → burst */
  burstThreshold: 25,
  windowHours: 24,
}

export type AnomalyOptions = Partial<typeof DEFAULTS>

function isWithinHours(iso: string, hours: number, nowMs: number): boolean {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return false
  return nowMs - t <= hours * 3600_000
}

/**
 * Compute anomalies for a batch of recent access logs.
 */
export function detectAccessAnomalies(
  logs: AccessLogLike[],
  options: AnomalyOptions = {},
  nowMs = Date.now()
): AccessAnomaly[] {
  const cfg = { ...DEFAULTS, ...options }
  const recent = logs.filter(
    (l) => l.user_id && isWithinHours(l.created_at, cfg.windowHours, nowMs)
  )

  const byUser = new Map<string, AccessLogLike[]>()
  for (const row of recent) {
    const uid = row.user_id as string
    const list = byUser.get(uid) || []
    list.push(row)
    byUser.set(uid, list)
  }

  const anomalies: AccessAnomaly[] = []

  for (const [userId, rows] of byUser) {
    const ips = Array.from(
      new Set(
        rows
          .map((r) => (r.ip || '').trim())
          .filter((ip) => ip && ip !== 'unknown')
      )
    )

    if (ips.length >= cfg.multiIpThreshold) {
      anomalies.push({
        kind: 'multi_ip',
        severity: ips.length >= cfg.multiIpThreshold + 2 ? 'high' : 'medium',
        user_id: userId,
        message: `Cùng tài khoản truy cập từ ${ips.length} IP khác nhau trong ${cfg.windowHours}h`,
        detail: {
          unique_ips: ips.length,
          ips: ips.slice(0, 12),
          event_count: rows.length,
          window_hours: cfg.windowHours,
        },
      })
    }

    if (rows.length >= cfg.highVolumeThreshold) {
      anomalies.push({
        kind: 'high_volume',
        severity: rows.length >= cfg.highVolumeThreshold * 2 ? 'high' : 'medium',
        user_id: userId,
        message: `${rows.length} lượt phát/mở tài liệu trong ${cfg.windowHours}h (ngưỡng ${cfg.highVolumeThreshold})`,
        detail: {
          event_count: rows.length,
          window_hours: cfg.windowHours,
        },
      })
    }

    // Burst: max events in any 10-minute window
    const times = rows
      .map((r) => new Date(r.created_at).getTime())
      .filter((t) => !Number.isNaN(t))
      .sort((a, b) => a - b)

    let maxBurst = 0
    let j = 0
    for (let i = 0; i < times.length; i++) {
      while (times[i] - times[j] > 10 * 60_000) j++
      maxBurst = Math.max(maxBurst, i - j + 1)
    }

    if (maxBurst >= cfg.burstThreshold) {
      anomalies.push({
        kind: 'burst',
        severity: maxBurst >= cfg.burstThreshold * 2 ? 'high' : 'medium',
        user_id: userId,
        message: `Burst ${maxBurst} sự kiện trong 10 phút (có thể scrape/chia sẻ tài khoản)`,
        detail: {
          burst_count: maxBurst,
          event_count: rows.length,
        },
      })
    }
  }

  // High severity first
  return anomalies.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === 'high' ? -1 : 1
    return (b.detail.event_count || 0) - (a.detail.event_count || 0)
  })
}
