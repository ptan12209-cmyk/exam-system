"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Search, Upload, FileText, Eye, Trash2, Filter, Grid3X3, List, BookOpen,
    GraduationCap, Calendar, Loader2, FolderOpen
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/NotificationBell";
import { UserMenu } from "@/components/UserMenu";
import { BottomNav } from "@/components/BottomNav";

interface Resource {
    id: string; title: string; type: "document" | "exam"; subject: string;
    file_url: string; description: string; tags: string[];
    view_count: number; download_count: number; created_at: string; uploader_id: string;
}

const SUBJECTS = [
    { value: "", label: "Tất cả", icon: "📚" },
    { value: "math", label: "Toán", icon: "🔢" },
    { value: "physics", label: "Vật lý", icon: "⚛️" },
    { value: "chemistry", label: "Hóa học", icon: "🧪" },
    { value: "biology", label: "Sinh học", icon: "🧬" },
    { value: "english", label: "Tiếng Anh", icon: "🇬🇧" },
    { value: "literature", label: "Ngữ văn", icon: "📖" },
    { value: "history", label: "Lịch sử", icon: "🏛️" },
    { value: "geography", label: "Địa lý", icon: "🌍" },
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

    useEffect(() => { fetchResources(); checkAuth(); }, [filterType, filterSubject]);

    const checkAuth = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            const { data: profile } = await supabase.from("profiles").select("role, full_name").eq("id", session.user.id).single();
            setUser({ id: session.user.id, role: profile?.role, full_name: profile?.full_name });
        }
    };

    const fetchResources = async () => {
        setLoading(true);
        let query = supabase.from("resources").select("*").order("created_at", { ascending: false });
        if (filterType) query = query.eq("type", filterType);
        if (filterSubject) query = query.eq("subject", filterSubject);
        const { data, error } = await query;
        if (!error && data) setResources(data);
        setLoading(false);
    };

    const filteredResources = resources.filter((r) =>
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) || r.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleView = async (resource: Resource) => {
        await supabase.rpc("increment_resource_view", { resource_id: resource.id });
        window.open(resource.file_url, "_blank");
    };

    const handleDelete = async (resource: Resource) => {
        if (!confirm(`Xóa tài liệu "${resource.title}"?`)) return;
        setDeleting(resource.id);
        try {
            const fileName = resource.file_url.split("/").pop();
            if (fileName) await supabase.storage.from("exam-pdfs").remove([`resources/${fileName}`]);
            await supabase.from("resources").delete().eq("id", resource.id);
            fetchResources();
        } catch (err) { console.error("Delete error:", err); alert("Không thể xóa tài liệu"); }
        finally { setDeleting(null); }
    };

    const handleLogout = async () => { await supabase.auth.signOut(); router.push("/login"); };
    const getSubjectInfo = (subject: string) => SUBJECTS.find((s) => s.value === subject) || SUBJECTS[0];
    const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString("vi-VN");
    const canUpload = user?.role === "teacher";
    const canDelete = (resource: Resource) => user?.id === resource.uploader_id || user?.role === "teacher";

    return (
        <div className="min-h-screen bg-background pb-24 lg:pb-8">
            {/* Header */}
            <header className="glass-nav sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="flex items-center gap-2">
                            <div className="w-9 h-9 gradient-primary rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                <GraduationCap className="w-5 h-5 text-white" />
                            </div>
                            <span className="font-bold text-xl text-foreground hidden sm:block">ExamHub</span>
                        </Link>
                    </div>
                    <div className="hidden md:flex flex-1 max-w-md mx-8">
                        <div className="relative w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input type="text" placeholder="Tìm kiếm tài liệu..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 bg-muted/50 border-border focus:ring-2 focus:ring-indigo-500 text-foreground" />
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {user ? (
                            <>
                                <NotificationBell />
                                <UserMenu userName={user.full_name || ""} onLogout={handleLogout} role={user.role === "teacher" ? "teacher" : "student"} />
                            </>
                        ) : (
                            <Link href="/login"><Button className="gradient-primary text-white border-0 shadow-lg shadow-indigo-500/20">Đăng nhập</Button></Link>
                        )}
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center"><FolderOpen className="w-5 h-5 text-white" /></div>
                            Kho Tài Liệu
                        </h1>
                        <p className="text-muted-foreground mt-1">{filteredResources.length} tài liệu • Chia sẻ và học tập cùng nhau</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="hidden sm:flex items-center bg-muted/50 rounded-xl p-1">
                            <button onClick={() => setViewMode("grid")} className={cn("p-2 rounded-lg transition-all", viewMode === "grid" ? "bg-card text-indigo-600 shadow-sm" : "text-muted-foreground hover:text-foreground")}><Grid3X3 className="w-4 h-4" /></button>
                            <button onClick={() => setViewMode("list")} className={cn("p-2 rounded-lg transition-all", viewMode === "list" ? "bg-card text-indigo-600 shadow-sm" : "text-muted-foreground hover:text-foreground")}><List className="w-4 h-4" /></button>
                        </div>
                        <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="lg:hidden border-border"><Filter className="w-4 h-4 mr-2" />Lọc</Button>
                        {canUpload && (
                            <Link href="/resources/upload">
                                <Button className="gradient-primary text-white border-0 shadow-lg shadow-indigo-500/20 hover:opacity-90"><Upload className="w-4 h-4 mr-2" /><span className="hidden sm:inline">Tải lên</span></Button>
                            </Link>
                        )}
                    </div>
                </div>

                <div className="md:hidden mb-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input type="text" placeholder="Tìm kiếm tài liệu..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 bg-card border-border text-foreground" />
                    </div>
                </div>

                <div className={cn("mb-6 transition-all", showFilters ? "block" : "hidden lg:block")}>
                    <div className="flex flex-wrap gap-2 mb-4">
                        {SUBJECTS.map((subject) => (
                            <button key={subject.value} onClick={() => setFilterSubject(subject.value)}
                                className={cn("px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2",
                                    filterSubject === subject.value ? "gradient-primary text-white shadow-lg shadow-indigo-500/20" : "bg-card text-muted-foreground hover:text-foreground border border-border hover:border-indigo-300 dark:hover:border-indigo-700"
                                )}>
                                <span>{subject.icon}</span>{subject.label}
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        {[{ key: "", label: "Tất cả" }, { key: "document", label: "Tài liệu", icon: BookOpen }, { key: "exam", label: "Đề thi", icon: FileText }].map(t => (
                            <button key={t.key} onClick={() => setFilterType(t.key)}
                                className={cn("px-3 py-1.5 rounded-xl text-sm font-medium transition-all flex items-center gap-1.5",
                                    filterType === t.key ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted/50"
                                )}>
                                {t.icon && <t.icon className="w-3.5 h-3.5" />}{t.label}
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20"><div className="flex flex-col items-center gap-3"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /><p className="text-sm text-muted-foreground">Đang tải...</p></div></div>
                ) : filteredResources.length === 0 ? (
                    <div className="glass-card rounded-2xl border-dashed border-2 border-border p-16 text-center">
                        <div className="w-16 h-16 bg-muted/50 rounded-2xl flex items-center justify-center mx-auto mb-4"><FolderOpen className="w-8 h-8 text-muted-foreground/40" /></div>
                        <h3 className="text-lg font-semibold text-foreground mb-2">Chưa có tài liệu nào</h3>
                        <p className="text-muted-foreground mb-6">{canUpload ? "Hãy là người đầu tiên chia sẻ tài liệu!" : "Hãy quay lại sau nhé!"}</p>
                        {canUpload && <Link href="/resources/upload"><Button className="gradient-primary text-white border-0 shadow-lg shadow-indigo-500/20"><Upload className="w-4 h-4 mr-2" />Tải lên tài liệu đầu tiên</Button></Link>}
                    </div>
                ) : viewMode === "grid" ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {filteredResources.map((resource) => {
                            const subjectInfo = getSubjectInfo(resource.subject);
                            return (
                                <div key={resource.id} className="glass-card rounded-2xl overflow-hidden group hover:shadow-xl transition-all duration-300">
                                    <div className="h-1.5 gradient-primary" />
                                    <div className="p-5">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium",
                                                resource.type === "exam" ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                                            )}>{resource.type === "exam" ? "📝 Đề thi" : "📚 Tài liệu"}</span>
                                            {canDelete(resource) && (
                                                <button onClick={() => handleDelete(resource)} disabled={deleting === resource.id} className="opacity-0 group-hover:opacity-100 p-1.5 text-muted-foreground hover:text-red-500 transition-all">
                                                    {deleting === resource.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                                </button>
                                            )}
                                        </div>
                                        <div className="w-14 h-14 bg-muted/50 rounded-2xl flex items-center justify-center mb-4"><span className="text-3xl">{subjectInfo.icon}</span></div>
                                        <h3 className="font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{resource.title}</h3>
                                        {resource.description && <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{resource.description}</p>}
                                        <div className="flex items-center gap-3 text-xs text-muted-foreground/60 mb-4">
                                            <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{resource.view_count || 0}</span>
                                            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{formatDate(resource.created_at)}</span>
                                        </div>
                                        <Button onClick={() => handleView(resource)} className="w-full bg-muted/50 hover:bg-indigo-600 text-muted-foreground hover:text-white transition-colors border border-border hover:border-indigo-600">
                                            <Eye className="w-4 h-4 mr-2" />Xem tài liệu
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredResources.map((resource) => {
                            const subjectInfo = getSubjectInfo(resource.subject);
                            return (
                                <div key={resource.id} className="glass-card rounded-2xl p-4 flex items-center gap-4 group hover:shadow-lg transition-all">
                                    <div className="w-12 h-12 bg-muted/50 rounded-xl flex items-center justify-center shrink-0"><span className="text-2xl">{subjectInfo.icon}</span></div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-semibold text-foreground truncate">{resource.title}</h3>
                                            <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium shrink-0",
                                                resource.type === "exam" ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                                            )}>{resource.type === "exam" ? "Đề thi" : "Tài liệu"}</span>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                            <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{resource.view_count || 0} lượt xem</span>
                                            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{formatDate(resource.created_at)}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button size="sm" onClick={() => handleView(resource)} className="gradient-primary text-white border-0 shadow-lg shadow-indigo-500/20"><Eye className="w-4 h-4 mr-1.5" />Xem</Button>
                                        {canDelete(resource) && (
                                            <Button size="sm" variant="outline" onClick={() => handleDelete(resource)} disabled={deleting === resource.id} className="border-border text-muted-foreground hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600">
                                                {deleting === resource.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            <BottomNav />
        </div>
    );
}
