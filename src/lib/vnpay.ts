import { VNPay, ignoreLogger, ProductCode, VnpLocale, HashAlgorithm } from "vnpay"

const isProduction = process.env.NODE_ENV === "production"
const tmnCode = process.env.VNPAY_TMN_CODE || ""
const secureSecret = process.env.VNPAY_SECURE_SECRET || process.env.VNPAY_HASH_SECRET || ""
const vnpayHost =
  process.env.VNPAY_HOST ||
  (isProduction ? "https://vnpayment.vn" : "https://sandbox.vnpayment.vn")
const testMode = !isProduction || process.env.VNPAY_TEST_MODE === "true"

if (isProduction && (!tmnCode || !secureSecret)) {
  console.error("[VNPay] VNPAY_TMN_CODE / VNPAY_SECURE_SECRET missing in production")
}

// No hardcoded sandbox secrets — fail closed in production if unset
const vnpayConfig = {
    tmnCode: tmnCode || (isProduction ? "" : "CGXZLS0Z"),
    secureSecret: secureSecret || (isProduction ? "" : "RAOEXHYVSDDIIENYWSLDIIENMJVGPLZP"),
    vnpayHost,
    testMode,
    hashAlgorithm: HashAlgorithm.SHA512,
}

const vnpay = new VNPay({
    ...vnpayConfig,
    enableLog: !isProduction,
    loggerFn: ignoreLogger,
})

export interface CreatePaymentParams {
    orderId: string
    amount: number // VND
    orderInfo: string
    returnUrl: string
    ipAddress: string
    locale?: "vn" | "en"
}

export interface PaymentResult {
    success: boolean
    paymentUrl?: string
    error?: string
}

export interface VerifyReturnParams {
    vnp_Amount: string
    vnp_BankCode: string
    vnp_BankTranNo?: string
    vnp_CardType?: string
    vnp_OrderInfo: string
    vnp_PayDate: string
    vnp_ResponseCode: string
    vnp_TmnCode: string
    vnp_TransactionNo: string
    vnp_TransactionStatus: string
    vnp_TxnRef: string
    vnp_SecureHash: string
}

export interface VerifyResult {
    isSuccess: boolean
    isValidSignature: boolean
    orderId: string
    amount: number
    transactionNo: string
    responseCode: string
    message: string
}

/**
 * Create a VNPay payment URL
 */
export async function createPaymentUrl(params: CreatePaymentParams): Promise<PaymentResult> {
    try {
        const paymentUrl = vnpay.buildPaymentUrl({
            vnp_Amount: params.amount,
            vnp_IpAddr: params.ipAddress,
            vnp_TxnRef: params.orderId,
            vnp_OrderInfo: params.orderInfo,
            vnp_OrderType: ProductCode.Pay,
            vnp_ReturnUrl: params.returnUrl,
            vnp_Locale: params.locale === "en" ? VnpLocale.EN : VnpLocale.VN,
        })

        return {
            success: true,
            paymentUrl,
        }
    } catch (error) {
        console.error("[VNPay] Create payment URL error:", error)
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        }
    }
}

/**
 * Verify VNPay return URL parameters (browser redirect)
 */
export function verifyReturnUrl(query: VerifyReturnParams): VerifyResult {
    try {
        const verifyResult = vnpay.verifyReturnUrl(query)

        return {
            isSuccess: verifyResult.isSuccess,
            isValidSignature: verifyResult.isVerified,
            orderId: query.vnp_TxnRef,
            amount: parseInt(query.vnp_Amount, 10) / 100, // VNPay sends amount * 100
            transactionNo: query.vnp_TransactionNo,
            responseCode: query.vnp_ResponseCode,
            message: getResponseMessage(query.vnp_ResponseCode),
        }
    } catch (error) {
        console.error("[VNPay] Verify return URL error:", error)
        return {
            isSuccess: false,
            isValidSignature: false,
            orderId: query.vnp_TxnRef || "",
            amount: 0,
            transactionNo: "",
            responseCode: "99",
            message: "Lỗi xác thực thanh toán",
        }
    }
}

