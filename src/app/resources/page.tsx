"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Resource {
    id: string;
    title: string;
    type: "document" | "exam";
    subject: string;
    file_url: string;
    description: string;
    tags: string[];
    view_count: number;
    download_count: number;
    created_at: string;
    uploader_id: string;
}

const SUBJECTS = [
    { value: "", label: "Tất cả môn" },
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

const TYPES = [
    { value: "", label: "Tất cả" },
    { value: "document", label: "📚 Tài liệu" },
    { value: "exam", label: "📝 Đề thi" },
];

const SUBJECT_COLORS: Record<string, string> = {
    math: "bg-blue-100 text-blue-800",
    physics: "bg-purple-100 text-purple-800",
    chemistry: "bg-green-100 text-green-800",
    english: "bg-red-100 text-red-800",
    literature: "bg-pink-100 text-pink-800",
    biology: "bg-emerald-100 text-emerald-800",
    history: "bg-amber-100 text-amber-800",
    geography: "bg-cyan-100 text-cyan-800",
    other: "bg-gray-100 text-gray-800",
};

export default function ResourcesPage() {
    const [resources, setResources] = useState<Resource[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState("");
    const [filterSubject, setFilterSubject] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [user, setUser] = useState<{ id: string; role?: string } | null>(null);

    const supabase = createClient();
    const router = useRouter();

    useEffect(() => {
        fetchResources();
        checkAuth();
    }, [filterType, filterSubject]);

    const checkAuth = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            const { data: profile } = await supabase
                .from("profiles")
                .select("role")
                .eq("id", session.user.id)
                .single();
            setUser({ id: session.user.id, role: profile?.role });
        }
    };

    const fetchResources = async () => {
        setLoading(true);
        let query = supabase
            .from("resources")
            .select("*")
            .order("created_at", { ascending: false });

        if (filterType) {
            query = query.eq("type", filterType);
        }
        if (filterSubject) {
            query = query.eq("subject", filterSubject);
        }

        const { data, error } = await query;
        if (!error && data) {
            setResources(data);
        }
        setLoading(false);
    };

    const filteredResources = resources.filter((r) =>
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.tags?.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const handleView = async (resource: Resource) => {
        // Increment view count
        await supabase.rpc("increment_resource_view", { resource_id: resource.id });
        // Open PDF in new tab
        window.open(resource.file_url, "_blank");
    };

    const handleDownload = async (resource: Resource) => {
        // Increment download count
        await supabase.rpc("increment_resource_download", { resource_id: resource.id });
        // Trigger download
        const link = document.createElement("a");
        link.href = resource.file_url;
        link.download = resource.title + ".pdf";
        link.click();
    };

    const handlePractice = (resource: Resource) => {
        // Navigate to create exam page with pre-filled PDF
        router.push(`/teacher/exams/create?pdf_url=${encodeURIComponent(resource.file_url)}&title=${encodeURIComponent(resource.title)}`);
    };

    const getSubjectLabel = (subject: string) => {
        return SUBJECTS.find((s) => s.value === subject)?.label || subject;
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString("vi-VN");
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            {/* Header */}
            <div className="bg-black/30 backdrop-blur-sm border-b border-white/10">
                <div className="max-w-7xl mx-auto px-4 py-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                                📚 Kho Tài Liệu & Đề Thi
                            </h1>
                            <p className="text-white/60 mt-1">
                                Tổng hợp tài liệu ôn thi THPT 2026
                            </p>
                        </div>
                        {user?.role === "teacher" && (
                            <button
                                onClick={() => router.push("/resources/upload")}
                                className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-green-500/25 transition-all"
                            >
                                ➕ Tải lên tài liệu
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="max-w-7xl mx-auto px-4 py-6">
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 mb-6">
                    <div className="flex flex-wrap gap-4 items-center">
                        {/* Search */}
                        <div className="flex-1 min-w-[200px]">
                            <input
                                type="text"
                                placeholder="🔍 Tìm kiếm tài liệu..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                        </div>

                        {/* Type filter */}
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                            {TYPES.map((t) => (
                                <option key={t.value} value={t.value} className="bg-slate-800">
                                    {t.label}
                                </option>
                            ))}
                        </select>

                        {/* Subject filter */}
                        <select
                            value={filterSubject}
                            onChange={(e) => setFilterSubject(e.target.value)}
                            className="px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                            {SUBJECTS.map((s) => (
                                <option key={s.value} value={s.value} className="bg-slate-800">
                                    {s.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Resource Grid */}
                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
                    </div>
                ) : filteredResources.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="text-6xl mb-4">📭</div>
                        <p className="text-white/60 text-xl">Chưa có tài liệu nào</p>
                        {user?.role === "teacher" && (
                            <button
                                onClick={() => router.push("/resources/upload")}
                                className="mt-4 px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700"
                            >
                                Tải lên tài liệu đầu tiên
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredResources.map((resource) => (
                            <div
                                key={resource.id}
                                className="bg-white/10 backdrop-blur-md rounded-2xl overflow-hidden border border-white/10 hover:border-purple-500/50 transition-all hover:shadow-lg hover:shadow-purple-500/10 group"
                            >
                                {/* Card Header */}
                                <div className="p-5">
                                    <div className="flex items-start justify-between mb-3">
                                        <span
                                            className={`px-3 py-1 rounded-full text-xs font-medium ${resource.type === "exam"
                                                ? "bg-orange-500/20 text-orange-300"
                                                : "bg-blue-500/20 text-blue-300"
                                                }`}
                                        >
                                            {resource.type === "exam" ? "📝 Đề thi" : "📚 Tài liệu"}
                                        </span>
                                        <span
                                            className={`px-2 py-1 rounded-lg text-xs font-medium ${SUBJECT_COLORS[resource.subject] || SUBJECT_COLORS.other
                                                }`}
                                        >
                                            {getSubjectLabel(resource.subject)}
                                        </span>
                                    </div>

                                    <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">
                                        {resource.title}
                                    </h3>

                                    {resource.description && (
                                        <p className="text-white/60 text-sm mb-3 line-clamp-2">
                                            {resource.description}
                                        </p>
                                    )}

                                    {/* Tags */}
                                    {resource.tags && resource.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mb-3">
                                            {resource.tags.slice(0, 3).map((tag, i) => (
                                                <span
                                                    key={i}
                                                    className="px-2 py-0.5 bg-white/10 rounded-full text-xs text-white/70"
                                                >
                                                    #{tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {/* Stats */}
                                    <div className="flex items-center gap-4 text-white/50 text-sm">
                                        <span>👁 {resource.view_count || 0}</span>
                                        <span>⬇️ {resource.download_count || 0}</span>
                                        <span>📅 {formatDate(resource.created_at)}</span>
                                    </div>
                                </div>

                                {/* Card Actions */}
                                <div className="px-5 pb-5 flex gap-2">
                                    <button
                                        onClick={() => handleView(resource)}
                                        className="flex-1 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all text-sm font-medium"
                                    >
                                        👁 Xem
                                    </button>
                                    <button
                                        onClick={() => handleDownload(resource)}
                                        className="flex-1 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all text-sm font-medium"
                                    >
                                        ⬇️ Tải
                                    </button>
                                    {resource.type === "exam" && (
                                        <button
                                            onClick={() => handlePractice(resource)}
                                            className="flex-1 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg transition-all text-sm font-medium hover:shadow-lg hover:shadow-purple-500/25"
                                        >
                                            🚀 Luyện
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Back button */}
            <div className="fixed bottom-6 left-6">
                <button
                    onClick={() => router.back()}
                    className="px-4 py-2 bg-white/10 backdrop-blur-md text-white rounded-xl hover:bg-white/20 transition-all"
                >
                    ← Quay lại
                </button>
            </div>
        </div>
    );
}
