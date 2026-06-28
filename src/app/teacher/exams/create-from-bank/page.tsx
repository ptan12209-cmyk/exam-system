"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Loader2, Save, Database, AlertTriangle } from "lucide-react"
import { ExamLinkDialog } from "@/components/ExamLinkDialog"
import { SUBJECTS } from "@/lib/subjects"
import { TeacherShell } from "@/components/teacher/TeacherShell"
import { TeacherBottomNav } from "@/components/BottomNav"
import { NotificationBell } from "@/components/NotificationBell"
import { UserMenu } from "@/components/UserMenu"

export default function CreateExamFromBankPage() {
    const router = useRouter()
    const supabase = createClient()
    
    const [loading, setLoading] = useState(false)
    const [fetchingBanks, setFetchingBanks] = useState(true)
    const [banks, setBanks] = useState<any[]>([])
    
    // Form State
    const [title, setTitle] = useState("")
    const [duration, setDuration] = useState(15)
    const [subject, setSubject] = useState("toan")
    const [selectedBankId, setSelectedBankId] = useState<string>("")
    const [mcCount, setMcCount] = useState(10)
    const [tfCount, setTfCount] = useState(0)
    const [saCount, setSaCount] = useState(0)
    
    const [error, setError] = useState<string | null>(null)
    const [showLinkDialog, setShowLinkDialog] = useState(false)
    const [createdExamId, setCreatedExamId] = useState<string | null>(null)
    const [fullName, setFullName] = useState("")

    useEffect(() => {
        fetchBanks()
        fetchProfile()
    }, [])

    const fetchProfile = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            const { data } = await supabase.from("profiles").select("full_name").eq("id", user.id).single()
            if (data) setFullName(data.full_name || "")
        }
    }

    const fetchBanks = async () => {
        setFetchingBanks(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            const { data } = await supabase.from("question_banks").select("id, name, subject").eq("teacher_id", user.id)
            setBanks(data || [])
        }
        setFetchingBanks(false)
    }

    const handleCreate = async () => {
        if (!title.trim() || !selectedBankId) {
            setError("Vui lòng nhập tên đề thi và chọn ngân hàng câu hỏi")
            return
        }

        if (mcCount + tfCount + saCount <= 0) {
            setError("Đề thi phải có ít nhất 1 câu hỏi")
            return
        }

        setLoading(true)
        setError(null)

        try {
            const response = await fetch('/api/exams/create-from-bank', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bank_id: selectedBankId,
                    title: title.trim(),
                    duration,
                    subject,
                    mc_count: mcCount,
                    tf_count: tfCount,
                    sa_count: saCount,
                    max_attempts: 1,
                    security_level: 1
                })
            })

            const result = await response.json()
            if (!response.ok) throw new Error(result.error)

            setCreatedExamId(result.examId)
            setShowLinkDialog(true)
        } catch (err: any) {
            setError("Lỗi tạo đề thi: " + err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push("/login")
    }

    return (
        <TeacherShell onLogout={handleLogout} className="bg-[#0B0A13] text-[#F1EDF9]">
            {/* Header cho Mobile */}
            <header className="fixed inset-x-0 top-0 z-50 border-b border-[hsl(var(--border))]/25 bg-[hsl(var(--background))]/75 px-4 backdrop-blur-md lg:hidden safe-top">
                <div className="flex h-16 items-center justify-between">
                    <Link href="/teacher/dashboard" className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[hsl(var(--border))]/60">
                            <Database className="h-4 w-4" />
                        </div>
                        <span className="text-lg font-semibold tracking-tight">ExamHub</span>
                    </Link>
                    <div className="flex items-center gap-2">
                        <NotificationBell />
                        <UserMenu userName={fullName} userClass="Giáo viên" onLogout={handleLogout} role="teacher" />
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-3xl px-4 pb-24 pt-24 lg:px-8 lg:py-10">
            <div className="max-w-3xl mx-auto space-y-6">
                <div className="flex items-center gap-4">
                    <Link href="/teacher/dashboard">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold">Tạo đề thi từ Ngân Hàng</h1>
                        <p className="text-muted-foreground text-sm">Hệ thống sẽ bốc câu hỏi ngẫu nhiên từ kho (Digital Exam)</p>
                    </div>
                </div>

                {error && (
                    <div className="p-4 rounded-lg bg-red-50 text-red-600 flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5" />
                        {error}
                    </div>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle>Cấu hình đề thi</CardTitle>
                        <CardDescription>Chọn ngân hàng và số lượng câu hỏi muốn rút</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label>Tên bài thi <span className="text-red-500">*</span></Label>
                            <Input placeholder="VD: Bài kiểm tra 15p Chương 1" value={title} onChange={(e) => setTitle(e.target.value)} />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Môn học</Label>
                                <Select value={subject} onValueChange={setSubject}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {SUBJECTS.map((s) => <SelectItem key={s.value} value={s.value}>{s.icon} {s.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Thời gian làm bài (Phút)</Label>
                                <Input type="number" min={1} value={duration} onChange={(e) => setDuration(parseInt(e.target.value) || 1)} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Ngân hàng câu hỏi <span className="text-red-500">*</span></Label>
                            <Select value={selectedBankId} onValueChange={setSelectedBankId} disabled={fetchingBanks}>
                                <SelectTrigger>
                                    <SelectValue placeholder={fetchingBanks ? "Đang tải..." : "Chọn ngân hàng..."} />
                                </SelectTrigger>
                                <SelectContent>
                                    {banks.map((b) => (
                                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="border rounded-xl p-4 bg-slate-50 dark:bg-slate-800/50 space-y-4">
                            <Label className="text-base font-semibold flex items-center gap-2">
                                <Database className="w-4 h-4 text-indigo-500" /> Cấu trúc đề thi (Số lượng câu)
                            </Label>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>Trắc nghiệm (1 đáp án)</Label>
                                    <Input type="number" min={0} value={mcCount} onChange={(e) => setMcCount(parseInt(e.target.value) || 0)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Đúng / Sai</Label>
                                    <Input type="number" min={0} value={tfCount} onChange={(e) => setTfCount(parseInt(e.target.value) || 0)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Trả lời ngắn</Label>
                                    <Input type="number" min={0} value={saCount} onChange={(e) => setSaCount(parseInt(e.target.value) || 0)} />
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                                * Lưu ý: Số lượng bạn nhập phải NHỎ HƠN HOẶC BẰNG tổng số câu hỏi đang có trong ngân hàng đã chọn.
                            </p>
                        </div>

                        <Button onClick={handleCreate} disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
                            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            Khởi tạo đề thi ngẫu nhiên
                        </Button>
                    </CardContent>
                </Card>
            </div>
            
            {showLinkDialog && createdExamId && (
                <ExamLinkDialog
                    examId={createdExamId}
                    examTitle={title}
                    open={showLinkDialog}
                    onClose={() => {
                        setShowLinkDialog(false)
                        router.push("/teacher/dashboard")
                    }}
                />
            )}
            </main>
            <TeacherBottomNav />
        </TeacherShell>
    )
}
