"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, CheckCircle2, Link2, AlertCircle, HelpCircle, Loader2, Sparkles } from "lucide-react"

export default function DiscordSettingsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [linking, setLinking] = useState(false)
  const [token, setToken] = useState("")
  const [profile, setProfile] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/login?redirect=/settings/discord")
        return
      }

      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, class, discord_id, discord_username, discord_linked_at")
        .eq("id", user.id)
        .single()

      if (data) {
        setProfile(data)
      }
      setLoading(false)
    }

    loadProfile()
  }, [router, supabase])

  const handleLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    
    if (!token.trim() || token.trim().length !== 8) {
      setError("Mã xác thực phải gồm đúng 8 ký tự.")
      return
    }

    setLinking(true)

    try {
      const res = await fetch("/api/discord/link-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim() })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Có lỗi xảy ra khi liên kết tài khoản.")
      }

      setSuccess(data.message || "Liên kết tài khoản Discord thành công!")
      setProfile((prev: any) => ({
        ...prev,
        discord_id: data.discord_id,
        discord_username: data.discord_username,
        discord_linked_at: new Date().toISOString()
      }))
      setToken("")
    } catch (err: any) {
      setError(err.message || "Không thể kết nối đến máy chủ.")
    } finally {
      setLinking(false)
    }
  }

  const handleUnlink = async () => {
    if (!confirm("Bạn có chắc chắn muốn hủy liên kết tài khoản Discord này? Bạn sẽ không thể tích lũy XP từ phòng voice Discord nữa.")) {
      return
    }

    setLinking(true)
    setError(null)
    setSuccess(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Chưa đăng nhập")

      const { error: unlinkError } = await supabase
        .from("profiles")
        .update({
          discord_id: null,
          discord_username: null,
          discord_linked_at: null
        })
        .eq("id", user.id)

      if (unlinkError) throw unlinkError

      setSuccess("Đã hủy liên kết tài khoản Discord thành công.")
      setProfile((prev: any) => ({
        ...prev,
        discord_id: null,
        discord_username: null,
        discord_linked_at: null
      }))
    } catch (err: any) {
      setError(err.message || "Có lỗi xảy ra khi hủy liên kết.")
    } finally {
      setLinking(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#090d16] text-white">
        <Loader2 className="h-10 w-10 animate-spin text-violet-500" />
        <p className="mt-4 text-sm font-semibold tracking-wider text-gray-400">ĐANG TẢI CẤU HÌNH LIÊN KẾT...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#090d16] text-gray-100 flex flex-col justify-between selection:bg-violet-500/30 selection:text-white">
      {/* Background Glows */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-[40%] -left-[20%] h-[80%] w-[60%] rounded-full bg-violet-600/10 blur-[120px]" />
        <div className="absolute -bottom-[30%] -right-[10%] h-[70%] w-[50%] rounded-full bg-blue-600/10 blur-[120px]" />
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-4 sm:p-6 md:p-12">
        <div className="w-full max-w-lg">
          {/* Back Button */}
          <Link href="/student/profile" className="inline-flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-white mb-8 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Quay lại Hồ sơ cá nhân
          </Link>

          {/* Card Wrapper */}
          <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
            {/* Design accents */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-right from-transparent via-violet-500 to-transparent" />

            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-600/20 text-violet-400 border border-violet-500/20">
                  <Link2 className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-xl font-extrabold text-white">Kết nối Discord</h1>
                  <p className="text-xs text-gray-400">Đồng bộ ca học, tích lũy điểm XP</p>
                </div>
              </div>
              <Sparkles className="h-5 w-5 text-violet-400 animate-pulse" />
            </div>

            {profile?.discord_id ? (
              /* ALREADY LINKED STATE */
              <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 flex items-start gap-4">
                  <CheckCircle2 className="h-6 w-6 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-emerald-400 text-sm">Đã liên kết thành công</h3>
                    <p className="text-xs text-gray-400 mt-1">
                      Tài khoản của bạn đã được kết nối với tài khoản Discord dưới đây. Hệ thống sẽ tự động ghi nhận thời gian tự học của bạn trên kênh voice của Server.
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/5 bg-white/5 p-4 flex justify-between items-center">
                  <div>
                    <Label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Tài khoản Discord</Label>
                    <p className="text-base font-bold text-white mt-0.5">@{profile.discord_username || "Unknown"}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">ID: {profile.discord_id}</p>
                  </div>
                  <Button
                    onClick={handleUnlink}
                    variant="outline"
                    disabled={linking}
                    className="rounded-xl border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500 hover:text-white transition-all text-xs font-bold py-5"
                  >
                    Hủy kết nối
                  </Button>
                </div>
              </div>
            ) : (
              /* UNLINKED STATE - LINK FORM */
              <form onSubmit={handleLink} className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
                <div className="space-y-2">
                  <Label htmlFor="token" className="text-xs font-bold uppercase tracking-wider text-gray-300">Mã xác thực Discord</Label>
                  <div className="relative">
                    <Input
                      id="token"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      placeholder="Nhập mã 8 ký tự (ví dụ: ABCDEFGH)"
                      maxLength={8}
                      disabled={linking}
                      className="rounded-xl border-white/10 bg-black/40 text-white placeholder-gray-600 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 py-6 text-center font-mono font-bold tracking-widest text-lg"
                    />
                  </div>
                  <p className="text-[10px] text-gray-500 leading-normal">
                    Mã xác thực được lấy bằng cách gõ lệnh <code className="bg-black/60 px-1.5 py-0.5 rounded text-violet-400 font-mono">/lienket</code> trên máy chủ Discord học tập của lớp.
                  </p>
                </div>

                {error && (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 flex items-start gap-3 text-red-400 text-xs animate-in slide-in-from-top-2">
                    <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={linking || token.trim().length !== 8}
                  className="w-full rounded-xl bg-violet-600 hover:bg-violet-500 text-white py-6 font-bold tracking-wide shadow-lg shadow-violet-600/20 transition-all flex items-center justify-center gap-2"
                >
                  {linking ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang xác nhận liên kết...
                    </>
                  ) : (
                    <>
                      Xác nhận liên kết
                    </>
                  )}
                </Button>
              </form>
            )}

            {/* Instruction Guide */}
            <div className="mt-8 pt-8 border-t border-white/5 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                <HelpCircle className="h-4 w-4 text-gray-400" /> Hướng dẫn từng bước
              </h4>
              <ol className="text-xs text-gray-400 space-y-2 list-decimal list-inside">
                <li>Truy cập vào máy chủ Discord học tập của lớp.</li>
                <li>Tìm bất kỳ kênh văn bản nào và gõ lệnh: <code className="bg-black/40 px-1 py-0.5 rounded text-violet-400 font-mono">/lienket</code>.</li>
                <li>Bot Discord sẽ gửi riêng cho bạn một tin nhắn chứa mã xác thực 8 ký tự.</li>
                <li>Sao chép mã đó, dán vào ô nhập ở trên và nhấn <strong>Xác nhận liên kết</strong>.</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-gray-600 border-t border-white/5 bg-slate-950/20">
        &copy; {new Date().getFullYear()} ECODEx Learning System. Bảo lưu mọi quyền.
      </footer>
    </div>
  )
}
