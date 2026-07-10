import { SupabaseClient } from '@supabase/supabase-js'
import { descriptionMatchesMemo } from '@/lib/online-study-auth'
import { fulfillOnlineOrderSuccess } from '@/lib/online-order-fulfill'

/** One transaction object as sent by Casso webhook */
export interface CassoTransaction {
  id: number
  tid?: string
  description?: string
  amount?: number
  when?: string
  bank_sub_acc_id?: string
  subAccId?: string
  bankName?: string
  bankAbbreviation?: string
  [key: string]: unknown
}

export interface CassoWebhookBody {
  error?: number | string
  data?: CassoTransaction | CassoTransaction[] | null
}

export function parseCassoTransactions(body: CassoWebhookBody): CassoTransaction[] {
  if (!body || body.data == null) return []
  if (Array.isArray(body.data)) return body.data
  if (typeof body.data === 'object') return [body.data as CassoTransaction]
  return []
}

export type CassoMatchResult =
  | { status: 'fulfilled'; orderId: string; subjectKey: string; alreadyDone?: boolean }
  | { status: 'skipped'; reason: string }
  | { status: 'failed'; reason: string }

/**
 * Match a Casso deposit to a pending online_order and fulfill it.
 * - amount must match exactly (VND integer)
 * - description must contain order memo tokens
 * - casso transaction id is stored to prevent double-processing
 */
export async function processCassoTransaction(
  adminSupabase: SupabaseClient,
  tx: CassoTransaction
): Promise<CassoMatchResult> {
  const cassoId = Number(tx.id)
  if (!Number.isFinite(cassoId)) {
    return { status: 'skipped', reason: 'INVALID_CASSO_ID' }
  }

  // Only inbound credits (positive amount)
  const amount = Math.round(Number(tx.amount))
  if (!Number.isFinite(amount) || amount <= 0) {
    return { status: 'skipped', reason: 'NOT_A_DEPOSIT' }
  }

  const description = String(tx.description || '')

  // Dedupe
  const { data: existing } = await adminSupabase
    .from('casso_processed_transactions')
    .select('casso_id, order_id')
    .eq('casso_id', cassoId)
    .maybeSingle()

  if (existing) {
    return { status: 'skipped', reason: 'ALREADY_PROCESSED' }
  }

  // Candidate pending orders (filter amount in JS — numeric column typing varies)
  const { data: candidates, error } = await adminSupabase
    .from('online_orders')
    .select('id, memo, amount, status, subject_key, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('[casso] query pending orders failed', error)
    return { status: 'failed', reason: 'QUERY_FAILED' }
  }

  const list = (candidates || []).filter(
    (o) => Math.round(Number(o.amount)) === amount
  )
  const matched = list.find((o) =>
    descriptionMatchesMemo(description, String(o.memo || ''))
  )

  if (!matched) {
    // Record skip so we can inspect later? optional — don't store to allow retry if order created late
    console.warn('[casso] no matching pending order', { cassoId, amount, description })
    return { status: 'skipped', reason: 'NO_MATCHING_ORDER' }
  }

  const fulfill = await fulfillOnlineOrderSuccess(adminSupabase, matched.id, {
    assignedBy: null,
    expectedAmountVnd: amount,
  })

  if (!fulfill.ok) {
    console.error('[casso] fulfill failed', fulfill.reason, matched.id)
    return { status: 'failed', reason: fulfill.reason }
  }

  // Mark processed (ignore conflict if race)
  await adminSupabase.from('casso_processed_transactions').upsert(
    {
      casso_id: cassoId,
      order_id: matched.id,
      amount,
      description,
      processed_at: new Date().toISOString(),
    },
    { onConflict: 'casso_id' }
  )

  return {
    status: 'fulfilled',
    orderId: matched.id,
    subjectKey: fulfill.subjectKey,
    alreadyDone: fulfill.alreadyDone,
  }
}