/**
 * Verify VNPay IPN (server-to-server). Same field shape as return URL.
 */
export function verifyIpnCall(query: VerifyReturnParams): VerifyResult {
    try {
        const verifyResult = vnpay.verifyIpnCall(query)

        return {
            isSuccess: verifyResult.isSuccess,
            isValidSignature: verifyResult.isVerified,
            orderId: query.vnp_TxnRef,
            amount: parseInt(query.vnp_Amount, 10) / 100,
            transactionNo: query.vnp_TransactionNo,
            responseCode: query.vnp_ResponseCode,
            message: getResponseMessage(query.vnp_ResponseCode),
        }
    } catch (error) {
        console.error("[VNPay] Verify IPN error:", error)
        return {
            isSuccess: false,
            isValidSignature: false,
            orderId: query.vnp_TxnRef || "",
            amount: 0,
            transactionNo: "",
            responseCode: "99",
            message: "Lỗi xác thực IPN",
        }
    }
}

/** Build VerifyReturnParams from URLSearchParams (return or IPN) */
export function vnpayParamsFromSearchParams(searchParams: URLSearchParams): VerifyReturnParams {
    return {
        vnp_Amount: searchParams.get("vnp_Amount") || "",
        vnp_BankCode: searchParams.get("vnp_BankCode") || "",
        vnp_BankTranNo: searchParams.get("vnp_BankTranNo") || undefined,
        vnp_CardType: searchParams.get("vnp_CardType") || undefined,
        vnp_OrderInfo: searchParams.get("vnp_OrderInfo") || "",
        vnp_PayDate: searchParams.get("vnp_PayDate") || "",
        vnp_ResponseCode: searchParams.get("vnp_ResponseCode") || "",
        vnp_TmnCode: searchParams.get("vnp_TmnCode") || "",
        vnp_TransactionNo: searchParams.get("vnp_TransactionNo") || "",
        vnp_TransactionStatus: searchParams.get("vnp_TransactionStatus") || "",
        vnp_TxnRef: searchParams.get("vnp_TxnRef") || "",
        vnp_SecureHash: searchParams.get("vnp_SecureHash") || "",
    }
}

/**
 * Get human-readable message for VNPay response code
 */
function getResponseMessage(code: string): string {
    const messages: Record<string, string> = {
        "00": "Giao dịch thành công",
        "07": "Trừ tiền thành công. Giao dịch bị nghi ngờ (liên quan tới lừa đảo, giao dịch bất thường)",
        "09": "Thẻ/Tài khoản chưa đăng ký dịch vụ InternetBanking tại ngân hàng",
        "10": "Khách hàng xác thực thông tin thẻ/tài khoản không đúng quá 3 lần",
        "11": "Đã hết hạn chờ thanh toán",
        "12": "Thẻ/Tài khoản bị khóa",
        "13": "Nhập sai mật khẩu xác thực giao dịch (OTP)",
        "24": "Khách hàng hủy giao dịch",
        "51": "Tài khoản không đủ số dư để thực hiện giao dịch",
        "65": "Tài khoản đã vượt quá hạn mức giao dịch trong ngày",
        "75": "Ngân hàng thanh toán đang bảo trì",
        "79": "Nhập sai mật khẩu thanh toán quá số lần quy định",
        "99": "Lỗi không xác định",
    }
    return messages[code] || `Lỗi không xác định (${code})`
}

/**
 * Format VND currency
 */
export function formatVND(amount: number): string {
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
    }).format(amount)
}

/**
 * Generate unique order ID
 */
export function generateOrderId(prefix: string = "EH"): string {
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substring(2, 8)
    return `${prefix}${timestamp}${random}`.toUpperCase()
}

export { vnpay }
