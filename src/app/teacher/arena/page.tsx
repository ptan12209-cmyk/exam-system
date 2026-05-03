"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { EmptyState } from "@/components/shared"
import { TeacherSidebar } from "@/components/TeacherSidebar"
import { TeacherShell } from "@/components/teacher/TeacherShell"
import { TeacherBottomNav } from "@/components/BottomNav"
import { NotificationBell } from "@/components/NotificationBell"
import { UserMenu } from "@/components/UserMenu"
import { Plus, Swords, Calendar, Clock, Users, Edit, Trash2, Play, CheckCircle, FileText, X, GraduationCap } from "lucide-react"
import { Loading } from "@/components/shared/Loading"

interface ArenaSession {
  id: string; name: string; description: string | null; exam_id: string | null;
  start_time: string; end_time: string; duration: number; status: string; created_at: string;
  participant_count?: number;
  exam?: { id: string; title: string; subject: string; total_questions: number }
}
interface Exam { id: string; title: string; subject: string; total_questions: number; created_at: string }

export default function ArenaAdminPage() {
  const router = useRouter()
  const supabase = createClient()
  const [sessions, setSessions] = useState<ArenaSession[]>([])
  const [exams, setExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [saving, setSaving] = useState(false)
  const [fullName, setFullName] = useState("")
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [examId, setExamId] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [duration, setDuration] = useState(60)
  const [editingId, setEditingId] = useState<string | null>(null)

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push("/login"); return }
    const { data: profile } = await supabase.from("profiles").select("role, full_name").eq("id", user.id).single()
    if (profile?.role !== "teacher") { router.push("/student/dashboard"); return }
    setFullName(profile.full_name || "")
    const { data: examsData } = await supabase.from("exams").select("id, title, subject, total_questions, created_at").eq("created_by", user.id).order("created_at", { ascending: false })
    if (examsData) setExams(examsData)
    const { data: sessionsData } = await supabase.from("arena_sessions").select(`*, arena_results(count), exams:exam_id (id, title, subject, total_questions)`).eq("created_by", user.id).order("created_at", { ascending: false })
    if (sessionsData) setSessions(sessionsData.map((s: { arena_results: { count: number }[]; exams: Exam }) => ({ ...s, participant_count: s.arena_results?.[0]?.count || 0, exam: s.exams })))
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])
  const resetForm = () => { setName(""); setDescription(""); setExamId(""); setStartTime(""); setEndTime(""); setDuration(60); setEditingId(null) }
  const handleEdit = (session: ArenaSession) => { setEditingId(session.id); setName(session.name); setDescription(session.description || ""); setExamId(session.exam_id || ""); setStartTime(session.start_time.slice(0, 16)); setEndTime(session.end_time.slice(0, 16)); setDuration(session.duration); setShowCreate(true) }
  const handleSubmit = async (e: React.FormEvent) => { e.preventDefault(); if (!name || !examId || !startTime || !endTime) return alert("Vui lòng nhập đầy đủ thông tin và chọn đề thi"); setSaving(true); try { const { data: { user } } = await supabase.auth.getUser(); if (!user) throw new Error("Not authenticated"); const data = { name, description: description || null, exam_id: examId, start_time: new Date(startTime).toISOString(), end_time: new Date(endTime).toISOString(), duration, status: "active", created_by: user.id }; const query = editingId ? supabase.from("arena_sessions").update(data).eq("id", editingId) : supabase.from("arena_sessions").insert(data); const { error } = await query; if (error) throw error; await fetchData(); setShowCreate(false); resetForm() } catch (err) { alert("Lỗi: " + (err as Error).message) } finally { setSaving(false) } }
  const handleDelete = async (id: string) => { if (!confirm("Xóa đợt thi này? Tất cả kết quả sẽ bị xóa.")) return; const { error } = await supabase.from("arena_sessions").delete().eq("id", id); if (error) return alert("Lỗi xóa: " + error.message); await fetchData() }
  const getStatusBadge = (session: ArenaSession) => { const now = new Date(); const start = new Date(session.start_time); const end = new Date(session.end_time); if (now < start) return <span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700"><Clock className="mr-1 h-3 w-3" />Sắp diễn ra</span>; if (now >= start && now <= end) return <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700"><Play className="mr-1 h-3 w-3" />Đang diễn ra</span>; return <span className="inline-flex items-center rounded-full bg-[hsl(var(--muted))]/20 px-2.5 py-0.5 text-xs font-medium text-[hsl(var(--muted-foreground))]"><CheckCircle className="mr-1 h-3 w-3" />Đã kết thúc</span> }
  const handleLogout = async () => { await supabase.auth.signOut(); router.push("/login") }

  if (loading) return <Loading fullPage label="Đang tải đợt thi..." />

  return (
    <TeacherShell onLogout={handleLogout}>
      <header className="lg:hidden fixed top-0 w-full z-50 glass-nav px-4 h-16 flex items-center justify-between safe-top"><div className="flex items-center gap-2"><div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center"><GraduationCap className="w-4 h-4 text-white" /></div><span className="text-lg font-bold text-foreground">ExamHub</span></div><div className="flex items-center gap-2"><NotificationBell /><UserMenu userName={fullName} userClass="Giáo viên" onLogout={handleLogout} role="teacher" /></div></header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10 pt-20 lg:pt-10 pb-24">
        <section className="mb-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div><p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))]/60 px-3 py-1 text-xs uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]"><Swords className="h-3.5 w-3.5" /> Arena</p><h1 className="text-4xl font-semibold tracking-tight md:text-6xl">Quản lý Đấu trường</h1><p className="mt-4 max-w-2xl text-base leading-relaxed text-[hsl(var(--muted-foreground))] md:text-lg">Tạo các đợt thi tập trung cho học sinh với khung thời gian rõ ràng.</p></div>
          <div className="rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-6"><p className="text-sm text-[hsl(var(--muted-foreground))]">Số đợt thi</p><div className="mt-2 text-3xl font-semibold">{sessions.length}</div><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Đang quản lý</p></div>
        </section>

        <div className="mb-6"><Button onClick={() => { resetForm(); setShowCreate(true) }} className="rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:bg-[hsl(var(--foreground))]/90"><Plus className="mr-2 h-4 w-4" />Tạo đợt thi</Button></div>

        {sessions.length === 0 ? <EmptyState icon={Swords} title="Chưa có đợt thi nào" description="Tạo đợt thi mới để tổ chức thi đấu cho học sinh." actionLabel="Tạo đợt thi đầu tiên" onAction={() => setShowCreate(true)} iconColor="text-violet-500" iconBgColor="bg-violet-50 dark:bg-violet-900/20" /> : <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">{sessions.map((session) => <div key={session.id} className="rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] overflow-hidden"><div className="border-b border-[hsl(var(--border))]/50 p-5"><div className="mb-2 flex items-start justify-between gap-3"><div className="min-w-0 flex-1"><h3 className="truncate text-lg font-semibold">{session.name}</h3>{session.exam && <div className="mt-2 inline-flex items-center rounded-lg bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700"><FileText className="mr-1 h-3 w-3" />{session.exam.title}</div>}</div></div><div className="mt-2">{getStatusBadge(session)}</div></div><div className="space-y-4 p-5"><div className="space-y-2 text-sm text-[hsl(var(--muted-foreground))]"><div className="flex items-center gap-2"><Calendar className="h-4 w-4 opacity-60" /><span>{new Date(session.start_time).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span></div><div className="flex items-center gap-2"><Clock className="h-4 w-4 opacity-60" /><span>{session.duration} phút</span></div><div className="flex items-center gap-2"><Users className="h-4 w-4 opacity-60" /><span className="font-medium text-[hsl(var(--foreground))]">{session.participant_count || 0}</span><span>người tham gia</span></div></div><div className="flex gap-2 pt-2"><Button variant="outline" size="sm" onClick={() => handleEdit(session)} className="flex-1 rounded-full">Sửa</Button><Button variant="outline" size="sm" onClick={() => handleDelete(session.id)} className="flex-1 rounded-full">Xóa</Button></div></div></div>)}</div>}

        {showCreate && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"><div className="w-full max-w-lg overflow-hidden rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] shadow-2xl"><div className="flex items-center justify-between border-b border-[hsl(var(--border))]/50 p-5"><h2 className="text-xl font-semibold">{editingId ? "Cập nhật đợt thi" : "Tạo đợt thi mới"}</h2><Button variant="ghost" size="icon" onClick={() => { setShowCreate(false); resetForm() }} className="-mr-2 rounded-full"><X className="h-5 w-5" /></Button></div><div className="p-5"><form onSubmit={handleSubmit} className="space-y-5"><div className="space-y-2"><Label>Tên đợt thi <span className="text-red-500">*</span></Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: Kiểm tra Toán 15 phút" className="rounded-xl" required /></div><div className="space-y-2"><Label>Chọn đề thi <span className="text-red-500">*</span></Label><select value={examId} onChange={(e) => setExamId(e.target.value)} className="w-full rounded-xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--background))] px-3 py-2 text-sm" required><option value="">-- Chọn đề thi --</option>{exams.map((exam) => <option key={exam.id} value={exam.id}>{exam.title} ({exam.total_questions} câu - {exam.subject})</option>)}</select>{!exams.length && <p className="rounded-xl border border-amber-200 bg-amber-50 p-2 text-sm text-amber-700">⚠ Bạn chưa có đề thi nào. <Link href="/teacher/exams/create" className="underline">Tạo ngay</Link></p>}</div><div className="space-y-2"><Label>Mô tả</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Thông tin thêm về đợt thi..." className="rounded-xl" rows={3} /></div><div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label>Bắt đầu <span className="text-red-500">*</span></Label><Input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="rounded-xl" required /></div><div className="space-y-2"><Label>Kết thúc <span className="text-red-500">*</span></Label><Input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="rounded-xl" required /></div></div><div className="space-y-2"><Label>Thời gian làm bài (phút)</Label><Input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} min={5} max={180} className="rounded-xl pl-10" /></div><div className="flex gap-3 border-t border-[hsl(var(--border))]/50 pt-4"><Button type="button" variant="outline" onClick={() => { setShowCreate(false); resetForm() }} className="flex-1 rounded-full">Hủy</Button><Button type="submit" disabled={saving} className="flex-1 rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:bg-[hsl(var(--foreground))]/90">{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : editingId ? "Cập nhật" : <><Plus className="mr-2 h-4 w-4" /> Tạo đợt thi</>}</Button></div></form></div></div></div>}
      </main>
      <TeacherBottomNav />
    </TeacherShell>
  )
}
