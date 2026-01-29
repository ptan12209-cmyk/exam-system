"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    Search,
    Upload,
    FileText,
    Download,
    Eye,
    Trash2,
    Filter,
    Grid3X3,
    List,
    BookOpen,
    GraduationCap,
    MoreVertical,
    Calendar,
    User,
    X,
    Loader2,
    FolderOpen
} from "lucide-react";
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
    { value: "", label: "Tất cả", icon: "📚", color: "bg-gray-500" },
    { value: "math", label: "Toán", icon: "🔢", color: "bg-blue-600" },
    { value: "physics", label: "Vật lý", icon: "⚛️", color: "bg-purple-600" },
    { value: "chemistry", label: "Hóa học", icon: "🧪", color: "bg-green-600" },
    { value: "biology", label: "Sinh học", icon: "🧬", color: "bg-yellow-600" },
    { value: "english", label: "Tiếng Anh", icon: "🇬🇧", color: "bg-red-600" },
    { value: "literature", label: "Ngữ văn", icon: "📖", color: "bg-pink-600" },
    { value: "history", label: "Lịch sử", icon: "🏛️", color: "bg-amber-600" },
    { value: "geography", label: "Địa lý", icon: "🌍", color: "bg-cyan-600" },
];

export default function ResourcesPage() {
    const [resources, setResources] = useState<Resource[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterSubject, setFilterSubject] = useState("");
    const [filterType, setFilterType] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [user, setUser] = useState<{ id: string; role?: string; full_name?: string } | null>(null);
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [showFilters, setShowFilters] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);

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
        console.log("Resources fetch:", { data, error }); // Debug log
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

    const handleDelete = async (resource: Resource) => {
        if (!confirm(`Xóa tài liệu "${resource.title}"?`)) return;

        setDeleting(resource.id);
        try {
            // Delete from storage if possible
            const fileName = resource.file_url.split("/").pop();
            if (fileName) {
                await supabase.storage.from("exam-pdfs").remove([`resources/${fileName}`]);
            }

            // Delete from database
            await supabase.from("resources").delete().eq("id", resource.id);

            // Refresh list
            fetchResources();
        } catch (err) {
            console.error("Delete error:", err);
            alert("Không thể xóa tài liệu");
        } finally {
            setDeleting(null);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    const getSubjectInfo = (subject: string) => SUBJECTS.find((s) => s.value === subject) || SUBJECTS[0];
    const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString("vi-VN");

    const canUpload = user?.role === "teacher";
    const canDelete = (resource: Resource) => user?.id === resource.uploader_id || user?.role === "teacher";

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 pb-24 lg:pb-8">
            {/* Header */}
            <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl sticky top-0 z-50 border-b border-gray-200/50 dark:border-slate-800/50">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="flex items-center gap-2">
                            <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                                <GraduationCap className="w-5 h-5 text-white" />
                            </div>
                            <span className="font-bold text-xl text-gray-900 dark:text-white hidden sm:block">ExamHub</span>
                        </Link>
                    </div>

                    {/* Search - Desktop */}
                    <div className="hidden md:flex flex-1 max-w-md mx-8">
                        <div className="relative w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                type="text"
                                placeholder="Tìm kiếm tài liệu..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 bg-gray-100/80 dark:bg-slate-800/80 border-0 focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

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
                            <Link href="/login">
                                <Button className="bg-blue-600 hover:bg-blue-700 text-white">Đăng nhập</Button>
                            </Link>
                        )}
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-6">
                {/* Page Header */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                                <FolderOpen className="w-5 h-5 text-white" />
                            </div>
                            Kho Tài Liệu
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">
                            {filteredResources.length} tài liệu • Chia sẻ và học tập cùng nhau
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* View Mode Toggle */}
                        <div className="hidden sm:flex items-center bg-gray-100 dark:bg-slate-800 rounded-lg p-1">
                            <button
                                onClick={() => setViewMode("grid")}
                                className={cn(
                                    "p-2 rounded-md transition-colors",
                                    viewMode === "grid"
                                        ? "bg-white dark:bg-slate-700 text-blue-600 shadow-sm"
                                        : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                )}
                            >
                                <Grid3X3 className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setViewMode("list")}
                                className={cn(
                                    "p-2 rounded-md transition-colors",
                                    viewMode === "list"
                                        ? "bg-white dark:bg-slate-700 text-blue-600 shadow-sm"
                                        : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                )}
                            >
                                <List className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Filter Toggle - Mobile */}
                        <Button
                            variant="outline"
                            onClick={() => setShowFilters(!showFilters)}
                            className="lg:hidden"
                        >
                            <Filter className="w-4 h-4 mr-2" />
                            Lọc
                        </Button>

                        {/* Upload Button */}
                        {canUpload && (
                            <Link href="/resources/upload">
                                <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25">
                                    <Upload className="w-4 h-4 mr-2" />
                                    <span className="hidden sm:inline">Tải lên</span>
                                </Button>
                            </Link>
                        )}
                    </div>
                </div>

                {/* Mobile Search */}
                <div className="md:hidden mb-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            type="text"
                            placeholder="Tìm kiếm tài liệu..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 bg-white dark:bg-slate-800"
                        />
                    </div>
                </div>

                {/* Filters */}
                <div className={cn(
                    "mb-6 transition-all",
                    showFilters ? "block" : "hidden lg:block"
                )}>
                    {/* Subject Filter Pills */}
                    <div className="flex flex-wrap gap-2 mb-4">
                        {SUBJECTS.map((subject) => (
                            <button
                                key={subject.value}
                                onClick={() => setFilterSubject(subject.value)}
                                className={cn(
                                    "px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2",
                                    filterSubject === subject.value
                                        ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25"
                                        : "bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700"
                                )}
                            >
                                <span>{subject.icon}</span>
                                {subject.label}
                            </button>
                        ))}
                    </div>

                    {/* Type Filter */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => setFilterType("")}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                                filterType === ""
                                    ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800"
                            )}
                        >
                            Tất cả
                        </button>
                        <button
                            onClick={() => setFilterType("document")}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5",
                                filterType === "document"
                                    ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800"
                            )}
                        >
                            <BookOpen className="w-3.5 h-3.5" />
                            Tài liệu
                        </button>
                        <button
                            onClick={() => setFilterType("exam")}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5",
                                filterType === "exam"
                                    ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800"
                            )}
                        >
                            <FileText className="w-3.5 h-3.5" />
                            Đề thi
                        </button>
                    </div>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    </div>
                ) : filteredResources.length === 0 ? (
                    <Card className="border-dashed border-2 border-gray-300 dark:border-slate-700 bg-transparent">
                        <CardContent className="py-16 text-center">
                            <div className="w-16 h-16 bg-gray-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <FolderOpen className="w-8 h-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                Chưa có tài liệu nào
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-6">
                                {canUpload ? "Hãy là người đầu tiên chia sẻ tài liệu!" : "Hãy quay lại sau nhé!"}
                            </p>
                            {canUpload && (
                                <Link href="/resources/upload">
                                    <Button className="bg-blue-600 hover:bg-blue-700">
                                        <Upload className="w-4 h-4 mr-2" />
                                        Tải lên tài liệu đầu tiên
                                    </Button>
                                </Link>
                            )}
                        </CardContent>
                    </Card>
                ) : viewMode === "grid" ? (
                    /* Grid View */
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {filteredResources.map((resource) => {
                            const subjectInfo = getSubjectInfo(resource.subject);
                            return (
                                <Card
                                    key={resource.id}
                                    className="group border-gray-200/50 dark:border-slate-800/50 bg-white dark:bg-slate-900/50 hover:shadow-xl hover:shadow-gray-200/50 dark:hover:shadow-slate-900/50 transition-all duration-300 overflow-hidden"
                                >
                                    {/* Card Header with Subject Color */}
                                    <div className={cn("h-2", subjectInfo.color)} />

                                    <CardContent className="p-5">
                                        {/* Type Badge & Actions */}
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <span className={cn(
                                                    "px-2.5 py-1 rounded-full text-xs font-medium",
                                                    resource.type === "exam"
                                                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                                                        : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                                                )}>
                                                    {resource.type === "exam" ? "📝 Đề thi" : "📚 Tài liệu"}
                                                </span>
                                            </div>
                                            {canDelete(resource) && (
                                                <button
                                                    onClick={() => handleDelete(resource)}
                                                    disabled={deleting === resource.id}
                                                    className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 transition-all"
                                                >
                                                    {deleting === resource.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="w-4 h-4" />
                                                    )}
                                                </button>
                                            )}
                                        </div>

                                        {/* Icon */}
                                        <div className={cn(
                                            "w-14 h-14 rounded-2xl flex items-center justify-center mb-4",
                                            subjectInfo.color + "/10"
                                        )}>
                                            <span className="text-3xl">{subjectInfo.icon}</span>
                                        </div>

                                        {/* Title */}
                                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                                            {resource.title}
                                        </h3>

                                        {/* Description */}
                                        {resource.description && (
                                            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-4">
                                                {resource.description}
                                            </p>
                                        )}

                                        {/* Meta */}
                                        <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500 mb-4">
                                            <span className="flex items-center gap-1">
                                                <Eye className="w-3.5 h-3.5" />
                                                {resource.view_count || 0}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3.5 h-3.5" />
                                                {formatDate(resource.created_at)}
                                            </span>
                                        </div>

                                        {/* Action Button */}
                                        <Button
                                            onClick={() => handleView(resource)}
                                            className="w-full bg-gray-100 hover:bg-blue-600 text-gray-700 hover:text-white dark:bg-slate-800 dark:hover:bg-blue-600 dark:text-gray-300 transition-colors"
                                        >
                                            <Eye className="w-4 h-4 mr-2" />
                                            Xem tài liệu
                                        </Button>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                ) : (
                    /* List View */
                    <div className="space-y-3">
                        {filteredResources.map((resource) => {
                            const subjectInfo = getSubjectInfo(resource.subject);
                            return (
                                <Card
                                    key={resource.id}
                                    className="group border-gray-200/50 dark:border-slate-800/50 bg-white dark:bg-slate-900/50 hover:shadow-lg transition-all"
                                >
                                    <CardContent className="p-4 flex items-center gap-4">
                                        {/* Icon */}
                                        <div className={cn(
                                            "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                                            subjectInfo.color + "/10"
                                        )}>
                                            <span className="text-2xl">{subjectInfo.icon}</span>
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                                                    {resource.title}
                                                </h3>
                                                <span className={cn(
                                                    "px-2 py-0.5 rounded text-xs font-medium shrink-0",
                                                    resource.type === "exam"
                                                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                                                        : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                                                )}>
                                                    {resource.type === "exam" ? "Đề thi" : "Tài liệu"}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                                                <span className="flex items-center gap-1">
                                                    <Eye className="w-3.5 h-3.5" />
                                                    {resource.view_count || 0} lượt xem
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    {formatDate(resource.created_at)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2">
                                            <Button
                                                size="sm"
                                                onClick={() => handleView(resource)}
                                                className="bg-blue-600 hover:bg-blue-700 text-white"
                                            >
                                                <Eye className="w-4 h-4 mr-1.5" />
                                                Xem
                                            </Button>
                                            {canDelete(resource) && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleDelete(resource)}
                                                    disabled={deleting === resource.id}
                                                    className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/30"
                                                >
                                                    {deleting === resource.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="w-4 h-4" />
                                                    )}
                                                </Button>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </main>

            <BottomNav />
        </div>
    );
}
