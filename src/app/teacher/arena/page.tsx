"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Plus, Swords, Calendar, Clock, Users, Edit, Trash2, Loader2, Play, CheckCircle, FileText, X, GraduationCap
} from "lucide-react"
import { EmptyState } from "@/components/shared"
import { TeacherSidebar } from "@/components/TeacherSidebar"
import { NotificationBell } from "@/components/NotificationBell"
import { UserMenu } from "@/components/UserMenu"
import { TeacherBottomNav } from "@/components/BottomNav"

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

    useEffect(() => { fetchData() }, [])

    const fetchData = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push("/login"); return }
        const { data: profile } = await supabase.from("profiles").select("role, full_name").eq("id", user.id).single()
        if (profile?.role !== "teacher") { router.push("/student/dashboard"); return }
        setFullName(profile.full_name || "")
        const { data: examsData } = await supabase.from("exams").select("id, title, subject, total_questions, created_at").eq("created_by", user.id).order("created_at", { ascending: false })
        if (examsData) setExams(examsData)
        const { data: sessionsData } = await supabase.from("arena_sessions").select(`*, arena_results(count), exams:exam_id (id, title, subject, total_questions)`).eq("created_by", user.id).order("created_at", { ascending: false })
        if (sessionsData) {
            const formatted = sessionsData.map((s: { id: string, name: string, description: string | null, exam_id: string | null, start_time: string, end_time: string, duration: number, status: string, created_at: string, arena_results: { count: number }[], exams: Exam }) => ({
                ...s, participant_count: s.arena_results?.[0]?.count || 0, exam: s.exams
            }))
            setSessions(formatted)
        }
        setLoading(false)
    }

    const resetForm = () => { setName(""); setDescription(""); setExamId(""); setStartTime(""); setEndTime(""); setDuration(60); setEditingId(null) }

    const handleEdit = (session: ArenaSession) => {
        setEditingId(session.id); setName(session.name); setDescription(session.description || ""); setExamId(session.exam_id || "")
        setStartTime(session.start_time.slice(0, 16)); setEndTime(session.end_time.slice(0, 16)); setDuration(session.duration); setShowCreate(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name || !examId || !startTime || !endTime) { alert("Vui lòng nhập đầy đủ thông tin và chọn đề thi"); return }
        setSaving(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error("Not authenticated")
            const data = { name, description: description || null, exam_id: examId, start_time: new Date(startTime).toISOString(), end_time: new Date(endTime).toISOString(), duration, status: "active", created_by: user.id }
            if (editingId) { const { error } = await supabase.from("arena_sessions").update(data).eq("id", editingId); if (error) throw error }
            else { const { error } = await supabase.from("arena_sessions").insert(data); if (error) throw error }
            await fetchData(); setShowCreate(false); resetForm()
        } catch (err) { alert("Lỗi: " + (err as Error).message) }
        finally { setSaving(false) }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Xóa đợt thi này? Tất cả kết quả sẽ bị xóa.")) return
        const { error } = await supabase.from("arena_sessions").delete().eq("id", id)
        if (error) { alert("Lỗi xóa: " + error.message); return }
        await fetchData()
    }

    const getStatusBadge = (session: ArenaSession) => {
        const now = new Date(); const start = new Date(session.start_time); const end = new Date(session.end_time)
        if (now < start) return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"><Clock className="w-3 h-3 mr-1" />Sắp diễn ra</span>
        if (now >= start && now <= end) return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 animate-pulse"><Play className="w-3 h-3 mr-1" />Đang diễn ra</span>
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground"><CheckCircle className="w-3 h-3 mr-1" />Đã kết thúc</span>
    }

    const handleLogout = async () => { await supabase.auth.signOut(); router.push("/login") }

    if (loading) {
        return <div className="min-h-screen bg-background flex items-center justify-center"><div className="flex flex-col items-center gap-3"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /><p className="text-sm text-muted-foreground">Đang tải...</p></div></div>
    }

    return (
        <div className="min-h-screen bg-background flex">
            <TeacherSidebar onLogout={handleLogout} />

            <header className="lg:hidden fixed top-0 w-full z-50 glass-nav px-4 h-16 flex items-center justify-between safe-top">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center"><GraduationCap className="w-4 h-4 text-white" /></div>
                    <span className="text-lg font-bold text-foreground">ExamHub</span>
                </div>
                <div className="flex items-center gap-2">
                    <NotificationBell />
                    <UserMenu userName={fullName} userClass="Giáo viên" onLogout={handleLogout} role="teacher" />
                </div>
            </header>

            <main className="flex-1 lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-8 pb-24 lg:pb-8">
                <div className="hidden lg:flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Swords className="w-6 h-6 text-violet-500" />Quản lý Đấu trường</h1>
                        <p className="text-muted-foreground">Tạo và quản lý các đợt thi tập trung</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button onClick={() => { resetForm(); setShowCreate(true) }} className="gradient-primary text-white border-0 shadow-lg shadow-indigo-500/20 hover:opacity-90"><Plus className="w-4 h-4 mr-2" />Tạo đợt thi</Button>
                        <NotificationBell />
                        <UserMenu userName={fullName} userClass="Giáo viên" onLogout={handleLogout} role="teacher" />
                    </div>
                </div>

                <div className="lg:hidden mb-4">
                    <Button onClick={() => { resetForm(); setShowCreate(true) }} className="w-full gradient-primary text-white border-0 shadow-lg shadow-indigo-500/20"><Plus className="w-4 h-4 mr-2" />Tạo đợt thi</Button>
                </div>

                {sessions.length === 0 ? (
                    <EmptyState icon={Swords} title="Chưa có đợt thi nào" description="Tạo đợt thi mới để tổ chức thi đấu cho học sinh"
                        actionLabel="Tạo đợt thi đầu tiên" onAction={() => setShowCreate(true)} iconColor="text-violet-500" iconBgColor="bg-violet-50 dark:bg-violet-900/20" />
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {sessions.map(session => (
                            <div key={session.id} className="glass-card rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 group">
                                <div className="p-5 border-b border-border/50">
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="space-y-1.5 flex-1 min-w-0">
                                            <h3 className="text-lg font-bold text-foreground line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" title={session.name}>{session.name}</h3>
                                            {session.exam && (
                                                <div className="flex items-center text-xs text-violet-600 dark:text-violet-400 font-medium bg-violet-50 dark:bg-violet-900/20 px-2 py-0.5 rounded-lg w-fit">
                                                    <FileText className="w-3 h-3 mr-1" />{session.exam.title}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="mt-2">{getStatusBadge(session)}</div>
                                </div>
                                <div className="p-5 space-y-4">
                                    <div className="space-y-2 text-sm text-muted-foreground">
                                        <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-muted-foreground/60" /><span>{new Date(session.start_time).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span></div>
                                        <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-muted-foreground/60" /><span>{session.duration} phút</span></div>
                                        <div className="flex items-center gap-2"><Users className="w-4 h-4 text-muted-foreground/60" /><span className="font-medium text-foreground">{session.participant_count || 0}</span><span>người tham gia</span></div>
                                    </div>
                                    <div className="flex gap-2 pt-2">
                                        <Button variant="outline" size="sm" onClick={() => handleEdit(session)} className="flex-1 border-border text-muted-foreground hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-300 dark:hover:border-indigo-700">
                                            <Edit className="w-4 h-4 mr-1" />Sửa
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={() => handleDelete(session.id)} className="flex-1 border-border text-muted-foreground hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-700">
                                            <Trash2 className="w-4 h-4 mr-1" />Xóa
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {showCreate && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                        <div className="w-full max-w-lg glass-card rounded-2xl overflow-hidden shadow-2xl">
                            <div className="flex items-center justify-between p-5 border-b border-border/50">
                                <h2 className="text-xl font-bold text-foreground">{editingId ? "Cập nhật đợt thi" : "Tạo đợt thi mới"}</h2>
                                <Button variant="ghost" size="icon" onClick={() => { setShowCreate(false); resetForm() }} className="text-muted-foreground hover:text-foreground hover:bg-muted/50 -mr-2"><X className="w-5 h-5" /></Button>
                            </div>
                            <div className="p-5">
                                <form onSubmit={handleSubmit} className="space-y-5">
                                    <div className="space-y-2">
                                        <Label className="text-foreground font-medium">Tên đợt thi <span className="text-red-500">*</span></Label>
                                        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: Kiểm tra Toán 15 phút - Lớp 12A" className="bg-card border-border focus:ring-indigo-500 text-foreground" required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-foreground font-medium">Chọn đề thi <span className="text-red-500">*</span></Label>
                                        <select value={examId} onChange={(e) => setExamId(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-card text-foreground" required>
                                            <option value="">-- Chọn đề thi --</option>
                                            {exams.map(exam => <option key={exam.id} value={exam.id}>{exam.title} ({exam.total_questions} câu - {exam.subject})</option>)}
                                        </select>
                                        {exams.length === 0 && <p className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-2 rounded-xl border border-amber-200 dark:border-amber-800">⚠ Bạn chưa có đề thi nào. <Link href="/teacher/exams/create" className="underline font-medium hover:text-amber-800">Tạo ngay</Link></p>}
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-foreground font-medium">Mô tả</Label>
                                        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Thông tin thêm về đợt thi..." className="bg-card border-border focus:ring-indigo-500 resize-none text-foreground" rows={3} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-foreground font-medium">Bắt đầu <span className="text-red-500">*</span></Label>
                                            <Input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="bg-card border-border focus:ring-indigo-500 text-foreground" required />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-foreground font-medium">Kết thúc <span className="text-red-500">*</span></Label>
                                            <Input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="bg-card border-border focus:ring-indigo-500 text-foreground" required />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-foreground font-medium">Thời gian làm bài (phút)</Label>
                                        <div className="relative">
                                            <Input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} min={5} max={180} className="bg-card border-border focus:ring-indigo-500 pl-10 text-foreground" />
                                            <Clock className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                                        </div>
                                    </div>
                                    <div className="flex gap-3 pt-4 font-medium">
                                        <Button type="button" variant="outline" onClick={() => { setShowCreate(false); resetForm() }} className="flex-1 border-border text-muted-foreground hover:bg-muted/50">Hủy</Button>
                                        <Button type="submit" disabled={saving} className="flex-1 gradient-primary text-white border-0 shadow-lg shadow-indigo-500/20">
                                            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : editingId ? "Cập nhật" : <><Plus className="w-4 h-4 mr-2" /> Tạo đợt thi</>}
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            <TeacherBottomNav />
        </div>
    )
}
