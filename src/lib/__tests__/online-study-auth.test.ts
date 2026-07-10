import { describe, it, expect } from 'vitest'
import {
  isValidOnlineSubjectKey,
  isValidOnlineSubjectAny,
  expandSubjectAliases,
  toCatalogSubjectKey,
  getDefaultSubjectPrice,
  buildOrderMemo,
  safeEqualSecret,
} from '../online-study-auth'

describe('online-study-auth helpers', () => {
  it('validates catalog subject keys only for orders', () => {
    expect(isValidOnlineSubjectKey('toan')).toBe(true)
    expect(isValidOnlineSubjectKey('math')).toBe(false)
    expect(isValidOnlineSubjectAny('math')).toBe(true)
    expect(isValidOnlineSubjectAny('fake')).toBe(false)
  })

  it('expands aliases between catalog and db keys', () => {
    expect(expandSubjectAliases('toan')).toEqual(expect.arrayContaining(['toan', 'math']))
    expect(expandSubjectAliases('math')).toEqual(expect.arrayContaining(['toan', 'math']))
    expect(toCatalogSubjectKey('physics')).toBe('ly')
    expect(toCatalogSubjectKey('ly')).toBe('ly')
  })

  it('returns catalog default prices', () => {
    expect(getDefaultSubjectPrice('toan')).toBe(299000)
    expect(getDefaultSubjectPrice('van')).toBe(199000)
    expect(getDefaultSubjectPrice('dgnl_hsa')).toBe(499000)
  })

  it('builds server-side memo without client input', () => {
    const memo = buildOrderMemo('student.name@gmail.com', 'toan')
    expect(memo).toBe('STUDYHUB STUDENTNAME TOAN')
    expect(buildOrderMemo(null, 'ly')).toMatch(/^STUDYHUB HV LY$/)
  })

  it('compares secrets in constant time', () => {
    expect(safeEqualSecret('abc', 'abc')).toBe(true)
    expect(safeEqualSecret('abc', 'abd')).toBe(false)
    expect(safeEqualSecret('', 'x')).toBe(false)
    expect(safeEqualSecret('short', 'longer')).toBe(false)
  })
})
