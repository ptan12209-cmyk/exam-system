import { createHmac } from 'crypto'

const PAYOS_API = 'https://api-merchant.payos.vn'

export function getPayosConfig() {
  const clientId = process.env.PAYOS_CLIENT_ID || ''
  const apiKey = process.env.PAYOS_API_KEY || ''
  const checksumKey = process.env.PAYOS_CHECKSUM_KEY || ''
  const configured = Boolean(clientId && apiKey && checksumKey)
  return { clientId, apiKey, checksumKey, configured }
}

/** Unique positive integer orderCode for payOS */
export function generatePayosOrderCode(): number {
  // ~12 digits, within Number.MAX_SAFE_INTEGER
  const t = Date.now() % 1_000_000_000_000
  const r = Math.floor(Math.random() * 900) + 100
  return t * 1000 + r
}

function sortObjDataByKey(object: Record<string, unknown>): Record<string, unknown> {
  return Object.keys(object)
    .sort()
    .reduce((obj: Record<string, unknown>, key) => {
      obj[key] = object[key]
      return obj
    }, {})
}

function convertObjToQueryStr(object: Record<string, unknown>): string {
  return Object.keys(object)
    .filter((key) => object[key] !== undefined)
    .map((key) => {
      let value: unknown = object[key]
      if (value && Array.isArray(value)) {
        value = JSON.stringify(
          value.map((val) =>
            typeof val === 'object' && val !== null
              ? sortObjDataByKey(val as Record<string, unknown>)
              : val
          )
        )
      }
      if ([null, undefined, 'undefined', 'null'].includes(value as string | null | undefined)) {
        value = ''
      }
      return `${key}=${value}`
    })
    .join('&')
}

/** HMAC-SHA256 hex for payOS payment-request / webhook data */
export function payosHmac(data: Record<string, unknown>, checksumKey: string): string {
  const sorted = sortObjDataByKey(data)
  const query = convertObjToQueryStr(sorted)
  return createHmac('sha256', checksumKey).update(query).digest('hex')
}

export function verifyPayosWebhookSignature(
  data: Record<string, unknown>,
  signature: string,
  checksumKey: string
): boolean {
  if (!signature || !checksumKey) return false
  const expected = payosHmac(data, checksumKey)
  return expected.toLowerCase() === String(signature).toLowerCase()
}

/** Signature for create payment link */
export function createPaymentRequestSignature(params: {
  amount: number
  cancelUrl: string
  description: string
  orderCode: number
  returnUrl: string
  checksumKey: string
}): string {
  const data = {
    amount: params.amount,
    cancelUrl: params.cancelUrl,
    description: params.description,
    orderCode: params.orderCode,
    returnUrl: params.returnUrl,
  }
  return payosHmac(data, params.checksumKey)
}

export interface PayosCreatePaymentResult {
  success: boolean
  error?: string
  orderCode?: number
  checkoutUrl?: string
  qrCode?: string
  paymentLinkId?: string
  accountNumber?: string
  accountName?: string
  bin?: string
  amount?: number
  description?: string
}

/**
 * Create payOS payment link / VietQR for an order.
 * description should be short (≤9 chars if bank not fully linked via payOS).
 */
export async function createPayosPaymentLink(input: {
  orderCode: number
  amount: number
  description: string
  returnUrl: string
  cancelUrl: string
  buyerName?: string
  buyerEmail?: string
}): Promise<PayosCreatePaymentResult> {
  const { clientId, apiKey, checksumKey, configured } = getPayosConfig()
  if (!configured) {
    return { success: false, error: 'PAYOS credentials not configured' }
  }

  const description = input.description.slice(0, 25)
  const amount = Math.round(input.amount)
  const signature = createPaymentRequestSignature({
    amount,
    cancelUrl: input.cancelUrl,
    description,
    orderCode: input.orderCode,
    returnUrl: input.returnUrl,
    checksumKey,
  })

  const res = await fetch(`${PAYOS_API}/v2/payment-requests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-client-id': clientId,
      'x-api-key': apiKey,
    },
    body: JSON.stringify({
      orderCode: input.orderCode,
      amount,
      description,
      cancelUrl: input.cancelUrl,
      returnUrl: input.returnUrl,
      buyerName: input.buyerName,
      buyerEmail: input.buyerEmail,
      signature,
    }),
  })

  const json = (await res.json().catch(() => null)) as {
    code?: string
    desc?: string
    data?: {
      checkoutUrl?: string
      qrCode?: string
      paymentLinkId?: string
      accountNumber?: string
      accountName?: string
      bin?: string
      amount?: number
      description?: string
      orderCode?: number
    }
  } | null

  if (!res.ok || !json || json.code !== '00' || !json.data) {
    console.error('[payOS] create payment failed', json)
    return {
      success: false,
      error: json?.desc || `payOS HTTP ${res.status}`,
    }
  }

  return {
    success: true,
    orderCode: json.data.orderCode ?? input.orderCode,
    checkoutUrl: json.data.checkoutUrl,
    qrCode: json.data.qrCode,
    paymentLinkId: json.data.paymentLinkId,
    accountNumber: json.data.accountNumber,
    accountName: json.data.accountName,
    bin: json.data.bin,
    amount: json.data.amount ?? amount,
    description: json.data.description ?? description,
  }
}

/** Register / confirm webhook URL with payOS merchant API */
export async function confirmPayosWebhook(webhookUrl: string): Promise<{
  success: boolean
  error?: string
  data?: unknown
}> {
  const { clientId, apiKey, configured } = getPayosConfig()
  if (!configured) {
    return { success: false, error: 'PAYOS credentials not configured' }
  }

  const res = await fetch(`${PAYOS_API}/confirm-webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-client-id': clientId,
      'x-api-key': apiKey,
    },
    body: JSON.stringify({ webhookUrl }),
  })

  const json = await res.json().catch(() => null)
  if (!res.ok || !json || json.code !== '00') {
    return {
      success: false,
      error: json?.desc || `confirm-webhook HTTP ${res.status}`,
      data: json,
    }
  }
  return { success: true, data: json.data }
}
