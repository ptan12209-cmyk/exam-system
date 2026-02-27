"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, ArrowLeft, FileText, CheckCircle, X, Loader2, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const SUBJECTS = [
    { value: "math", label: "Toán" }, { value: "physics", label: "Vật lý" },
    { value: "chemistry", label: "Hóa học" }, { value: "english", label: "Tiếng Anh" },
    { value: "literature", label: "Ngữ văn" }, { value: "biology", label: "Sinh học" },
    { value: "history", label: "Lịch sử" }, { value: "geography", label: "Địa lý" },
    { value: "other", label: "Khác" },
];

export default function UploadResourcePage() {
    const [title, setTitle] = useState("");
    const [type, setType] = useState<"document" | "exam">("document");
    const [subject, setSubject] = useState("math");
    const [description, setDescription] = useState("");
    const [tags, setTags] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState("");
    const [uploadProgress, setUploadProgress] = useState(0);
    const [user, setUser] = useState<{ id: string } | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const supabase = createClient();
    const router = useRouter();

    useEffect(() => { checkAuth(); }, []);

    const checkAuth = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { router.push("/login"); return; }
        setUser({ id: session.user.id });
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault(); setIsDragging(false);
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile && droppedFile.type === "application/pdf") { setFile(droppedFile); if (!title) setTitle(droppedFile.name.replace(".pdf", "")); }
    }, [title]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) { setFile(selectedFile); if (!title) setTitle(selectedFile.name.replace(".pdf", "")); }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); if (!file || !user) return;
        setUploading(true); setError(""); setUploadProgress(10);
        try {
            const fileExt = file.name.split(".").pop();
            const fileName = `resources/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
            setUploadProgress(30);
            const { error: uploadError } = await supabase.storage.from("exam-pdfs").upload(fileName, file, { cacheControl: "3600", upsert: false });
            if (uploadError) throw new Error("Không thể upload file: " + uploadError.message);
            const { data: urlData } = supabase.storage.from("exam-pdfs").getPublicUrl(fileName);
            setUploadProgress(70);
            const tagArray = tags.split(",").map((t) => t.trim()).filter((t) => t.length > 0);
            const { error: insertError } = await supabase.from("resources").insert({ title, type, subject, description, tags: tagArray, file_url: urlData.publicUrl, uploader_id: user.id });
            if (insertError) throw insertError;
            setUploadProgress(100);
            setTimeout(() => router.push("/resources"), 500);
        } catch (err: unknown) { setError(err instanceof Error ? err.message : "Có lỗi xảy ra"); setUploading(false); }
    };

    return (
        <div className="min-h-screen bg-background">
            <nav className="glass-nav sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16 items-center">
                        <Link href="/"><div className="flex items-center gap-3">
                            <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20"><GraduationCap className="w-5 h-5 text-white" /></div>
                            <span className="text-xl font-bold text-foreground">ExamHub</span>
                        </div></Link>
                        <ThemeToggle />
                    </div>
                </div>
            </nav>

            <div className="max-w-2xl mx-auto px-4 py-8">
                <Link href="/resources" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
                    <ArrowLeft className="w-4 h-4" />Quay lại Kho tài liệu
                </Link>

                <div className="glass-card rounded-2xl overflow-hidden">
                    <div className="p-5 border-b border-border/50">
                        <h2 className="text-xl font-bold text-foreground flex items-center gap-2"><Upload className="w-5 h-5 text-indigo-500" />Tải lên tài liệu</h2>
                        <p className="text-muted-foreground text-sm mt-1">Chia sẻ tài liệu, đề thi với nhóm học tập</p>
                    </div>
                    <div className="p-5">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {error && <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl flex items-center gap-2"><X className="w-4 h-4" />{error}</div>}

                            <div className={cn("border-2 border-dashed rounded-2xl p-8 text-center transition-all",
                                isDragging ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20" :
                                    file ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" :
                                        "border-border hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20"
                            )} onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={handleDrop}>
                                {file ? (
                                    <div className="text-emerald-700 dark:text-emerald-400">
                                        <CheckCircle className="w-12 h-12 mx-auto mb-3 text-emerald-500" />
                                        <p className="font-semibold text-lg">{file.name}</p>
                                        <p className="text-sm text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                        <button type="button" onClick={() => setFile(null)} className="mt-3 text-sm text-red-600 dark:text-red-400 hover:text-red-700 font-medium">Xóa và chọn file khác</button>
                                    </div>
                                ) : (
                                    <div className="text-muted-foreground">
                                        <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
                                        <p className="font-semibold text-foreground">Kéo thả file PDF vào đây</p>
                                        <p className="text-sm mb-4">hoặc</p>
                                        <label className="inline-block px-5 py-2.5 gradient-primary text-white rounded-xl cursor-pointer hover:opacity-90 font-medium shadow-lg shadow-indigo-500/20">
                                            Chọn file<input type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
                                        </label>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2"><Label className="text-foreground font-medium">Tiêu đề *</Label>
                                <Input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="VD: Đề thi thử THPT 2026 - Lần 5" className="bg-card border-border text-foreground" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2"><Label className="text-foreground font-medium">Loại *</Label>
                                    <select value={type} onChange={(e) => setType(e.target.value as "document" | "exam")} className="w-full px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-card text-foreground">
                                        <option value="document">📚 Tài liệu</option><option value="exam">📝 Đề thi</option>
                                    </select>
                                </div>
                                <div className="space-y-2"><Label className="text-foreground font-medium">Môn học *</Label>
                                    <select value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-card text-foreground">
                                        {SUBJECTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2"><Label className="text-foreground font-medium">Mô tả</Label>
                                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Mô tả ngắn về tài liệu..." className="bg-card border-border resize-none text-foreground" />
                            </div>

                            <div className="space-y-2"><Label className="text-foreground font-medium">Tags (phân cách bằng dấu phẩy)</Label>
                                <Input type="text" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="VD: THPT 2026, đại số, khó" className="bg-card border-border text-foreground" />
                            </div>

                            {uploading && <div className="bg-muted/30 rounded-full overflow-hidden h-2"><div className="h-full gradient-primary transition-all duration-300" style={{ width: `${uploadProgress}%` }} /></div>}

                            <Button type="submit" disabled={!file || !title || uploading} className={cn("w-full h-12 text-base font-semibold",
                                !file || !title || uploading ? "bg-muted text-muted-foreground" : "gradient-primary text-white shadow-lg shadow-indigo-500/20 hover:opacity-90"
                            )}>
                                {uploading ? <span className="flex items-center gap-2"><Loader2 className="w-5 h-5 animate-spin" />Đang tải lên... {uploadProgress}%</span> : <span className="flex items-center gap-2"><Upload className="w-5 h-5" />Tải lên</span>}
                            </Button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
