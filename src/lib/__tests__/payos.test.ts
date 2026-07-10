import { describe, it, expect } from 'vitest'
import {
  createPaymentRequestSignature,
  verifyPayosWebhookSignature,
  generatePayosOrderCode,
} from '../payos'

describe('payOS helpers', () => {
  const checksumKey = '1a54716c8f0efb2744fb28b6e38b25da7f67a925d98bc1c18bd8faaecadd7675'

  it('generates numeric order codes', () => {
    const a = generatePayosOrderCode()
    const b = generatePayosOrderCode()
    expect(Number.isSafeInteger(a)).toBe(true)
    expect(a).toBeGreaterThan(0)
    expect(a).not.toBe(b)
  })

  it('creates stable payment request signature', () => {
    const sig = createPaymentRequestSignature({
      amount: 10000,
      cancelUrl: 'https://luyende.id.vn/cancel',
      description: 'AB12CD',
      orderCode: 123456,
      returnUrl: 'https://luyende.id.vn/ok',
      checksumKey,
    })
    expect(sig).toMatch(/^[a-f0-9]{64}$/)
    const sig2 = createPaymentRequestSignature({
      amount: 10000,
      cancelUrl: 'https://luyende.id.vn/cancel',
      description: 'AB12CD',
      orderCode: 123456,
      returnUrl: 'https://luyende.id.vn/ok',
      checksumKey,
    })
    expect(sig).toBe(sig2)
  })

  it('verifies webhook signature round-trip', () => {
    const data = {
      orderCode: 123,
      amount: 3000,
      description: 'VQRIO123',
      accountNumber: '12345678',
      reference: 'TF230204212323',
      transactionDateTime: '2023-02-04 18:25:00',
      currency: 'VND',
      paymentLinkId: '124c33293c43417ab7879e14c8d9eb18',
      code: '00',
      desc: 'Thành công',
      counterAccountBankId: '',
      counterAccountBankName: '',
      counterAccountName: '',
      counterAccountNumber: '',
      virtualAccountName: '',
      virtualAccountNumber: '',
    }
    const signature = createPaymentRequestSignature({
      amount: data.amount,
      cancelUrl: 'x',
      description: data.description,
      orderCode: data.orderCode,
      returnUrl: 'y',
      checksumKey,
    })
    // Payment-request signature fields differ from webhook; verify using payosHmac path via verify on same-shaped data
    // Sign the data object the same way webhook does:
    const { createHmac } = require('crypto') as typeof import('crypto')
    const sorted = Object.keys(data).sort()
    const q = sorted
      .map((k) => {
        const v = (data as Record<string, unknown>)[k]
        const val = [null, undefined, 'undefined', 'null'].includes(v as never) ? '' : v
        return `${k}=${val}`
      })
      .join('&')
    const webhookSig = createHmac('sha256', checksumKey).update(q).digest('hex')
    expect(verifyPayosWebhookSignature(data, webhookSig, checksumKey)).toBe(true)
    expect(verifyPayosWebhookSignature(data, 'deadbeef', checksumKey)).toBe(false)
    expect(signature).toMatch(/^[a-f0-9]{64}$/)
  })
})
