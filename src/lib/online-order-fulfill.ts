import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Convert online_orders UUID ↔ VNPay vnp_TxnRef (max 100 chars).
 * Format: OL + uuid without hyphens (34 chars).
 */
export function toPaymentTxnRef(orderId: string): string {
  return `OL${orderId.replace(/-/g, '')}`
}

export function orderIdFromPaymentTxnRef(ref: string): string | null {
  if (!ref || !ref.startsWith('OL')) return null
  const hex = ref.slice(2).toLowerCase()
  if (!/^[0-9a-f]{32}$/.test(hex)) return null
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export type FulfillResult =
  | { ok: true; alreadyDone?: boolean; subjectKey: string; studentId: string }
  | { ok: false; reason: string }

/**
 * Mark online_order success and grant subject entitlement.
 * Safe to call multiple times (idempotent).
 */
export async function fulfillOnlineOrderSuccess(
  adminSupabase: SupabaseClient,
  orderId: string,
  options?: {
    assignedBy?: string | null
    /** Optional: verify amount (VND integer) matches order */
    expectedAmountVnd?: number
  }
): Promise<FulfillResult> {
  const { data: order, error } = await adminSupabase
    .from('online_orders')
    .select('id, student_id, subject_key, status, amount')
    .eq('id', orderId)
    .maybeSingle()

  if (error || !order) {
    return { ok: false, reason: 'ORDER_NOT_FOUND' }
  }

  if (order.status === 'success') {
    return {
      ok: true,
      alreadyDone: true,
      subjectKey: order.subject_key,
      studentId: order.student_id,
    }
  }

  if (order.status !== 'pending') {
    return { ok: false, reason: `INVALID_STATUS_${order.status}` }
  }

  if (options?.expectedAmountVnd !== undefined) {
    const orderAmount = Math.round(Number(order.amount))
    if (orderAmount !== options.expectedAmountVnd) {
      console.error(
        '[fulfillOnlineOrder] amount mismatch',
        { orderId, orderAmount, expected: options.expectedAmountVnd }
      )
      return { ok: false, reason: 'AMOUNT_MISMATCH' }
    }
  }

  const { error: updateError } = await adminSupabase
    .from('online_orders')
    .update({ status: 'success' })
    .eq('id', orderId)
    .eq('status', 'pending')

  if (updateError) {
    console.error('[fulfillOnlineOrder] update failed', updateError)
    return { ok: false, reason: 'UPDATE_FAILED' }
  }

  await adminSupabase.from('student_online_subjects').upsert(
    {
      student_id: order.student_id,
      subject: order.subject_key,
      assigned_by: options?.assignedBy || order.student_id,
    },
    { onConflict: 'student_id,subject' }
  )

  const { data: profile } = await adminSupabase
    .from('profiles')
    .select('role')
    .eq('id', order.student_id)
    .single()

  if (profile && profile.role === 'student') {
    await adminSupabase
      .from('profiles')
      .update({ role: 'online_student' })
      .eq('id', order.student_id)
  }

  return {
    ok: true,
    subjectKey: order.subject_key,
    studentId: order.student_id,
  }
}

export async function markOnlineOrderFailed(
  adminSupabase: SupabaseClient,
  orderId: string
): Promise<void> {
  await adminSupabase
    .from('online_orders')
    .update({ status: 'failed' })
    .eq('id', orderId)
    .eq('status', 'pending')
}
