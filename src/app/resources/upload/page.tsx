"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Upload, ArrowLeft, FileText, CheckCircle, X, Loader2, GraduationCap } from "lucide-react"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/ui/ThemeToggle"

const SUBJECTS = [
  { value: "math", label: "Toán" },
  { value: "physics", label: "Vật lý" },
  { value: "chemistry", label: "Hóa học" },
  { value: "english", label: "Tiếng Anh" },
  { value: "literature", label: "Ngữ văn" },
  { value: "biology", label: "Sinh học" },
  { value: "history", label: "Lịch sử" },
  { value: "geography", label: "Địa lý" },
  { value: "other", label: "Khác" },
]

export default function UploadResourcePage() {
  const router = useRouter()
  const supabase = createClient()
  const [title, setTitle] = useState("")
  const [type, setType] = useState<"document" | "exam">("document")
  const [subject, setSubject] = useState("math")
  const [description, setDescription] = useState("")
  const [tags, setTags] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const [uploadProgress, setUploadProgress] = useState(0)
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => { (async () => { const { data: { user } } = await supabase.auth.getUser(); if (!user) { router.push("/login"); return } setUser({ id: user.id }) })() }, [router, supabase])

  const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); const droppedFile = e.dataTransfer.files[0]; if (droppedFile && droppedFile.type === "application/pdf") { setFile(droppedFile); if (!title) setTitle(droppedFile.name.replace(/\.pdf$/i, "")) } }, [title])
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { const selectedFile = e.target.files?.[0]; if (selectedFile) { setFile(selectedFile); if (!title) setTitle(selectedFile.name.replace(/\.pdf$/i, "")) } }
  const handleSubmit = async (e: React.FormEvent) => { e.preventDefault(); if (!file || !user) return; setUploading(true); setError(""); setUploadProgress(10); try { const fileExt = file.name.split(".").pop(); const fileName = `resources/${Date.now()}_${Math.random().toString(36).slice(2, 9)}.${fileExt}`; setUploadProgress(30); const { error: uploadError } = await supabase.storage.from("exam-pdfs").upload(fileName, file, { cacheControl: "3600", upsert: false }); if (uploadError) throw new Error("Không thể upload file: " + uploadError.message); const { data: urlData } = supabase.storage.from("exam-pdfs").getPublicUrl(fileName); setUploadProgress(70); const tagArray = tags.split(",").map((t) => t.trim()).filter(Boolean); const { error: insertError } = await supabase.from("resources").insert({ title, type, subject, description, tags: tagArray, file_url: urlData.publicUrl, uploader_id: user.id }); if (insertError) throw insertError; setUploadProgress(100); router.push("/resources") } catch (err: unknown) { setError(err instanceof Error ? err.message : "Có lỗi xảy ra"); setUploading(false) } }

  return <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))]"><nav className="sticky top-0 z-50 border-b border-[hsl(var(--border))]/25 bg-[hsl(var(--background))]/70 backdrop-blur-md"><div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"><Link href="/" className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--foreground))] text-[hsl(var(--background))]"><GraduationCap className="h-5 w-5" /></div><span className="text-xl font-bold">ExamHub</span></Link><ThemeToggle /></div></nav><main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12"><Link href="/resources" className="mb-6 inline-flex items-center gap-2 text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))]"><ArrowLeft className="h-4 w-4" />Quay lại Kho tài liệu</Link><section className="overflow-hidden rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))]/90 shadow-[0_30px_80px_rgba(0,0,0,0.25)]"><div className="border-b border-[hsl(var(--border))]/50 p-6"><h1 className="flex items-center gap-2 text-2xl font-semibold"><Upload className="h-5 w-5" />Tải lên tài liệu</h1><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Chia sẻ tài liệu, đề thi với nhóm học tập</p></div><div className="p-6"><form onSubmit={handleSubmit} className="space-y-6">{error && <div className="flex items-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/8 px-4 py-3 text-sm text-red-500"><X className="h-4 w-4" />{error}</div>}<div className={cn("rounded-[1.75rem] border-2 border-dashed p-8 text-center transition-all", isDragging ? "border-[hsl(var(--foreground))] bg-[hsl(var(--foreground))]/5" : file ? "border-emerald-500 bg-emerald-500/5" : "border-[hsl(var(--border))]/60 hover:border-[hsl(var(--foreground))]/40 hover:bg-[hsl(var(--muted))]/10")} onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }} onDragLeave={() => setIsDragging(false)} onDrop={handleDrop}>{file ? <div className="text-emerald-600"><CheckCircle className="mx-auto mb-3 h-12 w-12" /><p className="text-lg font-semibold">{file.name}</p><p className="text-sm text-[hsl(var(--muted-foreground))]">{(file.size / 1024 / 1024).toFixed(2)} MB</p><button type="button" onClick={() => setFile(null)} className="mt-3 text-sm font-medium text-red-500 hover:text-red-600">Xóa và chọn file khác</button></div> : <div className="text-[hsl(var(--muted-foreground))]"><FileText className="mx-auto mb-3 h-12 w-12" /><p className="text-base font-semibold text-[hsl(var(--foreground))]">Kéo thả file PDF vào đây</p><p className="mb-4 text-sm">hoặc</p><label className="inline-flex cursor-pointer items-center rounded-full bg-[hsl(var(--foreground))] px-5 py-2.5 text-sm font-semibold text-[hsl(var(--background))] shadow-[0_20px_40px_rgba(0,0,0,0.18)]"><span>Chọn file</span><input type="file" accept=".pdf" onChange={handleFileChange} className="hidden" /></label></div>}</div><div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label>Tiêu đề *</Label><Input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="VD: Đề thi thử THPT 2026 - Lần 5" className="rounded-xl" /></div><div className="space-y-2"><Label>Loại *</Label><select value={type} onChange={(e) => setType(e.target.value as "document" | "exam")} className="w-full rounded-xl border border-[hsl(var(--border))]/60 bg-transparent px-3 py-2 text-sm"><option value="document">📚 Tài liệu</option><option value="exam">📝 Đề thi</option></select></div></div><div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label>Môn học *</Label><select value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full rounded-xl border border-[hsl(var(--border))]/60 bg-transparent px-3 py-2 text-sm">{SUBJECTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select></div><div className="space-y-2"><Label>Tags</Label><Input type="text" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="VD: THPT 2026, đại số, khó" className="rounded-xl" /></div></div><div className="space-y-2"><Label>Mô tả</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Mô tả ngắn về tài liệu..." className="rounded-xl resize-none" /></div>{uploading && <div className="h-2 overflow-hidden rounded-full bg-[hsl(var(--muted))]"><div className="h-full bg-[hsl(var(--foreground))] transition-all duration-300" style={{ width: `${uploadProgress}%` }} /></div>}<Button type="submit" disabled={!file || !title || uploading} className="w-full rounded-full bg-[hsl(var(--foreground))] py-6 text-base font-semibold text-[hsl(var(--background))] hover:bg-[hsl(var(--foreground))]/90 disabled:cursor-not-allowed disabled:opacity-50">{uploading ? <span className="flex items-center gap-2"><Loader2 className="h-5 w-5 animate-spin" />Đang tải lên... {uploadProgress}%</span> : <span className="flex items-center gap-2"><Upload className="h-5 w-5" />Tải lên</span>}</Button></form></div></section></main></div>
}
