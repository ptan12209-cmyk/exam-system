import { describe, it, expect } from 'vitest'
import {
  descriptionMatchesMemo,
  normalizeBankText,
  buildOrderMemo,
} from '../online-study-auth'
import { parseCassoTransactions } from '../casso-webhook'

describe('Casso memo matching', () => {
  it('normalizes bank text', () => {
    expect(normalizeBankText('  StudyHub  hv1  toan  ')).toBe('STUDYHUB HV1 TOAN')
  })

  it('matches when bank prepends extra text', () => {
    const memo = buildOrderMemo('student@gmail.com', 'toan', 'AB12CD')
    const desc = `MBVCB 123456 ${memo} chuyen tien`
    expect(descriptionMatchesMemo(desc, memo)).toBe(true)
  })

  it('rejects wrong subject or code', () => {
    const memo = buildOrderMemo('student@gmail.com', 'toan', 'AB12CD')
    expect(descriptionMatchesMemo('STUDYHUB STUDENT LY AB12CD', memo)).toBe(false)
    expect(descriptionMatchesMemo('STUDYHUB STUDENT TOAN ZZ9999', memo)).toBe(false)
  })

  it('parses array and single data payloads', () => {
    expect(
      parseCassoTransactions({
        error: 0,
        data: [{ id: 1, amount: 1000, description: 'x' }],
      })
    ).toHaveLength(1)
    expect(
      parseCassoTransactions({
        error: 0,
        data: { id: 2, amount: 2000, description: 'y' },
      })
    ).toHaveLength(1)
    expect(parseCassoTransactions({ error: 0, data: null })).toHaveLength(0)
  })
})
