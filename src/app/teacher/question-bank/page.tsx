"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Database, Plus, Search, Loader2, BookOpen, Clock, Settings, FolderOpen } from "lucide-react"
import { SUBJECTS } from "@/lib/subjects"
import Link from "next/link"

interface QuestionBank {
    id: string
    name: string
    subject: string
    description: string
    created_at: string
}

export default function QuestionBankPage() {
    const supabase = createClient()
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
        fetchBanks()
    }, [])

    const fetchBanks = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data, error } = await supabase
                .from("question_banks")
                .select("*")
                .eq("teacher_id", user.id)
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
        if (!newBankName.trim()) return

        setCreating(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error("Unauthorized")

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
            setIsOpen(false)
            setNewBankName("")
            setNewBankDesc("")
        } catch (error) {
            console.error("Failed to create bank:", error)
            alert("Lỗi tạo ngân hàng câu hỏi")
        } finally {
            setCreating(false)
        }
    }

    const filteredBanks = banks.filter(b => b.name.toLowerCase().includes(searchQuery.toLowerCase()))

    return (
        <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <Database className="w-8 h-8 text-indigo-600" />
                        Ngân hàng câu hỏi
                    </h1>
                    <p className="text-muted-foreground mt-1">Quản lý và xây dựng kho câu hỏi trắc nghiệm, tự luận của riêng bạn</p>
                </div>

                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                            <Plus className="w-4 h-4" />
                            Tạo Kho Mới
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Tạo Ngân hàng câu hỏi</DialogTitle>
                            <DialogDescription>
                                Kho câu hỏi giúp bạn phân loại và dễ dàng tạo đề thi ngẫu nhiên sau này.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Tên ngân hàng <span className="text-red-500">*</span></Label>
                                <Input 
                                    placeholder="Vd: Toán Hình Học Lớp 12 - Học Kỳ 1" 
                                    value={newBankName} 
                                    onChange={(e) => setNewBankName(e.target.value)} 
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Môn học</Label>
                                <Select value={newBankSubject} onValueChange={setNewBankSubject}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {SUBJECTS.map((s) => (
                                            <SelectItem key={s.value} value={s.value}>
                                                {s.icon} {s.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Mô tả (Không bắt buộc)</Label>
                                <Input 
                                    placeholder="Ghi chú thêm về kho câu hỏi này..." 
                                    value={newBankDesc} 
                                    onChange={(e) => setNewBankDesc(e.target.value)} 
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsOpen(false)}>Hủy</Button>
                            <Button onClick={handleCreateBank} disabled={creating || !newBankName.trim()}>
                                {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Tạo mới
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <Input 
                    placeholder="Tìm kiếm ngân hàng câu hỏi..." 
                    className="pl-10 max-w-md bg-white dark:bg-slate-900 border-indigo-100 dark:border-indigo-900 focus-visible:ring-indigo-500"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                </div>
            ) : filteredBanks.length === 0 ? (
                <div className="text-center py-20 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100 border-dashed">
                    <FolderOpen className="w-16 h-16 text-indigo-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-indigo-900 dark:text-indigo-300 mb-2">Chưa có ngân hàng câu hỏi nào</h3>
                    <p className="text-muted-foreground max-w-md mx-auto mb-6">Bạn chưa tạo kho câu hỏi nào hoặc không tìm thấy kết quả phù hợp.</p>
                    <Button onClick={() => setIsOpen(true)} variant="outline" className="border-indigo-200 text-indigo-700 hover:bg-indigo-50">
                        <Plus className="w-4 h-4 mr-2" /> Tạo kho đầu tiên
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredBanks.map((bank) => {
                        const subject = SUBJECTS.find(s => s.value === bank.subject) || SUBJECTS[SUBJECTS.length - 1]
                        return (
                            <Link href={`/teacher/question-bank/${bank.id}`} key={bank.id}>
                                <Card className="hover:shadow-md transition-shadow cursor-pointer group border-indigo-100 dark:border-indigo-900 h-full flex flex-col">
                                    <CardHeader className="pb-3">
                                        <div className="flex justify-between items-start">
                                            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${subject.color} flex items-center justify-center text-white text-lg shadow-sm mb-3 group-hover:scale-110 transition-transform`}>
                                                {subject.icon}
                                            </div>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Settings className="w-4 h-4" />
                                            </Button>
                                        </div>
                                        <CardTitle className="line-clamp-2 text-lg group-hover:text-indigo-600 transition-colors">{bank.name}</CardTitle>
                                        {bank.description && (
                                            <CardDescription className="line-clamp-2 mt-1">{bank.description}</CardDescription>
                                        )}
                                    </CardHeader>
                                    <CardContent className="mt-auto pt-4 flex items-center gap-4 text-xs text-muted-foreground border-t border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center gap-1">
                                            <BookOpen className="w-3 h-3" />
                                            <span>{subject.label}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            <span>{new Date(bank.created_at).toLocaleDateString("vi-VN")}</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
