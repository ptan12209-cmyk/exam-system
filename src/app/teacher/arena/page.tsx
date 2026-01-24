"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
    X,
    Filter
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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    <Clock className="w-3 h-3 mr-1" />
                    Sắp diễn ra
                </span>
            )
        } else if (now >= start && now <= end) {
            return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 animate-pulse">
                    <Play className="w-3 h-3 mr-1" />
                    Đang diễn ra
                </span>
            )
        } else {
            return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Đã kết thúc
                </span>
            )
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-4">
                        <Link href="/teacher/dashboard">
                            <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-900 hover:bg-white bg-white shadow-sm border border-gray-200">
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                                <Swords className="w-6 h-6 text-purple-600" />
                                Quản lý Đấu trường
                            </h1>
                            <p className="text-gray-500 text-sm mt-1">Tạo và quản lý các đợt thi tập trung</p>
                        </div>
                    </div>
                    <Button
                        onClick={() => {
                            resetForm()
                            setShowCreate(true)
                        }}
                        className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-sm"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Tạo đợt thi
                    </Button>
                </div>

                {/* Sessions List */}
                {sessions.length === 0 ? (
                    <Card className="border-gray-200 shadow-sm bg-white">
                        <CardContent className="p-12 text-center">
                            <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Swords className="w-8 h-8 text-purple-500" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 mb-2">Chưa có đợt thi nào</h2>
                            <p className="text-gray-500 mb-6">Tạo đợt thi mới để tổ chức thi đấu cho học sinh</p>
                            <Button
                                onClick={() => setShowCreate(true)}
                                className="bg-purple-600 hover:bg-purple-700 text-white"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Tạo đợt thi đầu tiên
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {sessions.map(session => (
                            <Card key={session.id} className="border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow group">
                                <CardHeader className="pb-3 border-b border-gray-50">
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="space-y-1">
                                            <CardTitle className="text-lg font-bold text-gray-800 line-clamp-1" title={session.name}>
                                                {session.name}
                                            </CardTitle>
                                            {session.exam && (
                                                <div className="flex items-center text-xs text-purple-600 font-medium bg-purple-50 px-2 py-0.5 rounded w-fit">
                                                    <FileText className="w-3 h-3 mr-1" />
                                                    {session.exam.title}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center mt-2">
                                        {getStatusBadge(session)}
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-4 space-y-4">
                                    <div className="space-y-2 text-sm text-gray-600">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-gray-400" />
                                            <span>
                                                {new Date(session.start_time).toLocaleDateString("vi-VN", {
                                                    day: "2-digit",
                                                    month: "2-digit",
                                                    hour: "2-digit",
                                                    minute: "2-digit"
                                                })}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-gray-400" />
                                            <span>{session.duration} phút</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Users className="w-4 h-4 text-gray-400" />
                                            <span className="font-medium text-gray-900">{session.participant_count || 0}</span>
                                            <span>người tham gia</span>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 pt-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleEdit(session)}
                                            className="flex-1 border-gray-200 text-gray-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
                                        >
                                            <Edit className="w-4 h-4 mr-1" />
                                            Sửa
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleDelete(session.id)}
                                            className="flex-1 border-gray-200 text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
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
            </div>

            {/* Create/Edit Modal */}
            {showCreate && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <Card className="w-full max-w-lg border-gray-200 bg-white shadow-xl">
                        <CardHeader className="flex flex-row items-center justify-between border-b border-gray-100 pb-4">
                            <CardTitle className="text-gray-800 text-xl">
                                {editingId ? "Cập nhật đợt thi" : "Tạo đợt thi mới"}
                            </CardTitle>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                    setShowCreate(false)
                                    resetForm()
                                }}
                                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 -mr-2"
                            >
                                <X className="w-5 h-5" />
                            </Button>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div className="space-y-2">
                                    <Label className="text-gray-700 font-medium">Tên đợt thi <span className="text-red-500">*</span></Label>
                                    <Input
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="VD: Kiểm tra Toán 15 phút - Lớp 12A"
                                        className="bg-white border-gray-300 focus:ring-purple-500 focus:border-purple-500"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-gray-700 font-medium">Chọn đề thi <span className="text-red-500">*</span></Label>
                                    <select
                                        value={examId}
                                        onChange={(e) => setExamId(e.target.value)}
                                        className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white text-gray-900"
                                        required
                                    >
                                        <option value="">-- Chọn đề thi --</option>
                                        {exams.map(exam => (
                                            <option key={exam.id} value={exam.id}>
                                                {exam.title} ({exam.total_questions} câu - {exam.subject})
                                            </option>
                                        ))}
                                    </select>
                                    {exams.length === 0 && (
                                        <p className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded border border-yellow-200">
                                            ⚠ Bạn chưa có đề thi nào. <Link href="/teacher/exams/create" className="underline font-medium hover:text-yellow-800">Tạo ngay</Link>
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-gray-700 font-medium">Mô tả</Label>
                                    <Textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Thông tin thêm về đợt thi..."
                                        className="bg-white border-gray-300 focus:ring-purple-500 focus:border-purple-500 resize-none"
                                        rows={3}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-gray-700 font-medium">Bắt đầu <span className="text-red-500">*</span></Label>
                                        <Input
                                            type="datetime-local"
                                            value={startTime}
                                            onChange={(e) => setStartTime(e.target.value)}
                                            className="bg-white border-gray-300 focus:ring-purple-500 focus:border-purple-500"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-gray-700 font-medium">Kết thúc <span className="text-red-500">*</span></Label>
                                        <Input
                                            type="datetime-local"
                                            value={endTime}
                                            onChange={(e) => setEndTime(e.target.value)}
                                            className="bg-white border-gray-300 focus:ring-purple-500 focus:border-purple-500"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-gray-700 font-medium">Thời gian làm bài (phút)</Label>
                                    <div className="relative">
                                        <Input
                                            type="number"
                                            value={duration}
                                            onChange={(e) => setDuration(Number(e.target.value))}
                                            min={5}
                                            max={180}
                                            className="bg-white border-gray-300 focus:ring-purple-500 focus:border-purple-500 pl-10"
                                        />
                                        <Clock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-4 font-medium">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            setShowCreate(false)
                                            resetForm()
                                        }}
                                        className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
                                    >
                                        Hủy
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={saving}
                                        className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
                                    >
                                        {saving ? (
                                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                        ) : editingId ? (
                                            "Cập nhật"
                                        ) : (
                                            <><Plus className="w-4 h-4 mr-2" /> Tạo đợt thi</>
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
