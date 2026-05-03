"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NotificationBell } from "@/components/NotificationBell";
import { UserMenu } from "@/components/UserMenu";
import { BottomNav } from "@/components/BottomNav";
import { Search, Upload, FileText, Eye, Trash2, Filter, Grid3X3, List, BookOpen, GraduationCap, Calendar, Loader2, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface Resource {
  id: string; title: string; type: "document" | "exam"; subject: string;
  file_url: string; description: string; tags: string[];
  view_count: number; download_count: number; created_at: string; uploader_id: string;
}

const SUBJECTS = [
  { value: "", label: "Tất cả", icon: "📚" }, { value: "math", label: "Toán", icon: "🔢" }, { value: "physics", label: "Vật lý", icon: "⚛️" },
  { value: "chemistry", label: "Hóa học", icon: "🧪" }, { value: "biology", label: "Sinh học", icon: "🧬" }, { value: "english", label: "Tiếng Anh", icon: "🇬🇧" },
  { value: "literature", label: "Ngữ văn", icon: "📖" }, { value: "history", label: "Lịch sử", icon: "🏛️" }, { value: "geography", label: "Địa lý", icon: "🌍" },
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

  const filteredResources = useMemo(() => resources.filter((r) => r.title.toLowerCase().includes(searchQuery.toLowerCase()) || r.description?.toLowerCase().includes(searchQuery.toLowerCase())), [resources, searchQuery]);
  const handleView = async (resource: Resource) => { await supabase.rpc("increment_resource_view", { resource_id: resource.id }); window.open(resource.file_url, "_blank"); };
  const handleDelete = async (resource: Resource) => { if (!confirm(`Xóa tài liệu "${resource.title}"?`)) return; setDeleting(resource.id); try { const fileName = resource.file_url.split("/").pop(); if (fileName) await supabase.storage.from("exam-pdfs").remove([`resources/${fileName}`]); await supabase.from("resources").delete().eq("id", resource.id); fetchResources(); } catch { alert("Không thể xóa tài liệu"); } finally { setDeleting(null); } };
  const handleLogout = async () => { await supabase.auth.signOut(); router.push("/login"); };
  const getSubjectInfo = (subject: string) => SUBJECTS.find((s) => s.value === subject) || SUBJECTS[0];
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString("vi-VN");
  const canUpload = user?.role === "teacher";
  const canDelete = (resource: Resource) => user?.id === resource.uploader_id || user?.role === "teacher";

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] pb-24 lg:pb-8">
      <header className="glass-nav sticky top-0 z-50">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[hsl(var(--foreground))] text-[hsl(var(--background))]"><GraduationCap className="h-5 w-5" /></div><span className="hidden text-xl font-bold text-[hsl(var(--foreground))] sm:block">ExamHub</span></Link>
          <div className="hidden md:flex flex-1 max-w-md mx-8"><div className="relative w-full"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" /><Input type="text" placeholder="Tìm kiếm tài liệu..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 rounded-full bg-[hsl(var(--card))]" /></div></div>
          <div className="flex items-center gap-3">{user ? <><NotificationBell /><UserMenu userName={user.full_name || ""} onLogout={handleLogout} role={user.role === "teacher" ? "teacher" : "student"} /></> : <Link href="/login"><Button className="rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:bg-[hsl(var(--foreground))]/90">Đăng nhập</Button></Link>}</div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 lg:py-10 lg:ml-64">
        <section className="mb-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div><p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))]/60 px-3 py-1 text-xs uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]"><FolderOpen className="h-3.5 w-3.5" /> Tài nguyên</p><h1 className="text-4xl font-semibold tracking-tight md:text-6xl">Kho Tài Liệu</h1><p className="mt-4 max-w-2xl text-base leading-relaxed text-[hsl(var(--muted-foreground))] md:text-lg">Chia sẻ và học tập cùng nhau với tài liệu được phân loại rõ ràng.</p></div>
          <div className="liquid-glass rounded-[2rem] p-6 shadow-sm"><p className="text-sm text-[hsl(var(--muted-foreground))]">Tổng tài liệu</p><div className="mt-2 text-3xl font-semibold">{filteredResources.length}</div><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Đã chia sẻ</p></div>
        </section>

        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="hidden sm:flex items-center rounded-2xl bg-[hsl(var(--muted))]/20 p-1"><button onClick={() => setViewMode("grid")} className={cn("rounded-xl p-2", viewMode === "grid" ? "bg-[hsl(var(--card))] text-[hsl(var(--foreground))]" : "text-[hsl(var(--muted-foreground))]")}><Grid3X3 className="h-4 w-4" /></button><button onClick={() => setViewMode("list")} className={cn("rounded-xl p-2", viewMode === "list" ? "bg-[hsl(var(--card))] text-[hsl(var(--foreground))]" : "text-[hsl(var(--muted-foreground))]")}><List className="h-4 w-4" /></button></div>
          <div className="flex items-center gap-3"><Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="lg:hidden rounded-full"><Filter className="mr-2 h-4 w-4" />Lọc</Button>{canUpload && <Link href="/resources/upload"><Button className="rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:bg-[hsl(var(--foreground))]/90"><Upload className="mr-2 h-4 w-4" />Tải lên</Button></Link>}</div>
        </div>

        <div className="md:hidden mb-4"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" /><Input type="text" placeholder="Tìm kiếm tài liệu..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 rounded-full" /></div></div>

        <div className={cn("mb-6", showFilters ? "block" : "hidden lg:block")}>{SUBJECTS.map((subject) => <button key={subject.value} onClick={() => setFilterSubject(subject.value)} className={cn("mr-2 mb-2 rounded-full px-4 py-2 text-sm font-medium", filterSubject === subject.value ? "bg-[hsl(var(--foreground))] text-[hsl(var(--background))]" : "border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))]")}>{subject.icon} {subject.label}</button>)}<div className="mt-2 flex gap-2">{[{ key: "", label: "Tất cả" }, { key: "document", label: "Tài liệu", icon: BookOpen }, { key: "exam", label: "Đề thi", icon: FileText }].map((t) => <button key={t.key} onClick={() => setFilterType(t.key)} className={cn("rounded-full px-3 py-1.5 text-sm font-medium", filterType === t.key ? "bg-[hsl(var(--foreground))] text-[hsl(var(--background))]" : "text-[hsl(var(--muted-foreground))] bg-[hsl(var(--card))]")}>{t.icon ? <t.icon className="mr-1.5 inline h-3.5 w-3.5" /> : null}{t.label}</button>)}</div></div>

        {loading ? <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--foreground))]/70" /></div> : filteredResources.length === 0 ? <div className="rounded-[2rem] liquid-glass p-16 text-center"><FolderOpen className="mx-auto mb-4 h-12 w-12 opacity-30" /><h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">Chưa có tài liệu nào</h3><p className="mt-2 text-[hsl(var(--muted-foreground))]">{canUpload ? "Hãy là người đầu tiên chia sẻ tài liệu!" : "Hãy quay lại sau nhé!"}</p>{canUpload && <Link href="/resources/upload"><Button className="mt-6 rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:bg-[hsl(var(--foreground))]/90"><Upload className="mr-2 h-4 w-4" />Tải lên tài liệu đầu tiên</Button></Link>}</div> : viewMode === "grid" ? <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{filteredResources.map((resource) => { const subjectInfo = getSubjectInfo(resource.subject); return <div key={resource.id} className="rounded-[2rem] liquid-glass overflow-hidden shadow-sm hover:translate-y-[-2px] transition-transform duration-300"><div className="h-1 bg-[hsl(var(--foreground))] opacity-20" /><div className="p-5"><div className="mb-3 flex items-center justify-between"><span className={cn("rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider", resource.type === "exam" ? "bg-indigo-500/10 text-indigo-400" : "bg-emerald-500/10 text-emerald-400")}>{resource.type === "exam" ? "Đề thi" : "Tài liệu"}</span>{canDelete(resource) && <button onClick={() => handleDelete(resource)} disabled={deleting === resource.id} className="p-1.5 text-[hsl(var(--muted-foreground))] hover:text-red-500">{deleting === resource.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}</button>}</div><div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[hsl(var(--foreground))]/5 text-3xl">{subjectInfo.icon}</div><h3 className="mb-2 line-clamp-2 font-semibold tracking-tight">{resource.title}</h3>{resource.description && <p className="mb-4 line-clamp-2 text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">{resource.description}</p>}<div className="mb-4 flex items-center gap-3 text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]"><span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5 opacity-50" />{resource.view_count || 0}</span><span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5 opacity-50" />{formatDate(resource.created_at)}</span></div><Button onClick={() => handleView(resource)} className="w-full rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:bg-[hsl(var(--foreground))]/90"><Eye className="mr-2 h-4 w-4" />Xem tài liệu</Button></div></div>})}</div> : <div className="space-y-3">{filteredResources.map((resource) => { const subjectInfo = getSubjectInfo(resource.subject); return <div key={resource.id} className="flex items-center gap-4 rounded-[2rem] liquid-glass p-4"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--foreground))]/5 text-2xl">{subjectInfo.icon}</div><div className="min-w-0 flex-1"><div className="mb-1 flex items-center gap-2"><h3 className="truncate font-semibold">{resource.title}</h3><span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", resource.type === "exam" ? "bg-indigo-500/10 text-indigo-400" : "bg-emerald-500/10 text-emerald-400")}>{resource.type === "exam" ? "Đề thi" : "Tài liệu"}</span></div><div className="flex items-center gap-4 text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]"><span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5 opacity-50" />{resource.view_count || 0} lượt xem</span><span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5 opacity-50" />{formatDate(resource.created_at)}</span></div></div><div className="flex items-center gap-2"><Button size="sm" onClick={() => handleView(resource)} className="rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:bg-[hsl(var(--foreground))]/90"><Eye className="mr-1.5 h-4 w-4" />Xem</Button>{canDelete(resource) && <Button size="sm" variant="ghost" onClick={() => handleDelete(resource)} disabled={deleting === resource.id} className="rounded-full text-red-500 hover:text-red-400 hover:bg-red-500/10">{deleting === resource.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}</Button>}</div></div>})}</div>}
      </main>
      <BottomNav />
    </div>
  );
}
