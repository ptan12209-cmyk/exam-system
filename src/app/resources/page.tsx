"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StudentHeader } from "@/components/student/StudentHeader";
import { BottomNav } from "@/components/BottomNav";
import { 
  Search, 
  Video, 
  FileText, 
  FolderOpen, 
  GraduationCap, 
  ChevronRight, 
  ChevronDown, 
  Loader2, 
  Eye, 
  ArrowLeft,
  X,
  BookOpen,
  Calendar,
  Lock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SUBJECTS, getSubjectInfo, MAP_SUBJECT_TO_DB, MAP_DB_TO_SUBJECT } from "@/lib/subjects";
import { AnimatePresence, motion } from "framer-motion";

interface Profile {
  id: string;
  role: string;
  full_name: string | null;
  grade: number | null;
  class_suffix: string | null;
  nickname?: string | null;
}

interface Chapter {
  id: string;
  subject: string;
  grade: number;
  title: string;
  order_index: number;
  created_at: string;
}

interface Lesson {
  id: string;
  chapter_id: string;
  title: string;
  order_index: number;
  created_at: string;
}

interface Material {
  id: string;
  lesson_id: string;
  title: string;
  type: "video" | "document";
  url: string;
  description: string | null;
  created_at: string;
}

// MAP_SUBJECT_TO_DB and MAP_DB_TO_SUBJECT imported from @/lib/subjects

