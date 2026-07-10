import { describe, it, expect, vi, afterEach } from 'vitest'
import { ApiError, handleApiError } from '../api-utils'

describe('handleApiError', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns ApiError code and message with status', () => {
    const result = handleApiError(new ApiError('FORBIDDEN', 'No access', 403))
    expect(result.status).toBe(403)
    expect(result.response.error?.code).toBe('FORBIDDEN')
    expect(result.response.error?.message).toBe('No access')
  })

  it('hides internal messages in production', () => {
    vi.stubEnv('NODE_ENV', 'production')
    const result = handleApiError(new Error('relation "secret_table" does not exist'))
    expect(result.status).toBe(500)
    expect(result.response.error?.message).toBe('Internal server error')
    expect(result.response.error?.message).not.toContain('secret_table')
  })
})
