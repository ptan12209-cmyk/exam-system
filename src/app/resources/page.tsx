"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/NotificationBell";
import { UserMenu } from "@/components/UserMenu";
import { BottomNav } from "@/components/BottomNav";

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
    { value: "", label: "Tất cả", color: "gray" },
    { value: "math", label: "Toán", color: "blue" },
    { value: "physics", label: "Lý", color: "purple" },
    { value: "chemistry", label: "Hoá", color: "green" },
    { value: "biology", label: "Sinh", color: "yellow" },
    { value: "english", label: "Anh", color: "red" },
    { value: "literature", label: "Văn", color: "indigo" },
    { value: "history", label: "Sử", color: "amber" },
    { value: "geography", label: "Địa", color: "cyan" },
];

const SUBJECT_COLORS: Record<string, string> = {
    math: "bg-blue-600",
    physics: "bg-purple-600",
    chemistry: "bg-green-600",
    english: "bg-red-600",
    literature: "bg-pink-600",
    biology: "bg-yellow-600",
    history: "bg-amber-600",
    geography: "bg-cyan-600",
    other: "bg-gray-600",
};

export default function ResourcesPage() {
    const [resources, setResources] = useState<Resource[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState("");
    const [filterSubject, setFilterSubject] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [user, setUser] = useState<{ id: string; role?: string; full_name?: string } | null>(null);
    const [sortBy, setSortBy] = useState("newest");

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
                .select("role, full_name")
                .eq("id", session.user.id)
                .single();
            setUser({ id: session.user.id, role: profile?.role, full_name: profile?.full_name });
        }
    };

    const fetchResources = async () => {
        setLoading(true);
        let query = supabase
            .from("resources")
            .select("*")
            .order("created_at", { ascending: false });

        if (filterType) query = query.eq("type", filterType);
        if (filterSubject) query = query.eq("subject", filterSubject);

        const { data, error } = await query;
        if (!error && data) setResources(data);
        setLoading(false);
    };

    const filteredResources = resources.filter((r) =>
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleView = async (resource: Resource) => {
        await supabase.rpc("increment_resource_view", { resource_id: resource.id });
        window.open(resource.file_url, "_blank");
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    const getSubjectLabel = (subject: string) => SUBJECTS.find((s) => s.value === subject)?.label || subject;
    const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString("vi-VN");

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-slate-950 flex flex-col">
            {/* Header */}
            <header className="bg-white dark:bg-slate-900 shadow-sm sticky top-0 z-50 border-b border-gray-200 dark:border-slate-800">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/student/dashboard" className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-xl">E</div>
                            <span className="font-bold text-xl text-blue-600 hidden sm:block">ExamHub</span>
                        </Link>
                        <div className="hidden md:flex ml-8 relative">
                            <input
                                type="text"
                                placeholder="Tìm kiếm..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="bg-gray-100 dark:bg-slate-800 border-none rounded-full py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-blue-600 w-64 dark:text-white dark:placeholder-gray-400 border border-transparent dark:border-slate-700"
                            />
                            <span className="absolute left-3 top-2 text-gray-400">🔍</span>
                        </div>
                    </div>
                    <nav className="hidden lg:flex items-center gap-6 text-gray-500 dark:text-gray-400">
                        <Link href="/student/dashboard" className="hover:text-blue-600 dark:hover:text-blue-400"><span className="text-2xl">🏠</span></Link>
                        <Link href="/student/exams" className="hover:text-blue-600 dark:hover:text-blue-400"><span className="text-2xl">📝</span></Link>
                        <Link href="/resources" className="text-blue-600 relative">
                            <span className="text-2xl">📚</span>
                            <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full"></span>
                        </Link>
                        <Link href="/arena" className="hover:text-blue-600"><span className="text-2xl">🏆</span></Link>
                    </nav>
                    <div className="flex items-center gap-3">
                        {user ? (
                            <>
                                <NotificationBell />
                                <UserMenu
                                    userName={user.full_name || ""}
                                    onLogout={handleLogout}
                                    role={user.role === "teacher" ? "teacher" : "student"}
                                />
                            </>
                        ) : (
                            <>
                                <Link href="/register" className="text-gray-500 hover:text-blue-600 text-sm font-medium">Đăng ký</Link>
                                <Link href="/login" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg shadow-blue-500/30">
                                    Đăng nhập
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </header>

            {/* Breadcrumb */}
            <div className="max-w-7xl mx-auto px-4 py-4 w-full">
                <nav className="flex text-sm text-gray-500 dark:text-gray-400">
                    <Link href="/student/dashboard" className="hover:text-blue-600 dark:hover:text-blue-400">Trang chủ</Link>
                    <span className="mx-2">/</span>
                    <span className="text-blue-600 font-medium">Tài liệu</span>
                </nav>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 pb-12 flex flex-col lg:flex-row gap-6 flex-grow w-full">
                {/* Sidebar */}
                <aside className="w-full lg:w-1/4 space-y-6">
                    {/* Filter Card */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-lg flex items-center gap-2 dark:text-white">
                                <span className="text-blue-600">⚙️</span> Bộ lọc
                            </h3>
                            <button onClick={() => { setFilterSubject(""); setFilterType(""); }} className="text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">
                                Xóa tất cả
                            </button>
                        </div>

                        {/* Subject Filter */}
                        <div className="mb-6">
                            <h4 className="font-medium mb-3 text-sm uppercase tracking-wide text-gray-500 dark:text-gray-400">Môn học</h4>
                            <div className="grid grid-cols-2 gap-2">
                                {SUBJECTS.map((s) => (
                                    <button
                                        key={s.value}
                                        onClick={() => setFilterSubject(s.value)}
                                        className={cn(
                                            "px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left flex items-center gap-2",
                                            filterSubject === s.value
                                                ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
                                                : "bg-gray-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 border border-transparent dark:border-slate-700"
                                        )}
                                    >
                                        <span className={cn("w-2 h-2 rounded-full", `bg-${s.color}-500`)}></span>
                                        {s.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Type Filter */}
                        <div>
                            <h4 className="font-medium mb-3 text-sm uppercase tracking-wide text-gray-500 dark:text-gray-400">Định dạng</h4>
                            <div className="space-y-2">
                                <label className="flex items-center gap-3 cursor-pointer group dark:text-gray-300">
                                    <input
                                        type="checkbox"
                                        checked={filterType === "" || filterType === "document"}
                                        onChange={() => setFilterType(filterType === "document" ? "" : "document")}
                                        className="form-checkbox rounded text-blue-600 border-gray-300 focus:ring-blue-600 h-5 w-5"
                                    />
                                    <span className="flex items-center gap-2 group-hover:text-blue-600 transition-colors">
                                        <span className="text-red-500">📄</span> PDF
                                    </span>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={filterType === "exam"}
                                        onChange={() => setFilterType(filterType === "exam" ? "" : "exam")}
                                        className="form-checkbox rounded text-blue-600 border-gray-300 focus:ring-blue-600 h-5 w-5"
                                    />
                                    <span className="flex items-center gap-2 group-hover:text-blue-600 transition-colors">
                                        <span className="text-blue-500">📝</span> Đề thi
                                    </span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* CTA Card */}
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-6 text-white text-center shadow-lg">
                        <div className="text-3xl mb-2">🚀</div>
                        <h4 className="font-bold text-lg mb-1">Luyện đề VIP 2026</h4>
                        <p className="text-sm text-blue-100 mb-4">Bứt phá điểm số ngay hôm nay!</p>
                        <Link href="/pricing">
                            <button className="bg-white text-blue-600 px-4 py-2 rounded-lg text-sm font-bold w-full hover:bg-gray-50 transition-colors">
                                Tìm hiểu thêm
                            </button>
                        </Link>
                    </div>
                </aside>

                {/* Main */}
                <main className="w-full lg:w-3/4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                        <div>
                            <h1 className="text-2xl font-bold text-blue-600 mb-1">Thư viện tài liệu</h1>
                            <p className="text-gray-500 dark:text-gray-400 text-sm">Hơn {resources.length}+ tài liệu ôn thi chất lượng cao</p>
                        </div>
                        <div className="relative w-full md:w-80">
                            <input
                                type="text"
                                placeholder="Tìm kiếm trong thư viện..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg py-2.5 pl-10 pr-4 focus:ring-2 focus:ring-blue-600 focus:border-transparent shadow-sm dark:text-white dark:placeholder-gray-400"
                            />
                            <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
                        </div>
                    </div>

                    {/* Sort Tabs */}
                    <div className="flex flex-wrap gap-2 mb-6">
                        <button
                            onClick={() => setSortBy("all")}
                            className={cn(
                                "px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 cursor-pointer transition-colors",
                                sortBy === "all" || sortBy === "newest"
                                    ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300"
                                    : "border border-gray-200 dark:border-slate-600 text-gray-500 dark:text-gray-400 hover:border-blue-600 hover:text-blue-600"
                            )}
                        >
                            Tất cả
                        </button>
                        <button
                            onClick={() => setSortBy("popular")}
                            className={cn(
                                "px-3 py-1 rounded-full text-sm font-medium cursor-pointer transition-colors",
                                sortBy === "popular"
                                    ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300"
                                    : "border border-gray-200 dark:border-slate-600 text-gray-500 dark:text-gray-400 hover:border-blue-600 hover:text-blue-600"
                            )}
                        >
                            Xem nhiều nhất
                        </button>
                    </div>

                    {/* Resource List */}
                    {loading ? (
                        <div className="flex justify-center py-20">
                            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : filteredResources.length === 0 ? (
                        <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800">
                            <div className="text-5xl mb-4">📭</div>
                            <p className="text-gray-500 dark:text-gray-400">Chưa có tài liệu nào</p>
                            {user?.role === "teacher" && (
                                <Link href="/resources/upload">
                                    <button className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700">
                                        Tải lên tài liệu đầu tiên
                                    </button>
                                </Link>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredResources.map((resource) => (
                                <div
                                    key={resource.id}
                                    className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm hover:shadow-md border border-gray-100 dark:border-slate-800 transition-all group flex gap-4 items-start"
                                >
                                    {/* Icon */}
                                    <div className={cn(
                                        "shrink-0 w-12 h-12 rounded-lg flex items-center justify-center",
                                        resource.type === "exam" ? "bg-blue-50" : "bg-red-50"
                                    )}>
                                        <span className={cn("text-3xl", resource.type === "exam" ? "text-blue-600" : "text-red-500")}>
                                            {resource.type === "exam" ? "📝" : "📄"}
                                        </span>
                                    </div>

                                    {/* Content */}
                                    <div className="flex-grow min-w-0">
                                        <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
                                            {resource.title}
                                        </h3>
                                        <div className="flex flex-wrap gap-2 mb-3">
                                            <span className={cn("text-white text-xs px-2 py-0.5 rounded shadow-sm", SUBJECT_COLORS[resource.subject] || SUBJECT_COLORS.other)}>
                                                {getSubjectLabel(resource.subject)}
                                            </span>
                                            <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded shadow-sm">
                                                Lớp 12
                                            </span>
                                            {resource.tags?.slice(0, 1).map((tag, i) => (
                                                <span key={i} className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded shadow-sm">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                        <div className="flex items-center gap-4 text-xs text-gray-500">
                                            <div className="flex items-center gap-1">
                                                <span>👁</span> {resource.view_count || 0}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <span>📅</span> {formatDate(resource.created_at)}
                                            </div>
                                            <div className="flex-grow"></div>
                                            <button
                                                onClick={() => handleView(resource)}
                                                className="text-blue-600 hover:underline font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                Xem chi tiết →
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Pagination */}
                    {filteredResources.length > 0 && (
                        <div className="mt-8 flex justify-center">
                            <nav className="flex items-center gap-2">
                                <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-gray-400">‹</button>
                                <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-600 text-white font-medium shadow-md shadow-blue-500/30">1</button>
                                <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-gray-400">2</button>
                                <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-gray-400">3</button>
                                <span className="text-gray-400 px-1">...</span>
                                <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-gray-400">16</button>
                                <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-gray-400">›</button>
                            </nav>
                        </div>
                    )}
                </main>
            </div>

            {/* Footer */}
            <footer className="bg-[#0f2d5e] text-white mt-auto pt-12 pb-8">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex flex-col items-center justify-center mb-8 text-center">
                        <h3 className="font-bold text-lg mb-6 uppercase tracking-wider">Liên hệ</h3>
                        <div className="space-y-3 text-sm text-gray-300">
                            <div className="flex items-center gap-3 justify-center">
                                <span>🌐</span>
                                <p>Website: examhub.id.vn</p>
                            </div>
                            <div className="flex items-center gap-3 justify-center">
                                <span>📧</span>
                                <p>Email: contact@examhub.id.vn</p>
                            </div>
                        </div>
                    </div>
                    <div className="border-t border-blue-800/50 pt-6 text-center text-xs text-gray-400">
                        © 2026 ExamHub. All rights reserved.
                    </div>
                </div>
            </footer>

            {/* Bottom Navigation - Mobile */}
            <BottomNav />
        </div>
    );
}
