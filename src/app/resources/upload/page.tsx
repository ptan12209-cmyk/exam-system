"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-8 px-4">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={() => router.back()}
                        className="text-white/60 hover:text-white mb-4 flex items-center gap-2"
                    >
                        ← Quay lại
                    </button>
                    <h1 className="text-3xl font-bold text-white">📤 Tải lên tài liệu</h1>
                    <p className="text-white/60 mt-1">Chia sẻ tài liệu với nhóm học tập</p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Error */}
                    {error && (
                        <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-xl">
                            ❌ {error}
                        </div>
                    )}

                    {/* File Upload */}
                    <div
                        className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${isDragging
                            ? "border-purple-500 bg-purple-500/20"
                            : file
                                ? "border-green-500 bg-green-500/10"
                                : "border-white/20 hover:border-white/40"
                            }`}
                        onDragOver={(e) => {
                            e.preventDefault();
                            setIsDragging(true);
                        }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleDrop}
                    >
                        {file ? (
                            <div className="text-green-400">
                                <div className="text-4xl mb-2">✅</div>
                                <p className="font-medium">{file.name}</p>
                                <p className="text-sm text-white/60">
                                    {(file.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setFile(null)}
                                    className="mt-2 text-sm text-red-400 hover:text-red-300"
                                >
                                    Xóa và chọn file khác
                                </button>
                            </div>
                        ) : (
                            <div className="text-white/60">
                                <div className="text-4xl mb-2">📄</div>
                                <p className="font-medium">Kéo thả file PDF vào đây</p>
                                <p className="text-sm">hoặc</p>
                                <label className="mt-2 inline-block px-4 py-2 bg-purple-600 text-white rounded-lg cursor-pointer hover:bg-purple-700">
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
                    <div>
                        <label className="block text-white/80 mb-2 font-medium">
                            Tiêu đề *
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                            placeholder="VD: Đề thi thử THPT 2026 - Lần 5"
                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                    </div>

                    {/* Type & Subject */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-white/80 mb-2 font-medium">
                                Loại *
                            </label>
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value as "document" | "exam")}
                                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            >
                                <option value="document" className="bg-slate-800">
                                    📚 Tài liệu
                                </option>
                                <option value="exam" className="bg-slate-800">
                                    📝 Đề thi
                                </option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-white/80 mb-2 font-medium">
                                Môn học *
                            </label>
                            <select
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            >
                                {SUBJECTS.map((s) => (
                                    <option key={s.value} value={s.value} className="bg-slate-800">
                                        {s.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-white/80 mb-2 font-medium">
                            Mô tả
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            placeholder="Mô tả ngắn về tài liệu..."
                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                        />
                    </div>

                    {/* Tags */}
                    <div>
                        <label className="block text-white/80 mb-2 font-medium">
                            Tags (phân cách bằng dấu phẩy)
                        </label>
                        <input
                            type="text"
                            value={tags}
                            onChange={(e) => setTags(e.target.value)}
                            placeholder="VD: THPT 2026, đại số, khó"
                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                    </div>

                    {/* Progress Bar */}
                    {uploading && (
                        <div className="bg-white/10 rounded-full overflow-hidden">
                            <div
                                className="h-2 bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                                style={{ width: `${uploadProgress}%` }}
                            />
                        </div>
                    )}

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={!file || !title || uploading}
                        className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${!file || !title || uploading
                            ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                            : "bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-lg hover:shadow-green-500/25"
                            }`}
                    >
                        {uploading ? (
                            <span className="flex items-center justify-center gap-2">
                                <span className="animate-spin">⏳</span>
                                Đang tải lên... {uploadProgress}%
                            </span>
                        ) : (
                            "📤 Tải lên"
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
