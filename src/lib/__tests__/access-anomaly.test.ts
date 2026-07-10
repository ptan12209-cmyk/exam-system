import { describe, it, expect } from 'vitest'
import { detectAccessAnomalies } from '../access-anomaly'

describe('detectAccessAnomalies', () => {
  const now = Date.parse('2026-07-11T12:00:00.000Z')

  it('flags multi-ip accounts', () => {
    const logs = [
      { user_id: 'u1', ip: '1.1.1.1', action: 'playback', created_at: '2026-07-11T11:00:00.000Z' },
      { user_id: 'u1', ip: '2.2.2.2', action: 'playback', created_at: '2026-07-11T11:10:00.000Z' },
      { user_id: 'u1', ip: '3.3.3.3', action: 'document', created_at: '2026-07-11T11:20:00.000Z' },
    ]
    const a = detectAccessAnomalies(logs, { multiIpThreshold: 3 }, now)
    expect(a.some((x) => x.kind === 'multi_ip' && x.user_id === 'u1')).toBe(true)
  })

  it('flags high volume', () => {
    const logs = Array.from({ length: 90 }, (_, i) => ({
      user_id: 'u2',
      ip: '9.9.9.9',
      action: 'playback',
      created_at: new Date(now - i * 60_000).toISOString(),
    }))
    const a = detectAccessAnomalies(logs, { highVolumeThreshold: 80 }, now)
    expect(a.some((x) => x.kind === 'high_volume')).toBe(true)
  })

  it('flags burst in 10 minutes', () => {
    const logs = Array.from({ length: 30 }, (_, i) => ({
      user_id: 'u3',
      ip: '8.8.8.8',
      action: 'playback',
      created_at: new Date(now - i * 10_000).toISOString(),
    }))
    const a = detectAccessAnomalies(logs, { burstThreshold: 25 }, now)
    expect(a.some((x) => x.kind === 'burst')).toBe(true)
  })

  it('ignores old events outside window', () => {
    const logs = [
      { user_id: 'u4', ip: '1.1.1.1', action: 'playback', created_at: '2026-06-01T00:00:00.000Z' },
      { user_id: 'u4', ip: '2.2.2.2', action: 'playback', created_at: '2026-06-01T01:00:00.000Z' },
      { user_id: 'u4', ip: '3.3.3.3', action: 'playback', created_at: '2026-06-01T02:00:00.000Z' },
    ]
    const a = detectAccessAnomalies(logs, { multiIpThreshold: 3, windowHours: 24 }, now)
    expect(a).toHaveLength(0)
  })
})
