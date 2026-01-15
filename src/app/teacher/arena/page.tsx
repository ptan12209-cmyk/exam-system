"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import {
    ArrowLeft,
    Plus,
    Swords,
    Calendar,
    Clock,
    Users,
    Trophy,
    Edit,
    Trash2,
    Loader2,
    Play,
    Pause,
    CheckCircle,
    FileText,
    X
} from "lucide-react"
import { cn } from "@/lib/utils"

interface ArenaSession {
    id: string
    name: string
    description: string | null
    exam_id: string | null
    start_time: string
    end_time: string
    duration: number
    status: string
    created_at: string
    participant_count?: number
    exam?: {
        id: string
        title: string
        subject: string
        total_questions: number
    }
}

interface Exam {
    id: string
    title: string
    subject: string
    total_questions: number
    created_at: string
}

export default function ArenaAdminPage() {
    const router = useRouter()
    const supabase = createClient()

    const [sessions, setSessions] = useState<ArenaSession[]>([])
    const [exams, setExams] = useState<Exam[]>([])
    const [loading, setLoading] = useState(true)
    const [showCreate, setShowCreate] = useState(false)
    const [saving, setSaving] = useState(false)

    // Form state
    const [name, setName] = useState("")
    const [description, setDescription] = useState("")
    const [examId, setExamId] = useState("")
    const [startTime, setStartTime] = useState("")
    const [endTime, setEndTime] = useState("")
    const [duration, setDuration] = useState(60)
    const [editingId, setEditingId] = useState<string | null>(null)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            router.push("/login")
            return
        }

        // Check if teacher
        const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single()

        if (profile?.role !== "teacher") {
            router.push("/student/dashboard")
            return
        }

        // Fetch exams for dropdown
        const { data: examsData } = await supabase
            .from("exams")
            .select("id, title, subject, total_questions, created_at")
            .eq("created_by", user.id)
            .order("created_at", { ascending: false })

        if (examsData) {
            setExams(examsData)
        }

        // Fetch sessions with exam info and participant count
        const { data: sessionsData } = await supabase
            .from("arena_sessions")
            .select(`
                *,
                arena_results(count),
                exams:exam_id (id, title, subject, total_questions)
            `)
            .eq("created_by", user.id)
            .order("created_at", { ascending: false })

        if (sessionsData) {
            const formatted = sessionsData.map((s: any) => ({
                ...s,
                participant_count: s.arena_results?.[0]?.count || 0,
                exam: s.exams
            }))
            setSessions(formatted)
        }

        setLoading(false)
    }

    const resetForm = () => {
        setName("")
        setDescription("")
        setExamId("")
        setStartTime("")
        setEndTime("")
        setDuration(60)
        setEditingId(null)
    }

    const handleEdit = (session: ArenaSession) => {
        setEditingId(session.id)
        setName(session.name)
        setDescription(session.description || "")
        setExamId(session.exam_id || "")
        setStartTime(session.start_time.slice(0, 16))
        setEndTime(session.end_time.slice(0, 16))
        setDuration(session.duration)
        setShowCreate(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!name || !examId || !startTime || !endTime) {
            alert("Vui lòng nhập đầy đủ thông tin và chọn đề thi")
            return
        }

        setSaving(true)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error("Not authenticated")

            const data = {
                name,
                description: description || null,
                exam_id: examId,
                start_time: new Date(startTime).toISOString(),
                end_time: new Date(endTime).toISOString(),
                duration,
                status: "active",
                created_by: user.id
            }

            if (editingId) {
                const { error } = await supabase
                    .from("arena_sessions")
                    .update(data)
                    .eq("id", editingId)

                if (error) throw error
            } else {
                const { error } = await supabase
                    .from("arena_sessions")
                    .insert(data)

                if (error) throw error
            }

            await fetchData()
            setShowCreate(false)
            resetForm()
        } catch (err) {
            alert("Lỗi: " + (err as Error).message)
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Xóa đợt thi này? Tất cả kết quả sẽ bị xóa.")) return

        const { error } = await supabase
            .from("arena_sessions")
            .delete()
            .eq("id", id)

        if (error) {
            alert("Lỗi xóa: " + error.message)
            return
        }

        await fetchData()
    }

    const getStatusBadge = (session: ArenaSession) => {
        const now = new Date()
        const start = new Date(session.start_time)
        const end = new Date(session.end_time)

        if (now < start) {
            return (
                <span className="px-2 py-1 text-xs rounded-full bg-blue-500/20 text-blue-400">
                    <Clock className="w-3 h-3 inline mr-1" />
                    Sắp diễn ra
                </span>
            )
        } else if (now >= start && now <= end) {
            return (
                <span className="px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-400">
                    <Play className="w-3 h-3 inline mr-1" />
                    Đang diễn ra
                </span>
            )
        } else {
            return (
                <span className="px-2 py-1 text-xs rounded-full bg-slate-500/20 text-slate-400">
                    <CheckCircle className="w-3 h-3 inline mr-1" />
                    Đã kết thúc
                </span>
            )
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900">
            {/* Header */}
            <header className="border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50">
                <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/teacher/dashboard">
                            <Button variant="ghost" size="icon" className="text-slate-400">
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                        </Link>
                        <div className="flex items-center gap-2">
                            <Swords className="w-6 h-6 text-purple-400" />
                            <h1 className="text-xl font-bold text-white">Quản lý Đấu trường</h1>
                        </div>
                    </div>
                    <Button
                        onClick={() => {
                            resetForm()
                            setShowCreate(true)
                        }}
                        className="bg-gradient-to-r from-purple-600 to-pink-600"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Tạo đợt thi
                    </Button>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 py-8">
                {/* Sessions Grid */}
                {sessions.length === 0 ? (
                    <Card className="border-slate-700 bg-slate-800/50">
                        <CardContent className="p-12 text-center">
                            <Swords className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                            <h2 className="text-xl font-semibold text-white mb-2">Chưa có đợt thi nào</h2>
                            <p className="text-slate-400 mb-6">Tạo đợt thi mới để học sinh tham gia</p>
                            <Button
                                onClick={() => setShowCreate(true)}
                                className="bg-gradient-to-r from-purple-600 to-pink-600"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Tạo đợt thi đầu tiên
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {sessions.map(session => (
                            <Card key={session.id} className="border-slate-700 bg-slate-800/50 hover:border-purple-500/50 transition-colors">
                                <CardHeader className="pb-2">
                                    <div className="flex items-start justify-between">
                                        <CardTitle className="text-lg text-white">{session.name}</CardTitle>
                                        {getStatusBadge(session)}
                                    </div>
                                    {session.exam && (
                                        <p className="text-sm text-purple-400 flex items-center gap-1">
                                            <FileText className="w-3 h-3" />
                                            {session.exam.title}
                                        </p>
                                    )}
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="flex items-center gap-4 text-sm text-slate-400">
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-4 h-4" />
                                            {new Date(session.start_time).toLocaleDateString("vi-VN")}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-4 h-4" />
                                            {session.duration} phút
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-4 text-sm">
                                        <span className="text-slate-400 flex items-center gap-1">
                                            <Users className="w-4 h-4" />
                                            {session.participant_count || 0} người thi
                                        </span>
                                        {session.exam && (
                                            <span className="text-slate-400">
                                                {session.exam.total_questions} câu
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex gap-2 pt-2 border-t border-slate-700">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleEdit(session)}
                                            className="flex-1 text-slate-400 hover:text-white"
                                        >
                                            <Edit className="w-4 h-4 mr-1" />
                                            Sửa
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDelete(session.id)}
                                            className="flex-1 text-red-400 hover:text-red-300"
                                        >
                                            <Trash2 className="w-4 h-4 mr-1" />
                                            Xóa
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </main>

            {/* Create/Edit Modal */}
            {showCreate && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-lg border-slate-700 bg-slate-800">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-white">
                                {editingId ? "Sửa đợt thi" : "Tạo đợt thi mới"}
                            </CardTitle>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                    setShowCreate(false)
                                    resetForm()
                                }}
                                className="text-slate-400"
                            >
                                <X className="w-5 h-5" />
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-slate-300">Tên đợt thi *</Label>
                                    <Input
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="VD: Đợt 1 - Tháng 1/2025"
                                        className="bg-slate-700/50 border-slate-600 text-white"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-slate-300">Chọn đề thi *</Label>
                                    <select
                                        value={examId}
                                        onChange={(e) => setExamId(e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white"
                                        required
                                    >
                                        <option value="">-- Chọn đề --</option>
                                        {exams.map(exam => (
                                            <option key={exam.id} value={exam.id}>
                                                {exam.title} ({exam.total_questions} câu - {exam.subject})
                                            </option>
                                        ))}
                                    </select>
                                    {exams.length === 0 && (
                                        <p className="text-sm text-yellow-400">
                                            Chưa có đề thi nào. <Link href="/teacher/exams/create" className="underline">Tạo đề mới</Link>
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-slate-300">Mô tả</Label>
                                    <Textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Mô tả về đợt thi..."
                                        className="bg-slate-700/50 border-slate-600 text-white"
                                        rows={2}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-slate-300">Bắt đầu *</Label>
                                        <Input
                                            type="datetime-local"
                                            value={startTime}
                                            onChange={(e) => setStartTime(e.target.value)}
                                            className="bg-slate-700/50 border-slate-600 text-white"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-slate-300">Kết thúc *</Label>
                                        <Input
                                            type="datetime-local"
                                            value={endTime}
                                            onChange={(e) => setEndTime(e.target.value)}
                                            className="bg-slate-700/50 border-slate-600 text-white"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-slate-300">Thời gian làm bài (phút)</Label>
                                    <Input
                                        type="number"
                                        value={duration}
                                        onChange={(e) => setDuration(Number(e.target.value))}
                                        min={10}
                                        max={180}
                                        className="bg-slate-700/50 border-slate-600 text-white"
                                    />
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            setShowCreate(false)
                                            resetForm()
                                        }}
                                        className="flex-1 border-slate-600 text-slate-400"
                                    >
                                        Hủy
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={saving}
                                        className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600"
                                    >
                                        {saving ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : editingId ? (
                                            "Cập nhật"
                                        ) : (
                                            "Tạo đợt thi"
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}
