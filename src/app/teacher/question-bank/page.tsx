"use client"

import { useEffect, useState, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Database, Plus, Search, Loader2, BookOpen, Clock, Settings, FolderOpen, BarChart3 } from "lucide-react"
import { SUBJECTS } from "@/lib/subjects"
import Link from "next/link"
import { useToast } from "@/components/ui/toast"
import { TeacherShell } from "@/components/teacher/TeacherShell"
import { TeacherBottomNav } from "@/components/BottomNav"
import { NotificationBell } from "@/components/NotificationBell"
import { UserMenu } from "@/components/UserMenu"
import { useAuth } from "@/hooks/useAuth"
import { cn } from "@/lib/utils"
import { Loading } from "@/components/shared/Loading"

import type { QuestionBank } from "@/types"

const instrumentSerif = { className: "font-instrument-serif" }
const jetbrainsMono = { className: "font-jetbrains-mono" }
const inter = { className: "font-inter" }

export default function QuestionBankPage() {
    const supabase = createClient()
    const { success, error: toastError } = useToast()
    const { user, profile, loading: authLoading, signOut } = useAuth({ requiredRole: "teacher" })

    const [banks, setBanks] = useState<QuestionBank[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")

    // Create Bank Dialog State
    const [isOpen, setIsOpen] = useState(false)
    const [newBankName, setNewBankName] = useState("")
    const [newBankSubject, setNewBankSubject] = useState("toan")
    const [newBankDesc, setNewBankDesc] = useState("")
    const [creating, setCreating] = useState(false)

    useEffect(() => {
        if (user) {
            fetchBanks()
        }
    }, [user])

    const fetchBanks = async () => {
        try {
            const { data, error } = await supabase
                .from("question_banks")
                .select("*")
                .eq("teacher_id", user?.id)
                .order("created_at", { ascending: false })

            if (error) {
                console.error("Error fetching banks:", error)
            } else {
                setBanks(data || [])
            }
        } catch (error) {
            console.error("Error:", error)
        } finally {
            setLoading(false)
        }
    }

    const handleCreateBank = async () => {
        if (!newBankName.trim() || !user) return

        setCreating(true)
        try {
            const { data, error } = await supabase
                .from("question_banks")
                .insert({
                    teacher_id: user.id,
                    name: newBankName.trim(),
                    subject: newBankSubject,
                    description: newBankDesc.trim()
                })
                .select()
                .single()

            if (error) throw error

            setBanks([data, ...banks])
            success("Tạo ngân hàng câu hỏi thành công!")
            setIsOpen(false)
            setNewBankName("")
            setNewBankDesc("")
        } catch (error) {
            console.error("Failed to create bank:", error)
            toastError("Lỗi tạo ngân hàng câu hỏi")
        } finally {
            setCreating(false)
        }
    }

    const handleLogout = async () => { await signOut() }

    const filteredBanks = useMemo(() => {
        return banks.filter(b => b.name.toLowerCase().includes(searchQuery.toLowerCase()))
    }, [banks, searchQuery])

    const pageLoading = authLoading || loading

    if (pageLoading) {
        return (
            <div className="min-h-screen bg-[#0B0A13] flex items-center justify-center">
                <Loading label="Đang tải ngân hàng câu hỏi..." />
            </div>
        )
    }

    return (
        <TeacherShell onLogout={handleLogout} className={cn("bg-[#0B0A13] text-[#F1EDF9]", inter.className)}>
            {/* Mobile Top Header */}
            <header className="fixed inset-x-0 top-0 z-50 border-b border-[#8C87A2]/20 bg-[#0B0A13]/90 px-4 backdrop-blur-md lg:hidden safe-top">
                <div className="flex h-16 items-center justify-between">
                    <Link href="/teacher/dashboard" className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#8C87A2]/20">
                            <BarChart3 className="h-4 w-4 text-[#C18CFF]" />
                        </div>
                        <span className="text-lg font-bold tracking-tighter">ExamHub</span>
                    </Link>
                    <div className="flex items-center gap-2">
                        <NotificationBell />
                        <UserMenu userName={profile?.full_name || ""} userClass="Giáo viên" onLogout={handleLogout} role="teacher" />
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-7xl px-4 pb-24 pt-24 sm:px-6 lg:px-8 lg:py-10">
                
                {/* Header section */}
                <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
                    <div>
                        <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#8C87A2]/20 bg-[#15131F] px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#8C87A2]">
                            <Database className="h-3.5 w-3.5 text-[#C18CFF]" /> Question Bank
                        </p>
                        <h1 className={cn("text-4xl md:text-5xl lg:text-6xl text-[#F1EDF9] font-normal leading-tight", instrumentSerif.className)}>
                            Ngân hàng câu hỏi
                        </h1>
                        <p className="mt-3 text-sm text-[#8C87A2] max-w-xl">
                            Quản lý và xây dựng kho câu hỏi trắc nghiệm của riêng bạn để dễ dàng tạo đề thi sau này.
                        </p>
                    </div>

                    <div className="flex justify-end gap-3">
                        <Dialog open={isOpen} onOpenChange={setIsOpen}>
                            <DialogTrigger asChild>
                                <Button className="rounded-xl bg-[#C18CFF] hover:bg-[#C18CFF]/90 text-[#0B0A13] px-5 py-5 text-xs font-bold shadow-md gap-2">
                                    <Plus className="w-4 h-4 shrink-0" strokeWidth={2.5} /> Tạo kho câu hỏi mới
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-[#15131F] border border-[#8C87A2]/20 text-[#F1EDF9]">
                                <DialogHeader>
                                    <DialogTitle className="text-lg font-bold text-[#F1EDF9]">Tạo Ngân hàng câu hỏi</DialogTitle>
                                    <DialogDescription className="text-xs text-[#8C87A2]">
                                        Kho câu hỏi giúp bạn phân loại và dễ dàng tạo đề thi ngẫu nhiên sau này.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-[#8C87A2] uppercase tracking-wider font-mono">Tên ngân hàng <span className="text-red-500">*</span></Label>
                                        <Input 
                                            placeholder="Vd: Toán Hình Học Lớp 12 - Học Kỳ 1" 
                                            value={newBankName} 
                                            onChange={(e) => setNewBankName(e.target.value)} 
                                            className="rounded-xl border-[#8C87A2]/30 bg-[#0B0A13] text-[#F1EDF9] focus:border-[#C18CFF] focus:ring-[#C18CFF]"
                                        />
                                    </div>
                                    <div className="space-y-2 select-container">
                                        <Label className="text-xs font-bold text-[#8C87A2] uppercase tracking-wider font-mono">Môn học</Label>
                                        <select 
                                            value={newBankSubject} 
                                            onChange={(e) => setNewBankSubject(e.target.value)}
                                            className="w-full rounded-xl border border-[#8C87A2]/30 bg-[#0B0A13] px-4 py-3 text-sm text-[#F1EDF9] focus:border-[#C18CFF] focus:ring-1 focus:ring-[#C18CFF] outline-none transition-all cursor-pointer font-medium"
                                        >
                                            {SUBJECTS.map((s) => (
                                                <option key={s.value} value={s.value} className="bg-[#15131F]">
                                                    {s.icon} {s.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-[#8C87A2] uppercase tracking-wider font-mono">Mô tả (Không bắt buộc)</Label>
                                        <Input 
                                            placeholder="Ghi chú thêm về kho câu hỏi này..." 
                                            value={newBankDesc} 
                                            onChange={(e) => setNewBankDesc(e.target.value)} 
                                            className="rounded-xl border-[#8C87A2]/30 bg-[#0B0A13] text-[#F1EDF9] focus:border-[#C18CFF] focus:ring-[#C18CFF]"
                                        />
                                    </div>
                                </div>
                                <DialogFooter className="flex gap-2">
                                    <Button variant="outline" onClick={() => setIsOpen(false)} className="rounded-xl border-[#8C87A2]/40 text-[#8C87A2] hover:text-[#F1EDF9] bg-transparent">Hủy</Button>
                                    <Button onClick={handleCreateBank} disabled={creating || !newBankName.trim()} className="rounded-xl bg-[#C18CFF] hover:bg-[#C18CFF]/90 text-[#0B0A13] font-bold">
                                        {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                        Tạo mới
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </section>

                {/* Search box */}
                <section className="mt-8 flex items-center gap-3 rounded-xl border border-[#8C87A2]/20 bg-[#15131F] px-4 py-2 max-w-md">
                    <Search className="h-4 w-4 text-[#8C87A2]" />
                    <input 
                        placeholder="Tìm kiếm kho ngân hàng câu hỏi..." 
                        className="w-full bg-transparent text-sm text-[#F1EDF9] outline-none placeholder:text-[#8C87A2]"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </section>

                {/* Banks Grid */}
                <section className="mt-6">
                    {filteredBanks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 text-center rounded-xl border border-[#8C87A2]/20 bg-[#15131F]">
                            <FolderOpen className="w-12 h-12 text-[#8C87A2]/20 mb-4" />
                            <h3 className="text-base font-bold text-[#F1EDF9] mb-1.5">Chưa có ngân hàng câu hỏi nào</h3>
                            <p className="text-xs text-[#8C87A2] max-w-sm mx-auto mb-6">Bạn chưa tạo kho câu hỏi nào hoặc không tìm thấy kết quả phù hợp.</p>
                            <Button onClick={() => setIsOpen(true)} variant="outline" className="rounded-xl border-[#8C87A2]/30 text-[#8C87A2] hover:text-[#C18CFF] hover:border-[#C18CFF] bg-transparent text-xs font-bold">
                                <Plus className="w-4 h-4 mr-2" /> Tạo kho đầu tiên
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredBanks.map((bank) => {
                                const subject = SUBJECTS.find(s => s.value === bank.subject) || SUBJECTS[SUBJECTS.length - 1]
                                return (
                                    <Link href={`/teacher/question-bank/${bank.id}`} key={bank.id}>
                                        <Card className="hover:border-[#C18CFF]/30 transition-all cursor-pointer group bg-[#15131F] border-[#8C87A2]/20 rounded-xl h-full flex flex-col justify-between">
                                            <CardHeader className="pb-3 p-5">
                                                <div className="flex justify-between items-start">
                                                    <div className="w-10 h-10 rounded-lg border border-[#8C87A2]/20 bg-[#0B0A13] flex items-center justify-center text-lg shadow-sm mb-3 group-hover:scale-105 transition-transform">
                                                        {subject.icon}
                                                    </div>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-[#8C87A2] hover:text-[#C18CFF] hover:bg-transparent">
                                                        <Settings className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                                <CardTitle className="text-base font-bold text-[#F1EDF9] group-hover:text-[#C18CFF] transition-colors">{bank.name}</CardTitle>
                                                {bank.description && (
                                                    <CardDescription className="text-xs text-[#8C87A2] line-clamp-2 mt-1">{bank.description}</CardDescription>
                                                )}
                                            </CardHeader>
                                            <CardContent className="mt-auto pt-4 p-5 flex items-center gap-4 text-[10px] text-[#8C87A2] font-mono border-t border-[#8C87A2]/10">
                                                <div className="flex items-center gap-1.5">
                                                    <BookOpen className="w-3.5 h-3.5 text-[#C18CFF]" />
                                                    <span>{subject.label}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Clock className="w-3.5 h-3.5 text-[#C18CFF]" />
                                                    <span>{new Date(bank.created_at || "").toLocaleDateString("vi-VN")}</span>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </Link>
                                )
                            })}
                        </div>
                    )}
                </section>
            </main>

            <TeacherBottomNav />
        </TeacherShell>
    )
}
