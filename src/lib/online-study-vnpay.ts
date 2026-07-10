import { createAdminClient } from '@/lib/supabase/server'
import {
  verifyReturnUrl,
  verifyIpnCall,
  type VerifyReturnParams,
  type VerifyResult,
} from '@/lib/vnpay'
import {
  fulfillOnlineOrderSuccess,
  markOnlineOrderFailed,
  orderIdFromPaymentTxnRef,
  type FulfillResult,
} from '@/lib/online-order-fulfill'

export type OnlineStudyPaymentProcessResult =
  | {
      kind: 'fulfilled'
      subjectKey: string
      studentId: string
      alreadyDone?: boolean
    }
  | { kind: 'failed'; reason: string; message: string }
  | { kind: 'invalid_signature'; message: string }
  | { kind: 'order_not_found'; message: string }
  | { kind: 'payment_not_success'; message: string }

function mapVerify(
  mode: 'return' | 'ipn',
  params: VerifyReturnParams
): VerifyResult {
  return mode === 'ipn' ? verifyIpnCall(params) : verifyReturnUrl(params)
}

/**
 * Shared pipeline for VNPay return URL + IPN → auto-unlock online subject.
 */
export async function processOnlineStudyVnpayPayment(
  params: VerifyReturnParams,
  mode: 'return' | 'ipn' = 'return'
): Promise<OnlineStudyPaymentProcessResult> {
  const result = mapVerify(mode, params)
  const orderId = orderIdFromPaymentTxnRef(result.orderId || params.vnp_TxnRef)

  if (!orderId) {
    return {
      kind: 'order_not_found',
      message: 'Mã đơn hàng không hợp lệ',
    }
  }

  if (!result.isValidSignature) {
    return {
      kind: 'invalid_signature',
      message: 'Chữ ký thanh toán không hợp lệ',
    }
  }

  const adminSupabase = createAdminClient()

  if (!result.isSuccess) {
    await markOnlineOrderFailed(adminSupabase, orderId)
    return {
      kind: 'payment_not_success',
      message: result.message || 'Thanh toán thất bại',
    }
  }

  const paidAmount = Math.round(result.amount)
  const fulfilled: FulfillResult = await fulfillOnlineOrderSuccess(
    adminSupabase,
    orderId,
    {
      assignedBy: null,
      expectedAmountVnd: paidAmount,
    }
  )

  if (!fulfilled.ok) {
    if (fulfilled.reason === 'AMOUNT_MISMATCH') {
      return {
        kind: 'failed',
        reason: fulfilled.reason,
        message: 'Số tiền thanh toán không khớp đơn hàng',
      }
    }
    if (fulfilled.reason === 'ORDER_NOT_FOUND') {
      return {
        kind: 'order_not_found',
        message: 'Không tìm thấy đơn hàng',
      }
    }
    return {
      kind: 'failed',
      reason: fulfilled.reason,
      message: 'Không thể kích hoạt môn học',
    }
  }

  return {
    kind: 'fulfilled',
    subjectKey: fulfilled.subjectKey,
    studentId: fulfilled.studentId,
    alreadyDone: fulfilled.alreadyDone,
  }
}
