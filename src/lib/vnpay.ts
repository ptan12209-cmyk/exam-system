import { VNPay, ignoreLogger, ProductCode, VnpLocale, HashAlgorithm } from "vnpay"

// VNPay configuration
// Get these from https://sandbox.vnpayment.vn/
const vnpayConfig = {
    tmnCode: process.env.VNPAY_TMN_CODE || "CGXZLS0Z", // Sandbox TMN Code
    secureSecret: process.env.VNPAY_SECURE_SECRET || "RAOEXHYVSDDIIENYWSLDIIENMJVGPLZP", // Sandbox Secret
    vnpayHost: "https://sandbox.vnpayment.vn",
    testMode: true,
    hashAlgorithm: HashAlgorithm.SHA512,
}

// Initialize VNPay instance
const vnpay = new VNPay({
    ...vnpayConfig,
    enableLog: true,
    loggerFn: ignoreLogger, // Use default logger in production
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
 * Verify VNPay return URL parameters
 */
export function verifyReturnUrl(query: VerifyReturnParams): VerifyResult {
    try {
        const verifyResult = vnpay.verifyReturnUrl(query)

        return {
            isSuccess: verifyResult.isSuccess,
            isValidSignature: verifyResult.isVerified,
            orderId: query.vnp_TxnRef,
            amount: parseInt(query.vnp_Amount) / 100, // VNPay sends amount * 100
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