export default function ResourcesPage() {
  const router = useRouter();
  const supabase = createClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Filter States
  const [selectedSubject, setSelectedSubject] = useState("toan");
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Data States
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [lessons, setLessons] = useState<Record<string, Lesson[]>>({});
  const [materials, setMaterials] = useState<Record<string, Material[]>>({});

  // UI Expansion States
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({});
  const [expandedLessons, setExpandedLessons] = useState<Record<string, boolean>>({});

  // Loading States
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [loadingLessons, setLoadingLessons] = useState<Record<string, boolean>>({});
  const [loadingMaterials, setLoadingMaterials] = useState<Record<string, boolean>>({});

  // Viewer Modal
  const [activeMaterial, setActiveMaterial] = useState<Material | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    setLoadingProfile(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }
    
    const { data: profileData } = await supabase
      .from("profiles")
      .select("id, role, full_name, grade, class_suffix, nickname")
      .eq("id", user.id)
      .single();

    if (profileData) {
      setProfile(profileData as Profile);
      // For students, lock selection to their own grade
      if (profileData.role === "student") {
        setSelectedGrade(profileData.grade ?? (profileData.nickname === "X" ? 12 : null));
      } else {
        // Teachers/Admins default to grade 12
        setSelectedGrade(12);
      }
    }
    setLoadingProfile(false);
  };

  // Fetch chapters when Subject or Grade filter changes
  useEffect(() => {
    if (selectedGrade !== null) {
      fetchChapters();
    }
  }, [selectedSubject, selectedGrade]);

  const fetchChapters = async () => {
    setLoadingChapters(true);
    try {
      const dbSubject = MAP_SUBJECT_TO_DB[selectedSubject] || "other";
      const res = await fetch(`/api/study/chapters?subject=${dbSubject}&grade=${selectedGrade}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi tải danh mục");

      setChapters(data.data || []);
      // Clear children elements on reload
      setLessons({});
      setMaterials({});
      setExpandedChapters({});
      setExpandedLessons({});
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingChapters(false);
    }
  };

  const fetchLessons = async (chapterId: string) => {
    setLoadingLessons(prev => ({ ...prev, [chapterId]: true }));
    try {
      const res = await fetch(`/api/study/lessons?chapter_id=${chapterId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi tải bài học");
      setLessons(prev => ({ ...prev, [chapterId]: data.data || [] }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLessons(prev => ({ ...prev, [chapterId]: false }));
    }
  };

  const fetchMaterials = async (lessonId: string) => {
    setLoadingMaterials(prev => ({ ...prev, [lessonId]: true }));
    try {
      const res = await fetch(`/api/study/materials?lesson_id=${lessonId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi tải học liệu");
      setMaterials(prev => ({ ...prev, [lessonId]: data.data || [] }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMaterials(prev => ({ ...prev, [lessonId]: false }));
    }
  };

  const toggleChapter = (chapterId: string) => {
    const isExpanded = !!expandedChapters[chapterId];
    setExpandedChapters(prev => ({ ...prev, [chapterId]: !isExpanded }));
    if (!isExpanded && (!lessons[chapterId] || lessons[chapterId].length === 0)) {
      fetchLessons(chapterId);
    }
  };

  const toggleLesson = (lessonId: string) => {
    const isExpanded = !!expandedLessons[lessonId];
    setExpandedLessons(prev => ({ ...prev, [lessonId]: !isExpanded }));
    if (!isExpanded && (!materials[lessonId] || materials[lessonId].length === 0)) {
      fetchMaterials(lessonId);
    }
  };

  // Search filter (client-side filtering on Chapters title matching search)
  const filteredChapters = useMemo(() => {
    if (!searchQuery.trim()) return chapters;
    return chapters.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [chapters, searchQuery]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const isTeacher = profile?.role === "teacher" || profile?.role === "admin";
  const canSelectAnyGrade = isTeacher || profile?.nickname === "X";

  if (loadingProfile) {
    return (
      <div className="flex h-screen items-center justify-center bg-[hsl(var(--background))]">
        <Loader2 className="h-10 w-10 animate-spin text-[hsl(var(--foreground))]/60" />
      </div>
    );
  }

  // If student has NULL grade, show restriction (exclude student X)
  const isStudentBlocked = profile?.role === "student" && profile?.grade === null && profile?.nickname !== "X";

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] pb-24 lg:pb-8">
      <StudentHeader 
        name={profile?.full_name} 
        studentClass={profile?.role === "student" ? (profile.nickname === "X" ? "Lớp X" : `${profile.grade}${profile.class_suffix || ""}`) : "Giáo viên"}
        onLogout={handleLogout} 
        nickname={profile?.nickname}
      />

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-4 py-6 lg:py-10 lg:pl-10">
        {isStudentBlocked ? (
          <section className="mx-auto max-w-lg mt-10 rounded-[2.5rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-8 text-center shadow-xl">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
              <Lock className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold">Yêu cầu cập nhật hồ sơ</h3>
            <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
              Hệ thống đã nâng cấp phân quyền khối lớp (6-12). Vui lòng quay lại Trang chủ để hoàn tất thiết lập thông tin lớp học của bạn trước khi truy cập tài nguyên học tập.
            </p>
            <Link href="/student/dashboard" className="mt-6 block">
              <Button className="w-full rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))]">
                Quay lại Dashboard
              </Button>
            </Link>
          </section>
        ) : (
          <>
            {/* Header Title */}
            <section className="mb-8 grid gap-6 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
              <div>
                <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))]/60 px-3 py-1 text-xs uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
                  <FolderOpen className="h-3.5 w-3.5" /> Học tập
                </p>
                <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">Kho Bài Giảng & Tài Liệu</h1>
                <p className="mt-4 max-w-2xl text-base leading-relaxed text-[hsl(var(--muted-foreground))] md:text-lg italic">
                  "Ngọc không mài không thành đồ dùng, người không học không biết đạo lý." – Lễ Ký
                </p>
              </div>
              
              <div className="liquid-glass rounded-[2rem] p-6 shadow-sm border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))]/50">
                <p className="text-xs text-[hsl(var(--muted-foreground))] uppercase tracking-wider font-semibold">Khối lớp hiện tại</p>
                <div className="mt-2 text-3xl font-bold text-foreground">
                  {profile?.role === "student" ? (profile.nickname === "X" ? `Không gian X - Khối ${selectedGrade}` : `Khối ${profile?.grade} (${profile?.grade}${profile?.class_suffix || ""})`) : `Khối lớp ${selectedGrade}`}
                </div>
                {canSelectAnyGrade && (
                  <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                    {profile?.nickname === "X" ? "Tài khoản X có quyền truy cập tất cả các khối" : "Giáo viên có toàn quyền xem các khối"}
                  </p>
                )}
              </div>
            </section>

            {/* Teacher Toolbar filters */}
            {canSelectAnyGrade && (
              <div className="mb-6 flex flex-wrap gap-2 items-center rounded-2xl bg-[hsl(var(--muted))]/20 p-3 border border-[hsl(var(--border))]/40">
                <span className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mr-2">Khối hiển thị:</span>
                {Array.from({ length: 7 }, (_, i) => i + 6).map((g) => (
                  <button
                    key={g}
                    onClick={() => setSelectedGrade(g)}
                    className={cn(
                      "rounded-full px-4 py-1.5 text-xs font-bold transition-all",
                      selectedGrade === g
                        ? "bg-[hsl(var(--foreground))] text-[hsl(var(--background))]"
                        : "border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))]"
                    )}
                  >
                    Khối {g}
                  </button>
                ))}
                {isTeacher && (
                  <Link href="/teacher/study" className="ml-auto">
                    <Button size="sm" className="rounded-full bg-emerald-600 text-white hover:bg-emerald-500 text-xs">
                      Quản lý học liệu
                    </Button>
                  </Link>
                )}
              </div>
            )}

            {/* Subject Selector Bar */}
            <div className="mb-6 flex flex-wrap gap-2 pb-2 overflow-x-auto border-b border-[hsl(var(--border))]/20">
              {SUBJECTS.map((subject) => (
                <button
                  key={subject.value}
                  onClick={() => setSelectedSubject(subject.value)}
                  className={cn(
                    "mr-2 mb-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all flex items-center gap-1.5",
                    selectedSubject === subject.value
                      ? "bg-[hsl(var(--foreground))] text-[hsl(var(--background))]"
                      : "border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--foreground))]/30"
                  )}
                >
                  <span>{subject.icon}</span>
                  <span>{subject.label}</span>
                </button>
              ))}
            </div>

            {/* Search on mobile */}
            <div className="md:hidden mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                <Input 
                  type="text" 
                  placeholder="Tìm kiếm chương học..." 
                  value={searchQuery} 
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)} 
                  className="pl-10 rounded-full" 
                />
              </div>
            </div>

            {/* Tree Folder Layout */}
            <div className="space-y-4">
              {loadingChapters ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--foreground))]/70" />
                </div>
              ) : filteredChapters.length === 0 ? (
                <div className="rounded-[2rem] liquid-glass p-16 text-center border border-[hsl(var(--border))]/60">
                  <FolderOpen className="mx-auto mb-4 h-12 w-12 opacity-30 text-[hsl(var(--muted-foreground))]" />
                  <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">Không tìm thấy tài nguyên</h3>
                  <p className="mt-2 text-[hsl(var(--muted-foreground))]">
                    Môn học hoặc khối lớp hiện tại chưa có chương mục bài giảng nào được đăng tải.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredChapters.map((chapter) => {
                    const isExpanded = !!expandedChapters[chapter.id];
                    const chapterLessons = lessons[chapter.id] || [];
                    const isLoadingLessons = !!loadingLessons[chapter.id];

                    return (
                      <div key={chapter.id} className="overflow-hidden rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))]/40 backdrop-blur-sm shadow-sm transition-all duration-300">
                        {/* Chapter Click Area */}
                        <div 
                          onClick={() => toggleChapter(chapter.id)}
                          className="flex items-center gap-4 px-6 py-5 cursor-pointer select-none bg-[hsl(var(--muted))]/10 hover:bg-[hsl(var(--muted))]/20 transition-all duration-200"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--foreground))]/5 text-[hsl(var(--foreground))] border border-[hsl(var(--border))]/30">
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Chương {chapter.order_index}</span>
                            <h3 className="font-bold tracking-tight text-base text-foreground mt-0.5">{chapter.title}</h3>
                          </div>
                        </div>

                        {/* Lessons List container */}
                        <AnimatePresence initial={false}>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2, ease: "easeInOut" }}
                              className="border-t border-[hsl(var(--border))]/10 divide-y divide-[hsl(var(--border))]/10"
                            >
                              {isLoadingLessons ? (
                                <div className="flex items-center justify-center py-6">
                                  <Loader2 className="h-5 w-5 animate-spin text-[hsl(var(--foreground))]/50" />
                                  <span className="ml-2.5 text-xs text-[hsl(var(--muted-foreground))]">Đang tải bài học...</span>
                                </div>
                              ) : chapterLessons.length === 0 ? (
                                <div className="p-6 text-center text-xs text-[hsl(var(--muted-foreground))] italic">
                                  Chưa có bài học nào được tải lên cho chương này.
                                </div>
                              ) : (
                                chapterLessons.map((lesson) => {
                                  const isLessonExpanded = !!expandedLessons[lesson.id];
                                  const lessonMaterials = materials[lesson.id] || [];
                                  const isLoadingMaterials = !!loadingMaterials[lesson.id];

                                  return (
                                    <div key={lesson.id} className="p-4 bg-transparent pl-8">
                                      {/* Lesson Toggle row */}
                                      <div 
                                        onClick={() => toggleLesson(lesson.id)}
                                        className="flex items-center gap-3 cursor-pointer select-none py-2 hover:opacity-80"
                                      >
                                        {isLessonExpanded ? <ChevronDown className="h-3.5 w-3.5 opacity-60" /> : <ChevronRight className="h-3.5 w-3.5 opacity-60" />}
                                        <div>
                                          <p className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Bài {lesson.order_index}</p>
                                          <h4 className="font-semibold text-sm text-foreground mt-0.5">{lesson.title}</h4>
                                        </div>
                                      </div>

                                      {/* Materials list */}
                                      <AnimatePresence initial={false}>
                                        {isLessonExpanded && (
                                          <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="mt-3 ml-6 pl-4 border-l border-[hsl(var(--border))]/50 space-y-2.5"
                                          >
                                            {isLoadingMaterials ? (
                                              <div className="flex items-center py-3">
                                                <Loader2 className="h-4 w-4 animate-spin text-[hsl(var(--foreground))]/40" />
                                                <span className="ml-2 text-[10px] text-[hsl(var(--muted-foreground))]">Đang tải tài nguyên...</span>
                                              </div>
                                            ) : lessonMaterials.length === 0 ? (
                                              <p className="text-[11px] text-[hsl(var(--muted-foreground))] italic py-1">
                                                Không có tài liệu hoặc bài giảng nào cho bài này.
                                              </p>
                                            ) : (
                                              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-2">
                                                {lessonMaterials.map((material) => (
                                                  <div 
                                                    key={material.id} 
                                                    onClick={() => setActiveMaterial(material)}
                                                    className="flex items-center justify-between gap-3 rounded-2xl border border-[hsl(var(--border))]/40 bg-[hsl(var(--background))]/30 hover:bg-[hsl(var(--background))]/70 px-4 py-3 cursor-pointer transition-colors duration-200 group"
                                                  >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--background))] border border-[hsl(var(--border))]/50 text-[hsl(var(--muted-foreground))]">
                                                        {material.type === "video" ? (
                                                          <Video className="h-4 w-4 text-rose-500 group-hover:scale-110 transition-transform" />
                                                        ) : (
                                                          <FileText className="h-4 w-4 text-emerald-500 group-hover:scale-110 transition-transform" />
                                                        )}
                                                      </div>
                                                      <div className="min-w-0">
                                                        <h5 className="font-semibold text-xs text-foreground truncate group-hover:text-[hsl(var(--foreground))] transition-colors">{material.title}</h5>
                                                        <p className="text-[9px] text-[hsl(var(--muted-foreground))] uppercase tracking-wider font-bold mt-0.5">
                                                          {material.type === "video" ? "Xem video bài giảng" : "Tài liệu học tập (PDF)"}
                                                        </p>
                                                      </div>
                                                    </div>
                                                    <div className="shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-[hsl(var(--foreground))]/5 group-hover:bg-[hsl(var(--foreground))] group-hover:text-[hsl(var(--background))] transition-colors">
                                                      <Eye className="h-3 w-3" />
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                    </div>
                                  );
                                })
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Resource Details Viewer Modal (Secure YouTube embed & PDF view) */}
      <AnimatePresence>
        {activeMaterial && (
          <div 
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
            onContextMenu={(e) => e.preventDefault()} // Global right-click disable on media overlay
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-4xl rounded-[2.5rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] overflow-hidden shadow-2xl flex flex-col h-[85vh] lg:h-[80vh]"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))]/30 bg-[hsl(var(--muted))]/10 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--background))] border border-[hsl(var(--border))]/60">
                    {activeMaterial.type === "video" ? (
                      <Video className="h-4 w-4 text-rose-500" />
                    ) : (
                      <FileText className="h-4 w-4 text-emerald-500" />
                    )}
                  </div>
                  <h3 className="font-bold text-sm tracking-tight text-foreground truncate">{activeMaterial.title}</h3>
                </div>
                <button 
                  onClick={() => setActiveMaterial(null)}
                  className="rounded-full p-1.5 hover:bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:text-foreground transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6 bg-black/10 flex flex-col">
                {activeMaterial.description && (
                  <p className="mb-4 text-xs text-[hsl(var(--muted-foreground))] leading-relaxed bg-[hsl(var(--card))]/50 border border-[hsl(var(--border))]/40 rounded-xl px-4 py-3 shrink-0">
                    <span className="font-bold">Mô tả từ giáo viên:</span> {activeMaterial.description}
                  </p>
                )}

                <div className="flex-1 relative w-full rounded-2xl overflow-hidden border border-[hsl(var(--border))]/40 bg-black flex items-center justify-center">
                  {activeMaterial.type === "video" ? (
                    <div className="relative w-full h-full aspect-video flex items-center justify-center">
                      <iframe
                        src={`${activeMaterial.url}?controls=0&disablekb=1&rel=0&modestbranding=1&autoplay=1&iv_load_policy=3`}
                        title={activeMaterial.title}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      ></iframe>
                      
                      {/* Double Transparent Protection Overlays */}
                      {/* Top Overlay to block YouTube Share / Title / Channel options */}
                      <div 
                        className="absolute top-0 left-0 right-0 h-[60px] bg-transparent cursor-default"
                        onClick={(e) => e.stopPropagation()}
                      />
                      {/* Bottom-Right Overlay to block YouTube logo / redirection link */}
                      <div 
                        className="absolute bottom-0 right-0 w-[100px] h-[50px] bg-transparent cursor-default"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  ) : (
                    /* Inline PDF Viewer */
                    <iframe
                      src={`${activeMaterial.url}#toolbar=0`}
                      className="w-full h-full"
                      title={activeMaterial.title}
                    />
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}
