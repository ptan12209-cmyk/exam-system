"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { OnlineStudentShell } from "@/components/online-student/OnlineStudentShell"
import { OnlineStudentTopbar } from "@/components/online-student/OnlineStudentTopbar"
import { Loading } from "@/components/shared/Loading"
import { ONLINE_SUBJECTS } from "@/lib/subjects"
import { 
  BookOpen, 
  ChevronRight, 
  ShieldAlert, 
  ArrowLeft, 
  Lock, 
  CheckCircle, 
  CreditCard, 
  Loader2, 
  Sparkles, 
  X,
  QrCode,
  GraduationCap
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Footer from "@/components/Footer"

function SubjectSvgIcon({ value, className = "h-8 w-8" }: { value: string; className?: string }) {
  switch (value) {
    case "toan":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="grad-toan" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#06B6D4" />
            </linearGradient>
          </defs>
          <path d="M19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3Z" stroke="url(#grad-toan)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9 17L9 7L11 8" stroke="url(#grad-toan)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M14 10C14 8 16 8 16 9C16 10 14 11 14 12V14H17" stroke="url(#grad-toan)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M6 14H8" stroke="url(#grad-toan)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 17V17.01" stroke="url(#grad-toan)" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )
    case "ly":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="grad-ly" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#A855F7" />
              <stop offset="100%" stopColor="#7C3AED" />
            </linearGradient>
          </defs>
          <circle cx="12" cy="12" r="3" fill="url(#grad-ly)" />
          <ellipse cx="12" cy="12" rx="9" ry="3" stroke="url(#grad-ly)" strokeWidth="1.5" transform="rotate(30 12 12)" />
          <ellipse cx="12" cy="12" rx="9" ry="3" stroke="url(#grad-ly)" strokeWidth="1.5" transform="rotate(-30 12 12)" />
          <ellipse cx="12" cy="12" rx="9" ry="3" stroke="url(#grad-ly)" strokeWidth="1.5" transform="rotate(90 12 12)" />
        </svg>
      )
    case "hoa":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="grad-hoa" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
          </defs>
          <path d="M10 2H14V5H10V2Z" fill="url(#grad-hoa)" />
          <path d="M12 5V9" stroke="url(#grad-hoa)" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M19.5 17.5L14 7V5H10V7L4.5 17.5C3.5 19.5 5 22 7.2 22H16.8C19 22 20.5 19.5 19.5 17.5Z" stroke="url(#grad-hoa)" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M6.5 18H17.5" stroke="url(#grad-hoa)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )
    case "van":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="grad-van" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#D97706" />
            </linearGradient>
          </defs>
          <path d="M12 6.5C10.5 4.5 7 4.5 4 4.5V18.5C7 18.5 10.5 18.5 12 20.5C13.5 18.5 17 18.5 20 18.5V4.5C17 4.5 13.5 4.5 12 6.5Z" stroke="url(#grad-van)" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M12 6.5V20.5" stroke="url(#grad-van)" strokeWidth="1.5" />
          <path d="M15 8H18" stroke="url(#grad-van)" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M15 11H18" stroke="url(#grad-van)" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M15 14H18" stroke="url(#grad-van)" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M6 8H9" stroke="url(#grad-van)" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M6 11H9" stroke="url(#grad-van)" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M6 14H9" stroke="url(#grad-van)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )
    case "su":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="grad-su" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#EAB308" />
              <stop offset="100%" stopColor="#CA8A04" />
            </linearGradient>
          </defs>
          <path d="M14 2H6C4.89543 2 4 2.89543 4 3.5V20.5C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20.5V8L14 2Z" stroke="url(#grad-su)" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M14 2V8H20" stroke="url(#grad-su)" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M8 13H16" stroke="url(#grad-su)" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M8 17H13" stroke="url(#grad-su)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )
    case "dia":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="grad-dia" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#14B8A6" />
              <stop offset="100%" stopColor="#0D9488" />
            </linearGradient>
          </defs>
          <circle cx="12" cy="12" r="9" stroke="url(#grad-dia)" strokeWidth="1.5" />
          <path d="M3.6 9H20.4" stroke="url(#grad-dia)" strokeWidth="1.5" />
          <path d="M3.6 15H20.4" stroke="url(#grad-dia)" strokeWidth="1.5" />
          <path d="M12 3C13.5 5.5 14.5 8.5 14.5 12C14.5 15.5 13.5 18.5 12 21C10.5 18.5 9.5 15.5 9.5 12C9.5 8.5 10.5 5.5 12 3Z" stroke="url(#grad-dia)" strokeWidth="1.5" />
        </svg>
      )
    case "ktpl":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="grad-ktpl" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F43F5E" />
              <stop offset="100%" stopColor="#E11D48" />
            </linearGradient>
          </defs>
          <path d="M12 3V21" stroke="url(#grad-ktpl)" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M19 10C19 14 16 17 12 17C8 17 5 14 5 10" stroke="url(#grad-ktpl)" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M12 7H17L19 10" stroke="url(#grad-ktpl)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 7H7L5 10" stroke="url(#grad-ktpl)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9 21H15" stroke="url(#grad-ktpl)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )
    case "sinh":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="grad-sinh" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#84CC16" />
              <stop offset="100%" stopColor="#65A30D" />
            </linearGradient>
          </defs>
          <path d="M4.5 10.5C4.5 10.5 7.5 13.5 12 10.5C16.5 7.5 19.5 10.5 19.5 10.5" stroke="url(#grad-sinh)" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M4.5 13.5C4.5 13.5 7.5 10.5 12 13.5C16.5 16.5 19.5 13.5 19.5 13.5" stroke="url(#grad-sinh)" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M6 11.5V12.5" stroke="url(#grad-sinh)" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M9 10.8V13.2" stroke="url(#grad-sinh)" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M12 11.2V12.8" stroke="url(#grad-sinh)" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M15 10.8V13.2" stroke="url(#grad-sinh)" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M18 11.5V12.5" stroke="url(#grad-sinh)" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="4.5" cy="12" r="1.5" fill="url(#grad-sinh)" />
          <circle cx="19.5" cy="12" r="1.5" fill="url(#grad-sinh)" />
        </svg>
      )
    case "anh":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="grad-anh" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0EA5E9" />
              <stop offset="100%" stopColor="#0284C7" />
            </linearGradient>
          </defs>
          <path d="M21 11.5C21 16.1944 16.9706 20 12 20C10.7483 20 9.5599 19.7686 8.48797 19.344C6.55168 20.3015 4.38283 20.8093 2.1 20.9729C2.7915 19.4673 3.55011 17.6534 3.73179 16.0375C2.65171 14.774 2 13.2107 2 11.5C2 6.80558 6.02944 3 12 3C17.9706 3 21 6.80558 21 11.5Z" stroke="url(#grad-anh)" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M9 14.5L12 8.5L15 14.5" stroke="url(#grad-anh)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M10 12.5H14" stroke="url(#grad-anh)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )
    case "dgnl_hsa":
    case "dgnl_vact":
    case "dgnl_tsa":
      const color1 = value === "dgnl_hsa" ? "#D946EF" : (value === "dgnl_vact" ? "#D946EF" : "#8B5CF6")
      const color2 = value === "dgnl_hsa" ? "#DB2777" : (value === "dgnl_vact" ? "#7C3AED" : "#EC4899")
      const id = `grad-${value}`
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={color1} />
              <stop offset="100%" stopColor={color2} />
            </linearGradient>
          </defs>
          <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke={`url(#${id})`} strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M2 17L12 22L22 17" stroke={`url(#${id})`} strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M2 12L12 17L22 12" stroke={`url(#${id})`} strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M12 12V22" stroke={`url(#${id})`} strokeWidth="1.5" />
        </svg>
      )
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      )
  }
}

function getSubjectTheme(value: string) {
  switch (value) {
    case "toan": return { text: "text-blue-400", border: "hover:border-blue-500/50", glow: "hover:shadow-[0_0_30px_rgba(59,130,246,0.18)]", iconBg: "bg-blue-950/20 border-blue-900/30" }
    case "ly": return { text: "text-purple-400", border: "hover:border-purple-500/50", glow: "hover:shadow-[0_0_30px_rgba(168,85,247,0.18)]", iconBg: "bg-purple-950/20 border-purple-900/30" }
    case "hoa": return { text: "text-green-400", border: "hover:border-green-500/50", glow: "hover:shadow-[0_0_30px_rgba(16,185,129,0.18)]", iconBg: "bg-green-950/20 border-green-900/30" }
    case "van": return { text: "text-amber-400", border: "hover:border-amber-500/50", glow: "hover:shadow-[0_0_30px_rgba(245,158,11,0.18)]", iconBg: "bg-amber-950/20 border-amber-900/30" }
    case "su": return { text: "text-yellow-400", border: "hover:border-yellow-500/50", glow: "hover:shadow-[0_0_30px_rgba(234,179,8,0.18)]", iconBg: "bg-yellow-950/20 border-yellow-900/30" }
    case "dia": return { text: "text-teal-400", border: "hover:border-teal-500/50", glow: "hover:shadow-[0_0_30px_rgba(20,184,166,0.18)]", iconBg: "bg-teal-950/20 border-teal-900/30" }
    case "ktpl": return { text: "text-rose-400", border: "hover:border-rose-500/50", glow: "hover:shadow-[0_0_30px_rgba(244,63,94,0.18)]", iconBg: "bg-rose-950/20 border-rose-900/30" }
    case "sinh": return { text: "text-lime-400", border: "hover:border-lime-500/50", glow: "hover:shadow-[0_0_30px_rgba(132,204,22,0.18)]", iconBg: "bg-lime-950/20 border-lime-900/30" }
    case "anh": return { text: "text-sky-400", border: "hover:border-sky-500/50", glow: "hover:shadow-[0_0_30px_rgba(14,165,233,0.18)]", iconBg: "bg-sky-950/20 border-sky-900/30" }
    case "dgnl_hsa":
    case "dgnl_vact": return { text: "text-fuchsia-400", border: "hover:border-fuchsia-500/50", glow: "hover:shadow-[0_0_30px_rgba(217,70,239,0.18)]", iconBg: "bg-fuchsia-950/20 border-fuchsia-900/30" }
    case "dgnl_tsa": return { text: "text-violet-400", border: "hover:border-violet-500/50", glow: "hover:shadow-[0_0_30px_rgba(139,92,246,0.18)]", iconBg: "bg-violet-950/20 border-violet-900/30" }
    default: return { text: "text-gray-400", border: "hover:border-gray-500/50", glow: "hover:shadow-[0_0_30px_rgba(107,114,128,0.18)]", iconBg: "bg-gray-950/20 border-gray-900/30" }
  }
}

export default function OnlineStudentDashboard() {
  const router = useRouter()
  const supabase = createClient()

  const [profile, setProfile] = useState<{ full_name: string | null; role: string; email?: string | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const [mySubjects, setMySubjects] = useState<string[]>([])

  // Dynamic payment configurations
  const [bankSettings, setBankSettings] = useState({
    bankId: "MB",
    accountNo: "0348574888",
    accountName: "STUDYHUB EDUCATION",
    prices: {} as Record<string, number>
  })

  const [totalProgressPercent, setTotalProgressPercent] = useState(0)
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null)
  const [orderMemo, setOrderMemo] = useState("")
  const [orderAmount, setOrderAmount] = useState(0)
  const [creatingOrder, setCreatingOrder] = useState(false)
  const [checkingStatus, setCheckingStatus] = useState(false)
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null)
  const [payosQrData, setPayosQrData] = useState<string | null>(null)
  const [payosVietQrUrl, setPayosVietQrUrl] = useState<string | null>(null)
  const [payosAccount, setPayosAccount] = useState<{
    number?: string | null
    name?: string | null
    description?: string | null
  }>({})

  // Checkout: payOS / VietQR → pending (auto webhook) → success
  const [checkoutSubject, setCheckoutSubject] = useState<typeof ONLINE_SUBJECTS[number] | null>(null)
  const [checkoutStep, setCheckoutStep] = useState<"qr" | "pending" | "success">("qr")

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/login")
        return
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, role, email")
        .eq("id", user.id)
        .single()

      if (!profileData || (profileData.role !== "online_student" && profileData.role !== "student")) {
        router.push("/login")
        return
      }

      setProfile(profileData)

      // Fetch dynamic payment settings
      try {
        const resSettings = await fetch("/api/online-study/payment-settings")
        const dataSettings = await resSettings.json()
        if (resSettings.ok && dataSettings.success) {
          setBankSettings({
            bankId: dataSettings.data.bankId || "MB",
            accountNo: dataSettings.data.accountNo || "0348574888",
            accountName: dataSettings.data.accountName || "STUDYHUB EDUCATION",
            prices: dataSettings.data.prices || {}
          })
        }
      } catch (e) {
        console.error("Lỗi lấy cấu hình thanh toán:", e)
      }

      // Fetch progress and calculate percent
      try {
        // Progress percent requires per-subject lesson totals; avoid unscoped lesson enumeration
        setTotalProgressPercent(0)
      } catch (e) {
        console.error("Lỗi tính tiến độ học tập:", e)
      }

      // Fetch assigned online subjects
      try {
        const res = await fetch("/api/online-study/my-subjects")
        const data = await res.json()
        if (res.ok && data.success) {
          setMySubjects(data.data || [])
        }
      } catch (e) {
        console.error("Lỗi lấy môn học:", e)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router, supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  // Format currency
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price)
  }

  // Check if subject is unlocked
  const isUnlocked = (subjectValue: string) => {
    return mySubjects.includes("all") || mySubjects.includes(subjectValue)
  }

  // Get subject price dynamically
  const getSubjectPrice = (subjectValue: string, defaultPrice: number) => {
    return bankSettings.prices[subjectValue] !== undefined
      ? bankSettings.prices[subjectValue]
      : defaultPrice
  }

  // Create pending invoice — payOS (auto unlock) or VietQR fallback
  const handleOpenCheckout = async (subject: typeof ONLINE_SUBJECTS[number]) => {
    setCheckoutSubject(subject)
    setCheckoutStep("qr")
    setCreatedOrderId(null)
    setOrderMemo("")
    setCheckoutUrl(null)
    setPayosQrData(null)
    setPayosVietQrUrl(null)
    setPayosAccount({})
    setOrderAmount(getSubjectPrice(subject.value, subject.price))
    setCreatingOrder(true)

    try {
      const res = await fetch("/api/online-study/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectKey: subject.value }),
      })
      const data = await res.json()
      if (res.ok && data.success && data.data) {
        setCreatedOrderId(data.data.id)
        setOrderMemo(data.data.payosDescription || data.data.memo || "")
        setOrderAmount(Number(data.data.amount) || getSubjectPrice(subject.value, subject.price))
        setCheckoutUrl(data.data.checkoutUrl || null)
        setPayosQrData(data.data.qrCode || null)
        setPayosVietQrUrl(data.data.vietQrUrl || null)
        setPayosAccount({
          number: data.data.accountNumber,
          name: data.data.accountName,
          description: data.data.payosDescription || data.data.memo,
        })

        if (data.data.unlocked || data.data.status === "success" || data.data.free) {
          setMySubjects((prev) =>
            prev.includes(subject.value) ? prev : [...prev, subject.value]
          )
          setCheckoutStep("success")
        }
      } else {
        const msg = data?.error?.message || data?.error || "Không tạo được đơn hàng"
        alert(typeof msg === "string" ? msg : "Không tạo được đơn hàng")
        setCheckoutSubject(null)
      }
    } catch (e) {
      console.error("Lỗi tạo đơn hàng:", e)
      alert("Lỗi kết nối khi tạo đơn hàng.")
      setCheckoutSubject(null)
    } finally {
      setCreatingOrder(false)
    }
  }

  const handleConfirmBankTransfer = async () => {
    if (!checkoutSubject || !createdOrderId) return
    setCheckoutStep("pending")
  }

  const handleCheckOrderStatus = async () => {
    if (!checkoutSubject || !createdOrderId) return
    setCheckingStatus(true)
    try {
      const res = await fetch("/api/online-study/orders")
      const data = await res.json()
      if (!res.ok || !data.success) {
        alert("Không kiểm tra được trạng thái đơn hàng.")
        return
      }
      const orders = data.data?.orders || data.data || []
      const list = Array.isArray(orders) ? orders : []
      const mine = list.find((o: { id: string }) => o.id === createdOrderId)

      if (mine?.status === "success") {
        setMySubjects((prev) =>
          prev.includes(checkoutSubject.value) ? prev : [...prev, checkoutSubject.value]
        )
        setCheckoutStep("success")
        return
      }
      if (mine?.status === "failed") {
        alert("Đơn hàng bị từ chối. Vui lòng liên hệ giáo viên.")
        setCheckoutStep("qr")
        return
      }
      alert("Đơn vẫn đang chờ giáo viên xác nhận chuyển khoản. Vui lòng thử lại sau.")
    } catch {
      alert("Lỗi kết nối khi kiểm tra đơn hàng.")
    } finally {
      setCheckingStatus(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0A13] flex items-center justify-center">
        <Loading label="Khởi động không gian học tập trực tuyến..." />
      </div>
    )
  }

  // Transfer details: prefer payOS QR / account, else teacher bank VietQR
  const memoText = orderMemo || payosAccount.description || ""
  const activePrice = orderAmount || (checkoutSubject
    ? getSubjectPrice(checkoutSubject.value, checkoutSubject.price)
    : 0)

  const fallbackVietQr =
    checkoutSubject && memoText
      ? `https://img.vietqr.io/image/${bankSettings.bankId}-${bankSettings.accountNo}-print.png?amount=${activePrice}&addInfo=${encodeURIComponent(memoText)}&accountName=${encodeURIComponent(bankSettings.accountName)}`
      : ""

  const qrCodeUrl =
    payosVietQrUrl ||
    (payosQrData
      ? `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(payosQrData)}`
      : fallbackVietQr)

  const displayAccountNo = payosAccount.number || bankSettings.accountNo
  const displayAccountName = payosAccount.name || bankSettings.accountName
  const displayBankId = payosAccount.number ? "payOS" : bankSettings.bankId

  return (
    <OnlineStudentShell>
      <OnlineStudentTopbar name={profile?.full_name} onLogout={handleLogout} />
      
      <main className="mx-auto max-w-7xl w-full px-4 pb-28 pt-8 sm:px-6 lg:px-8">
        
        {/* Welcome Section */}
        <section className="mb-8">
          <div className="bg-[#15131F] border border-[#8C87A2]/20 rounded-2xl p-6 lg:p-8 flex flex-col justify-between shadow-sm relative overflow-hidden">
            {/* Ambient Background Glows */}
            <div className="absolute -right-24 -top-24 w-80 h-80 rounded-full bg-[#C18CFF]/5 blur-[80px] pointer-events-none" />
            <div className="absolute -left-24 -bottom-24 w-80 h-80 rounded-full bg-[#3B82F6]/5 blur-[80px] pointer-events-none" />

            <div className="relative z-10">
              <div className="flex items-center gap-3 justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#C18CFF]" />
                  <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-[#8C87A2] font-mono">
                    StudyHub E-Learning Portal
                  </span>
                </div>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl text-[#F1EDF9] font-normal leading-tight font-serif-italic">
                Chào mừng, {profile?.full_name || "Học viên"}!
              </h1>
              <p className="mt-3 text-sm sm:text-base leading-relaxed text-[#8C87A2] max-w-2xl">
                Hệ thống học tập qua bài giảng video và tài liệu tự học trực tuyến. Hãy lựa chọn môn học bên dưới để bắt đầu bài giảng của bạn.
              </p>

              {/* Progress bar */}
              <div className="mt-6 max-w-md bg-[#0B0A13]/40 border border-[#8C87A2]/10 rounded-2xl p-4 flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex justify-between items-center text-xs font-mono text-[#8C87A2] mb-1.5">
                    <span>TIẾN ĐỘ HỌC TẬP TỔNG THỂ</span>
                    <span className="text-[#C18CFF] font-bold">{totalProgressPercent}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#0B0A13] overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-[#C18CFF] to-[#3B82F6] rounded-full transition-all duration-500" 
                      style={{ width: `${totalProgressPercent}%` }}
                    />
                  </div>
                </div>
                <div className="h-10 w-10 shrink-0 rounded-xl bg-[#C18CFF]/10 border border-[#C18CFF]/20 flex items-center justify-center text-[#C18CFF]">
                  <GraduationCap className="h-5 w-5 animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Subjects Grid */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-[#C18CFF]" />
              <h2 className="text-lg font-bold text-[#F1EDF9] tracking-tight uppercase font-mono">Chương trình học tập trực tuyến</h2>
            </div>
            {mySubjects.includes("all") && (
              <span className="text-[9px] font-bold bg-[#C18CFF]/15 text-[#C18CFF] border border-[#C18CFF]/20 px-3 py-1 rounded-full font-mono">
                Cấp quyền tất cả môn học
              </span>
            )}
          </div>

          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {ONLINE_SUBJECTS.map((subject) => {
              const theme = getSubjectTheme(subject.value)
              const unlocked = isUnlocked(subject.value)

              if (unlocked) {
                // UNLOCKED SUBJECT CARD
                return (
                  <Link 
                    key={subject.value}
                    href={`/online-student/study?subject=${subject.value}`}
                    className={cn(
                      "group flex flex-col justify-between p-5 h-48 bg-[#15131F] border border-[#8C87A2]/20 rounded-2xl transition-all duration-300 relative overflow-hidden",
                      theme.border,
                      theme.glow
                    )}
                  >
                    {/* Top Accent Gradient Border */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-[#8C87A2]/10 group-hover:bg-gradient-to-r group-hover:from-[#C18CFF] group-hover:to-[#3B82F6] transition-all" />

                    <div className="flex items-center justify-between">
                      <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl border bg-[#0B0A13] transition-colors duration-300", theme.iconBg)}>
                        <SubjectSvgIcon value={subject.value} className="h-7 w-7" />
                      </div>
                      <ChevronRight className="h-5 w-5 text-[#8C87A2] group-hover:text-[#C18CFF] transition-colors transform group-hover:translate-x-1" />
                    </div>

                    <div className="mt-4">
                      <h3 className="text-lg font-bold text-[#F1EDF9] tracking-tight group-hover:text-[#C18CFF] transition-colors">
                        {subject.label}
                      </h3>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] text-[#8C87A2] font-mono">Bài giảng & tài liệu</span>
                        <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md font-mono">Đã kích hoạt</span>
                      </div>
                    </div>
                  </Link>
                )
              } else {
                // LOCKED SUBJECT CARD
                return (
                  <div 
                    key={subject.value}
                    onClick={() => handleOpenCheckout(subject)}
                    className={cn(
                      "group flex flex-col justify-between p-5 h-48 bg-[#15131F]/40 border border-[#8C87A2]/10 rounded-2xl cursor-pointer relative overflow-hidden select-none transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5 hover:bg-[#15131F]/70",
                      theme.border,
                      theme.glow
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl border bg-[#0B0A13] border-[#8C87A2]/10 grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all">
                        <SubjectSvgIcon value={subject.value} className="h-7 w-7" />
                      </div>
                      <span className="p-1.5 rounded-lg bg-[#0B0A13] border border-[#8C87A2]/15 text-[#8C87A2] group-hover:text-[#C18CFF] transition-colors">
                        <Lock className="h-3.5 w-3.5" />
                      </span>
                    </div>

                    <div className="mt-4">
                      <h3 className="text-base font-bold text-[#8C87A2] group-hover:text-[#F1EDF9] transition-colors">
                        {subject.label}
                      </h3>
                      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-[#8C87A2]/10">
                        <span className="text-xs font-semibold text-[#C18CFF] font-mono">
                          {formatPrice(getSubjectPrice(subject.value, subject.price))}
                        </span>
                        <span className="text-[10px] font-bold text-[#0B0A13] bg-[#C18CFF] group-hover:bg-[#C18CFF]/90 px-2 py-1 rounded-lg transition-colors">
                          Mở khóa
                        </span>
                      </div>
                    </div>
                  </div>
                )
              }
            })}
          </div>
        </section>

      </main>

      {/* ── Dynamic VietQR Checkout Modal Sheet ── */}
      {checkoutSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="w-full max-w-md bg-[#0B0A13] border border-[#8C87A2]/20 rounded-[2rem] overflow-hidden shadow-2xl relative">
            
            {/* Header / Close button */}
            <div className="flex items-center justify-between p-5 border-b border-[#8C87A2]/10 bg-[#15131F]/50">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-[#C18CFF]" />
                <span className="text-sm font-bold text-[#F1EDF9] font-mono tracking-wide">MỞ KHÓA MÔN HỌC</span>
              </div>
              <button 
                onClick={() => setCheckoutSubject(null)}
                className="p-1.5 rounded-lg border border-[#8C87A2]/20 text-[#8C87A2] hover:text-[#F1EDF9] hover:bg-[#15131F] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content Area based on steps */}
            {checkoutStep === "qr" && (
              <div className="p-6 space-y-5">
                <div className="text-center">
                  <h3 className="text-lg font-bold text-[#F1EDF9]">{checkoutSubject.label}</h3>
                  <p className="text-xs text-[#8C87A2] mt-1">
                    Quét QR / mở payOS — chuyển khoản đúng nội dung
                  </p>
                  <p className="text-sm font-mono font-bold text-[#C18CFF] mt-2">
                    {formatPrice(activePrice)}
                  </p>
                </div>

                {creatingOrder || !qrCodeUrl ? (
                  <div className="flex flex-col items-center gap-3 py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-[#C18CFF]" />
                    <p className="text-xs text-[#8C87A2]">Đang tạo đơn thanh toán...</p>
                  </div>
                ) : (
                  <>
                    <div className="relative mx-auto w-48 aspect-square rounded-2xl bg-white p-2.5 border border-[#8C87A2]/20 shadow-lg overflow-hidden flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={qrCodeUrl} alt="Payment QR" className="w-full h-full object-contain" />
                      <div className="absolute -bottom-1 -right-1 p-1 bg-[#0057B8] rounded-tl-lg">
                        <QrCode className="h-4 w-4 text-white" />
                      </div>
                    </div>

                    <div className="bg-[#15131F] rounded-2xl p-4 border border-[#8C87A2]/10 space-y-2 text-xs font-mono">
                      <div className="flex justify-between">
                        <span className="text-[#8C87A2]">Ngân hàng / cổng:</span>
                        <span className="text-[#F1EDF9] font-bold">{displayBankId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#8C87A2]">Số tài khoản:</span>
                        <span className="text-[#F1EDF9] font-bold">{displayAccountNo}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#8C87A2]">Chủ tài khoản:</span>
                        <span className="text-[#F1EDF9] font-bold uppercase">{displayAccountName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#8C87A2]">Số tiền:</span>
                        <span className="text-[#C18CFF] font-bold">{formatPrice(activePrice)}</span>
                      </div>
                      <div className="flex flex-col gap-1 pt-1.5 border-t border-[#8C87A2]/10">
                        <span className="text-[#8C87A2]">Nội dung CK (bắt buộc đúng):</span>
                        <span className="text-center py-2 px-3 rounded-lg bg-[#0B0A13] border border-[#C18CFF]/30 text-[#C18CFF] font-bold select-all">
                          {memoText}
                        </span>
                      </div>
                    </div>

                    <div className="text-[10px] text-[#8C87A2] bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 leading-relaxed">
                      ✅ Chuyển <strong>đúng số tiền + nội dung</strong>. payOS sẽ <strong>tự mở khóa</strong> khi nhận tiền (thường vài phút). Sau đó bấm kiểm tra trạng thái hoặc vào lại dashboard.
                    </div>

                    {checkoutUrl && (
                      <Button
                        onClick={() => { window.location.href = checkoutUrl }}
                        className="w-full rounded-xl bg-[#C18CFF] hover:bg-[#C18CFF]/90 text-[#0B0A13] font-bold text-xs py-3.5"
                      >
                        Mở trang thanh toán payOS
                      </Button>
                    )}

                    <Button
                      onClick={handleConfirmBankTransfer}
                      disabled={!createdOrderId}
                      variant={checkoutUrl ? "outline" : "default"}
                      className={
                        checkoutUrl
                          ? "w-full rounded-xl border-[#8C87A2]/30 text-[#F1EDF9] text-xs py-3"
                          : "w-full rounded-xl bg-[#C18CFF] hover:bg-[#C18CFF]/90 text-[#0B0A13] font-bold text-xs py-3.5"
                      }
                    >
                      Tôi đã chuyển khoản — kiểm tra sau
                    </Button>
                  </>
                )}
              </div>
            )}

            {checkoutStep === "pending" && (
              <div className="p-10 text-center space-y-6">
                <div className="h-14 w-14 mx-auto rounded-full bg-[#C18CFF]/10 border border-[#C18CFF]/30 flex items-center justify-center">
                  <CreditCard className="h-7 w-7 text-[#C18CFF]" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-base font-bold text-[#F1EDF9]">Đang chờ xác nhận</h3>
                  <p className="text-xs text-[#8C87A2] leading-relaxed max-w-xs mx-auto">
                    Đã ghi nhận. Khi payOS báo thanh toán thành công, môn sẽ tự mở khóa. Bấm &quot;Kiểm tra trạng thái&quot; sau 1–2 phút.
                  </p>
                </div>

                <div className="bg-[#15131F] rounded-2xl p-4 border border-[#8C87A2]/10 text-xs font-mono text-left space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[#8C87A2]">Môn:</span>
                    <span className="text-[#F1EDF9] font-bold">{checkoutSubject.label}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8C87A2]">Trạng thái:</span>
                    <span className="text-amber-400 font-bold">pending</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Button
                    onClick={handleCheckOrderStatus}
                    disabled={checkingStatus}
                    className="w-full rounded-xl bg-[#C18CFF] hover:bg-[#C18CFF]/90 text-[#0B0A13] font-bold text-xs py-3.5"
                  >
                    {checkingStatus ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> Đang kiểm tra...
                      </span>
                    ) : (
                      "Kiểm tra trạng thái đơn"
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setCheckoutSubject(null)}
                    className="w-full rounded-xl border-[#8C87A2]/30 text-[#F1EDF9] text-xs py-3"
                  >
                    Đóng
                  </Button>
                </div>
              </div>
            )}

            {checkoutStep === "success" && (
              <div className="p-8 text-center space-y-6 relative">
                
                {/* Floating animated sparkles */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
                  <div className="w-64 h-64 bg-[#C18CFF]/10 rounded-full filter blur-xl animate-pulse" />
                  <div className="absolute top-1/4 left-1/4 h-2.5 w-2.5 rounded-full bg-yellow-400 animate-ping" />
                  <div className="absolute bottom-1/4 right-1/4 h-3 w-3 rounded-full bg-blue-400 animate-ping delay-300" />
                  <div className="absolute top-1/3 right-1/4 h-2 w-2 rounded-full bg-pink-400 animate-ping delay-500" />
                </div>

                <div className="relative z-10 space-y-4">
                  <div className="h-16 w-16 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center text-emerald-400 mx-auto animate-bounce">
                    <Sparkles className="h-8 w-8" />
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-xl font-bold text-[#F1EDF9]">Mở khóa thành công!</h3>
                    <p className="text-xs text-[#8C87A2]">Môn học <strong>{checkoutSubject.label}</strong> đã được kích hoạt trên tài khoản của bạn.</p>
                  </div>

                  <div className="bg-[#15131F] rounded-2xl p-4 border border-[#8C87A2]/10 text-xs text-[#8C87A2] leading-relaxed max-w-xs mx-auto">
                    Chúc mừng bạn đã mở khóa thành công học phần này. Hệ thống e-learning đã đồng bộ và sẵn sàng phục vụ bài học của bạn.
                  </div>

                  <Button
                    onClick={() => {
                      const subj = checkoutSubject.value
                      setCheckoutSubject(null)
                      router.push(`/online-student/study?subject=${subj}`)
                    }}
                    className="w-full rounded-xl bg-gradient-to-r from-[#C18CFF] to-[#8B5CF6] hover:from-[#C18CFF]/90 hover:to-[#8B5CF6]/90 text-[#0B0A13] font-bold text-xs py-3.5 transition-transform active:scale-95"
                  >
                    Vào học ngay môn {checkoutSubject.label}
                  </Button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
      <Footer />
    </OnlineStudentShell>
  )
}
