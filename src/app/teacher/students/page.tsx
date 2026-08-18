"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Check,
  Clipboard,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  RefreshCw,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react"
import { TeacherShell } from "@/components/teacher/TeacherShell"
import { TeacherBottomNav } from "@/components/BottomNav"
import { createClient } from "@/lib/supabase/client"

interface ManagedStudent {
  id: string
  full_name: string
  email: string
  class: string | null
  grade: number | null
  phone: string | null
  account_status: "active" | "disabled"
  created_at: string
  linked_at: string
}

interface IssuedCredential {
  fullName: string
  email: string
  password: string
}

function generatePassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"
  const bytes = new Uint32Array(10)
  crypto.getRandomValues(bytes)
  return `HS@${Array.from(bytes, (value) => alphabet[value % alphabet.length]).join("")}`
}

export default function TeacherStudentsPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [students, setStudents] = useState<ManagedStudent[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [actionId, setActionId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [issued, setIssued] = useState<IssuedCredential | null>(null)
  const [copied, setCopied] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    studentClass: "",
    grade: "",
    phone: "",
  })

  const loadStudents = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/teacher/students", { cache: "no-store" })
      const payload = await response.json()
      if (!response.ok || !payload.success) {
        throw new Error(payload?.error?.message || "Không thể tải danh sách học sinh.")
      }
      setStudents(payload.data.students || [])
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không thể tải dữ liệu.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadStudents()
  }, [loadStudents])

  const createStudent = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setIssued(null)
    try {
      const response = await fetch("/api/teacher/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          fullName: form.fullName,
          studentClass: form.studentClass || null,
          grade: form.grade ? Number(form.grade) : null,
          phone: form.phone || null,
        }),
      })
      const payload = await response.json()
      if (!response.ok || !payload.success) {
        throw new Error(payload?.error?.message || "Không thể cấp tài khoản.")
      }

      setIssued({
        fullName: form.fullName,
        email: form.email.trim().toLowerCase(),
        password: form.password,
      })
      setForm({ fullName: "", email: "", password: "", studentClass: "", grade: "", phone: "" })
      await loadStudents()
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Không thể cấp tài khoản.")
    } finally {
      setSaving(false)
    }
  }

  const toggleStatus = async (student: ManagedStudent) => {
    setActionId(student.id)
    setError(null)
    try {
      const response = await fetch("/api/teacher/students", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: student.id,
          accountStatus: student.account_status === "active" ? "disabled" : "active",
        }),
      })
      const payload = await response.json()
      if (!response.ok || !payload.success) {
        throw new Error(payload?.error?.message || "Không thể cập nhật tài khoản.")
      }
      await loadStudents()
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Không thể cập nhật tài khoản.")
    } finally {
      setActionId(null)
    }
  }

  const copyCredentials = async () => {
    if (!issued) return
    await navigator.clipboard.writeText(
      `Học sinh: ${issued.fullName}\nEmail: ${issued.email}\nMật khẩu: ${issued.password}\nĐăng nhập: ${window.location.origin}/login`
    )
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  const inputClass = "mt-2 w-full rounded-xl border border-[hsl(var(--border))]/70 bg-transparent px-3 py-2.5 text-sm outline-none transition focus:border-[hsl(var(--foreground))]"

  return (
    <TeacherShell onLogout={async () => { await supabase.auth.signOut(); router.push("/login") }}>
      <main className="mx-auto max-w-7xl px-5 pb-28 pt-10 md:px-10 lg:pt-14">
        <section className="grid gap-8 border-b border-[hsl(var(--border))]/60 pb-10 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))]/70 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
              <ShieldCheck className="h-3.5 w-3.5" /> Teacher-issued access
            </div>
            <h1 className="max-w-4xl text-5xl font-semibold tracking-[-0.055em] md:text-7xl">
              Cấp tài khoản
              <span className="block text-[hsl(var(--muted-foreground))]">cho học sinh.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-6 text-[hsl(var(--muted-foreground))] md:text-base">
              Không có đăng ký công khai. Mỗi tài khoản được tạo tại đây, tự động liên kết với giáo viên và có thể khóa bất kỳ lúc nào.
            </p>
          </div>
          <div className="flex h-28 w-40 flex-col justify-between rounded-2xl bg-[#111317] p-5 text-white">
            <Users className="h-5 w-5 text-amber-300" />
            <div><span className="text-3xl font-semibold">{students.length}</span><span className="ml-2 text-xs text-slate-400">học sinh</span></div>
          </div>
        </section>

        {error && <div role="alert" className="mt-6 rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-500">{error}</div>}

        <div className="mt-8 grid gap-8 xl:grid-cols-[420px_1fr]">
          <section className="h-fit rounded-2xl border border-[hsl(var(--border))]/70 bg-[hsl(var(--card))] p-5 xl:sticky xl:top-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-300 text-slate-950"><UserPlus className="h-5 w-5" /></div>
              <div><h2 className="font-semibold">Tài khoản mới</h2><p className="text-xs text-[hsl(var(--muted-foreground))]">Email được xác nhận ngay khi cấp.</p></div>
            </div>

            <form onSubmit={createStudent} className="mt-6 space-y-4">
              <label className="block text-xs font-semibold">Họ và tên<input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className={inputClass} placeholder="Nguyễn Văn An" /></label>
              <label className="block text-xs font-semibold">Email<input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} placeholder="hocsinh@example.com" /></label>
              <label className="block text-xs font-semibold">
                <span className="flex items-center justify-between"><span>Mật khẩu tạm</span><button type="button" onClick={() => setForm({ ...form, password: generatePassword() })} className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">Tạo ngẫu nhiên</button></span>
                <span className="relative mt-2 block"><input required minLength={8} type={showPassword ? "text" : "password"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full rounded-xl border border-[hsl(var(--border))]/70 bg-transparent px-3 py-2.5 pr-11 text-sm outline-none transition focus:border-[hsl(var(--foreground))]" placeholder="Tối thiểu 8 ký tự" /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs font-semibold">Khối<select value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} className={inputClass}><option value="">—</option>{Array.from({ length: 7 }, (_, i) => i + 6).map((grade) => <option key={grade} value={grade}>{grade}</option>)}</select></label>
                <label className="block text-xs font-semibold">Lớp<input value={form.studentClass} onChange={(e) => setForm({ ...form, studentClass: e.target.value })} className={inputClass} placeholder="12A1" /></label>
              </div>
              <label className="block text-xs font-semibold">Số điện thoại (tùy chọn)<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} placeholder="09xx xxx xxx" /></label>
              <button disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-full bg-[hsl(var(--foreground))] px-5 py-3 text-sm font-bold text-[hsl(var(--background))] disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />} Cấp tài khoản
              </button>
            </form>

            {issued && (
              <div className="mt-5 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm">
                <p className="flex items-center gap-2 font-semibold text-emerald-600"><Check className="h-4 w-4" /> Đã cấp tài khoản</p>
                <dl className="mt-3 space-y-1.5 font-mono text-xs"><div><dt className="inline text-[hsl(var(--muted-foreground))]">Email: </dt><dd className="inline">{issued.email}</dd></div><div><dt className="inline text-[hsl(var(--muted-foreground))]">Mật khẩu: </dt><dd className="inline">{issued.password}</dd></div></dl>
                <button type="button" onClick={() => void copyCredentials()} className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 px-3 py-1.5 text-xs font-semibold text-emerald-600"><Clipboard className="h-3.5 w-3.5" /> {copied ? "Đã sao chép" : "Sao chép để gửi"}</button>
              </div>
            )}
          </section>

          <section>
            <div className="mb-4 flex items-center justify-between"><div><h2 className="text-xl font-semibold">Học sinh đang quản lý</h2><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Mật khẩu không được lưu hoặc hiển thị lại.</p></div><button type="button" onClick={() => void loadStudents()} aria-label="Tải lại" className="rounded-full border border-[hsl(var(--border))]/70 p-2.5"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></button></div>
            {loading ? (
              <div className="flex min-h-52 items-center justify-center rounded-2xl border border-[hsl(var(--border))]/60"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : students.length === 0 ? (
              <div className="flex min-h-52 flex-col items-center justify-center rounded-2xl border border-dashed border-[hsl(var(--border))] text-center"><Users className="h-8 w-8 text-[hsl(var(--muted-foreground))]" /><p className="mt-3 font-medium">Chưa có học sinh</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Cấp tài khoản đầu tiên bằng biểu mẫu bên trái.</p></div>
            ) : (
              <div className="space-y-3">
                {students.map((student, index) => (
                  <article key={student.id} className="grid gap-4 rounded-2xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-4 sm:grid-cols-[44px_1fr_auto] sm:items-center">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[hsl(var(--muted))]/30 text-sm font-bold">{String(index + 1).padStart(2, "0")}</div>
                    <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate font-semibold">{student.full_name}</h3><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${student.account_status === "active" ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-500"}`}>{student.account_status === "active" ? "Hoạt động" : "Đã khóa"}</span></div><p className="mt-1 truncate text-xs text-[hsl(var(--muted-foreground))]">{student.email} · {student.class || (student.grade ? `Khối ${student.grade}` : "Chưa xếp lớp")}</p></div>
                    <button type="button" onClick={() => void toggleStatus(student)} disabled={actionId === student.id} className="rounded-full border border-[hsl(var(--border))]/70 px-4 py-2 text-xs font-semibold disabled:opacity-50">{actionId === student.id ? <Loader2 className="mx-auto h-3.5 w-3.5 animate-spin" /> : student.account_status === "active" ? "Khóa tài khoản" : "Mở lại"}</button>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
      <TeacherBottomNav />
    </TeacherShell>
  )
}
