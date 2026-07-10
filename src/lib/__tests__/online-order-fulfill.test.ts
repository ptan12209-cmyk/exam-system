import { describe, it, expect } from 'vitest'
import {
  toPaymentTxnRef,
  orderIdFromPaymentTxnRef,
} from '../online-order-fulfill'

describe('online-order-fulfill payment ref', () => {
  it('round-trips order UUID to VNPay txn ref', () => {
    const id = '6b4f85c6-b496-464f-967e-4402db77d714'
    const ref = toPaymentTxnRef(id)
    expect(ref).toBe('OL6b4f85c6b496464f967e4402db77d714')
    expect(orderIdFromPaymentTxnRef(ref)).toBe(id)
  })

  it('rejects invalid refs', () => {
    expect(orderIdFromPaymentTxnRef('')).toBeNull()
    expect(orderIdFromPaymentTxnRef('EH123')).toBeNull()
    expect(orderIdFromPaymentTxnRef('OL123')).toBeNull()
  })
})
