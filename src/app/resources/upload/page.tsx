"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Upload,
    ArrowLeft,
    FileText,
    CheckCircle,
    X,
    Loader2,
    GraduationCap
} from "lucide-react";
import { cn } from "@/lib/utils";

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

    useEffect(() => {
        checkAuth();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const checkAuth = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            router.push("/login");
            return;
        }
        setUser({ id: session.user.id });
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile && droppedFile.type === "application/pdf") {
            setFile(droppedFile);
            if (!title) {
                setTitle(droppedFile.name.replace(".pdf", ""));
            }
        }
    }, [title]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            if (!title) {
                setTitle(selectedFile.name.replace(".pdf", ""));
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !user) return;

        setUploading(true);
        setError("");
        setUploadProgress(10);

        try {
            // 1. Upload file to Supabase Storage (use existing 'exams' bucket)
            const fileExt = file.name.split(".").pop();
            const fileName = `resources/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

            setUploadProgress(30);

            const { error: uploadError } = await supabase.storage
                .from("exam-pdfs")
                .upload(fileName, file, {
                    cacheControl: "3600",
                    upsert: false,
                });

            if (uploadError) {
                throw new Error("Không thể upload file: " + uploadError.message);
            }

            // Get public URL
            const { data: urlData } = supabase.storage
                .from("exam-pdfs")
                .getPublicUrl(fileName);

            setUploadProgress(70);

            // 2. Insert resource record
            const tagArray = tags
                .split(",")
                .map((t) => t.trim())
                .filter((t) => t.length > 0);

            const { error: insertError } = await supabase.from("resources").insert({
                title,
                type,
                subject,
                description,
                tags: tagArray,
                file_url: urlData.publicUrl,
                uploader_id: user.id,
            });

            if (insertError) throw insertError;

            setUploadProgress(100);

            // Redirect to resources page
            setTimeout(() => {
                router.push("/resources");
            }, 500);
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : "Có lỗi xảy ra";
            setError(errorMessage);
            setUploading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Navigation */}
            <nav className="border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16 items-center">
                        <Link href="/">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                                    <GraduationCap className="w-5 h-5 text-white" />
                                </div>
                                <span className="text-xl font-bold text-gray-900">LuyenDe 2026</span>
                            </div>
                        </Link>
                    </div>
                </div>
            </nav>

            <div className="max-w-2xl mx-auto px-4 py-8">
                {/* Back button */}
                <Link href="/resources" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6">
                    <ArrowLeft className="w-4 h-4" />
                    Quay lại Kho tài liệu
                </Link>

                <Card className="border-gray-200 shadow-sm bg-white">
                    <CardHeader className="border-b border-gray-50">
                        <CardTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <Upload className="w-5 h-5 text-blue-600" />
                            Tải lên tài liệu
                        </CardTitle>
                        <CardDescription>Chia sẻ tài liệu, đề thi với nhóm học tập</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Error */}
                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
                                    <X className="w-4 h-4" />
                                    {error}
                                </div>
                            )}

                            {/* File Upload */}
                            <div
                                className={cn(
                                    "border-2 border-dashed rounded-xl p-8 text-center transition-all",
                                    isDragging
                                        ? "border-blue-500 bg-blue-50"
                                        : file
                                            ? "border-green-500 bg-green-50"
                                            : "border-gray-300 hover:border-blue-400 hover:bg-blue-50/50"
                                )}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    setIsDragging(true);
                                }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={handleDrop}
                            >
                                {file ? (
                                    <div className="text-green-700">
                                        <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
                                        <p className="font-semibold text-lg">{file.name}</p>
                                        <p className="text-sm text-gray-500">
                                            {(file.size / 1024 / 1024).toFixed(2)} MB
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => setFile(null)}
                                            className="mt-3 text-sm text-red-600 hover:text-red-700 font-medium"
                                        >
                                            Xóa và chọn file khác
                                        </button>
                                    </div>
                                ) : (
                                    <div className="text-gray-500">
                                        <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                                        <p className="font-semibold text-gray-700">Kéo thả file PDF vào đây</p>
                                        <p className="text-sm mb-4">hoặc</p>
                                        <label className="inline-block px-5 py-2.5 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 font-medium shadow-md">
                                            Chọn file
                                            <input
                                                type="file"
                                                accept=".pdf"
                                                onChange={handleFileChange}
                                                className="hidden"
                                            />
                                        </label>
                                    </div>
                                )}
                            </div>

                            {/* Title */}
                            <div className="space-y-2">
                                <Label className="text-gray-700 font-medium">Tiêu đề *</Label>
                                <Input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    required
                                    placeholder="VD: Đề thi thử THPT 2026 - Lần 5"
                                    className="bg-white border-gray-300"
                                />
                            </div>

                            {/* Type & Subject */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-gray-700 font-medium">Loại *</Label>
                                    <select
                                        value={type}
                                        onChange={(e) => setType(e.target.value as "document" | "exam")}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                    >
                                        <option value="document">📚 Tài liệu</option>
                                        <option value="exam">📝 Đề thi</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-gray-700 font-medium">Môn học *</Label>
                                    <select
                                        value={subject}
                                        onChange={(e) => setSubject(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                    >
                                        {SUBJECTS.map((s) => (
                                            <option key={s.value} value={s.value}>
                                                {s.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Description */}
                            <div className="space-y-2">
                                <Label className="text-gray-700 font-medium">Mô tả</Label>
                                <Textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={3}
                                    placeholder="Mô tả ngắn về tài liệu..."
                                    className="bg-white border-gray-300 resize-none"
                                />
                            </div>

                            {/* Tags */}
                            <div className="space-y-2">
                                <Label className="text-gray-700 font-medium">Tags (phân cách bằng dấu phẩy)</Label>
                                <Input
                                    type="text"
                                    value={tags}
                                    onChange={(e) => setTags(e.target.value)}
                                    placeholder="VD: THPT 2026, đại số, khó"
                                    className="bg-white border-gray-300"
                                />
                            </div>

                            {/* Progress Bar */}
                            {uploading && (
                                <div className="bg-gray-100 rounded-full overflow-hidden h-2">
                                    <div
                                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-300"
                                        style={{ width: `${uploadProgress}%` }}
                                    />
                                </div>
                            )}

                            {/* Submit */}
                            <Button
                                type="submit"
                                disabled={!file || !title || uploading}
                                className={cn(
                                    "w-full h-12 text-base font-semibold",
                                    !file || !title || uploading
                                        ? "bg-gray-300 text-gray-500"
                                        : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/20"
                                )}
                            >
                                {uploading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Đang tải lên... {uploadProgress}%
                                    </span>
                                ) : (
                                    <span className="flex items-center justify-center gap-2">
                                        <Upload className="w-5 h-5" />
                                        Tải lên
                                    </span>
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
