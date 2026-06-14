"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TeacherShell } from "@/components/teacher/TeacherShell"
import { NotificationBell } from "@/components/NotificationBell"
import { UserMenu } from "@/components/UserMenu"
import { TeacherBottomNav } from "@/components/BottomNav"
import { 
  Plus, 
  FolderOpen, 
  FolderPlus, 
  FilePlus2, 
  Trash2, 
  Edit3, 
  Video, 
  FileText, 
  Loader2, 
  ChevronDown, 
  ChevronRight, 
  ExternalLink,
  BookOpen,
  X
} from "lucide-react"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useToast } from "@/components/ui/toast"
import { SUBJECTS, getSubjectInfo, MAP_SUBJECT_TO_DB, MAP_DB_TO_SUBJECT } from "@/lib/subjects"
import { AnimatePresence, motion } from "framer-motion"

interface Chapter {
  id: string
  subject: string
  grade: number
  title: string
  order_index: number
}

interface Lesson {
  id: string
  chapter_id: string
  title: string
  order_index: number
}

interface Section {
  id: string
  lesson_id: string
  title: string
  order_index: number
}

interface Material {
  id: string
  lesson_id: string
  title: string
  type: "video" | "document"
  url: string
  description: string | null
}

// MAP_SUBJECT_TO_DB and MAP_DB_TO_SUBJECT imported from @/lib/subjects

export default function TeacherStudyPage() {
  const router = useRouter()
  const supabase = createClient()
  const { success, error: toastError } = useToast()

  // Authentication
  const [profile, setProfile] = useState<{ full_name: string | null } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "chapter" | "lesson" | "section" | "material"
    id: string
    parentId?: string
    title: string
  } | null>(null)
  
  // Selection States
  const [selectedSubject, setSelectedSubject] = useState("toan")
  const [selectedGrade, setSelectedGrade] = useState(12)
  
  // Loaded Data
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [lessons, setLessons] = useState<Record<string, Lesson[]>>({})
  const [sections, setSections] = useState<Record<string, Section[]>>({})
  const [materials, setMaterials] = useState<Record<string, Material[]>>({})
  
  // Collapsed State for UI Tree
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({})
  const [expandedLessons, setExpandedLessons] = useState<Record<string, boolean>>({})
  
  // Loadings
  const [loadingChapters, setLoadingChapters] = useState(false)
  const [loadingLessons, setLoadingLessons] = useState<Record<string, boolean>>({})
  const [loadingSections, setLoadingSections] = useState<Record<string, boolean>>({})
  const [loadingMaterials, setLoadingMaterials] = useState<Record<string, boolean>>({})
  
  // Modals / Forms
  const [activeModal, setActiveModal] = useState<"chapter" | "lesson" | "section" | "material" | null>(null)
  const [editingItem, setEditingItem] = useState<{ type: "chapter" | "lesson" | "section" | "material"; id: string } | null>(null)
  
  // Form values
  const [chapterTitle, setChapterTitle] = useState("")
  const [chapterOrder, setChapterOrder] = useState(1)
  
  const [lessonTitle, setLessonTitle] = useState("")
  const [lessonOrder, setLessonOrder] = useState(1)
  const [targetChapterId, setTargetChapterId] = useState("")
  
  const [sectionTitle, setSectionTitle] = useState("")
  const [sectionOrder, setSectionOrder] = useState(1)
  
  const [materialTitle, setMaterialTitle] = useState("")
  const [materialType, setMaterialType] = useState<"video" | "document">("video")
  const [materialUrl, setMaterialUrl] = useState("")
  const [materialDesc, setMaterialDesc] = useState("")
  const [targetLessonId, setTargetLessonId] = useState("")

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/login")
        return
      }
      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", user.id)
        .single()
        
      if (!profileData || (profileData.role !== "teacher" && profileData.role !== "admin")) {
        router.push("/student/dashboard")
        return
      }
      setProfile(profileData)
    }
    checkAuth()
  }, [router, supabase])
  // Fetch Chapters
  const fetchChapters = async () => {
    setLoadingChapters(true)
    setError(null)
    try {
      const dbSubject = MAP_SUBJECT_TO_DB[selectedSubject] || "other"
      const res = await fetch(`/api/study/chapters?subject=${dbSubject}&grade=${selectedGrade}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Không thể tải danh sách chương học")
      
      const chaptersList: Chapter[] = data.data || []
      setChapters(chaptersList)
      
      // Clear lessons, sections and materials state for clean load
      setLessons({})
      setSections({})
      setMaterials({})
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra")
    } finally {
      setLoadingChapters(false)
    }
  }

  useEffect(() => {
    fetchChapters()
  }, [selectedSubject, selectedGrade])

  // Fetch Lessons for a Chapter
  const fetchLessons = async (chapterId: string) => {
    setLoadingLessons(prev => ({ ...prev, [chapterId]: true }))
    try {
      const res = await fetch(`/api/study/lessons?chapter_id=${chapterId}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Không thể tải bài học")
      
      setLessons(prev => ({ ...prev, [chapterId]: data.data || [] }))
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingLessons(prev => ({ ...prev, [chapterId]: false }))
    }
  }

  // Fetch Sections for a Lesson
  const fetchSections = async (lessonId: string) => {
    setLoadingSections(prev => ({ ...prev, [lessonId]: true }))
    try {
      const res = await fetch(`/api/study/sections?lesson_id=${lessonId}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Không thể tải phần học")
      
      setSections(prev => ({ ...prev, [lessonId]: data.data || [] }))
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingSections(prev => ({ ...prev, [lessonId]: false }))
    }
  }

  // Fetch Materials for a Lesson
  const fetchMaterials = async (lessonId: string) => {
    setLoadingMaterials(prev => ({ ...prev, [lessonId]: true }))
    try {
      const res = await fetch(`/api/study/materials?lesson_id=${lessonId}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Không thể tải tài liệu")
      
      setMaterials(prev => ({ ...prev, [lessonId]: data.data || [] }))
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingMaterials(prev => ({ ...prev, [lessonId]: false }))
    }
  }

  const toggleChapter = (chapterId: string) => {
    const isExpanded = !!expandedChapters[chapterId]
    setExpandedChapters(prev => ({ ...prev, [chapterId]: !isExpanded }))
    if (!isExpanded && (!lessons[chapterId] || lessons[chapterId].length === 0)) {
      fetchLessons(chapterId)
    }
  }

  const toggleLesson = (lessonId: string) => {
    const isExpanded = !!expandedLessons[lessonId]
    setExpandedLessons(prev => ({ ...prev, [lessonId]: !isExpanded }))
    if (!isExpanded) {
      if (!materials[lessonId] || materials[lessonId].length === 0) {
        fetchMaterials(lessonId)
      }
      if (!sections[lessonId] || sections[lessonId].length === 0) {
        fetchSections(lessonId)
      }
    }
  }
  // Handle Chapter Submissions
  const handleChapterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chapterTitle.trim()) return
    setSubmitting(true)
    setError(null)
    
    try {
      const dbSubject = MAP_SUBJECT_TO_DB[selectedSubject] || "other"
      const body = {
        id: editingItem?.type === "chapter" ? editingItem.id : undefined,
        subject: dbSubject,
        grade: selectedGrade,
        title: chapterTitle.trim(),
        order_index: Number(chapterOrder)
      }
      
      const res = await fetch("/api/study/chapters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Lỗi xử lý chương học")
      
      await fetchChapters()
      closeModal()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra")
    } finally {
      setSubmitting(false)
    }
  }

  // Delete Chapter Trigger
  const handleDeleteChapter = (chapterId: string, title: string) => {
    setDeleteTarget({ type: "chapter", id: chapterId, title })
  }

  // Handle Lesson Submissions
  const handleLessonSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!lessonTitle.trim()) return
    setSubmitting(true)
    setError(null)
    
    try {
      const body = {
        id: editingItem?.type === "lesson" ? editingItem.id : undefined,
        chapter_id: targetChapterId,
        title: lessonTitle.trim(),
        order_index: Number(lessonOrder)
      }
      
      const res = await fetch("/api/study/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Lỗi xử lý bài học")
      
      await fetchLessons(targetChapterId)
      setExpandedChapters(prev => ({ ...prev, [targetChapterId]: true }))
      closeModal()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra")
    } finally {
      setSubmitting(false)
    }
  }

  // Delete Lesson Trigger
  const handleDeleteLesson = (chapterId: string, lessonId: string, title: string) => {
    setDeleteTarget({ type: "lesson", id: lessonId, parentId: chapterId, title })
  }

  // Handle Material Submissions
  const handleMaterialSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!materialTitle.trim() || !materialUrl.trim()) return
    setSubmitting(true)
    setError(null)
    
    try {
      const body = {
        id: editingItem?.type === "material" ? editingItem.id : undefined,
        lesson_id: targetLessonId,
        title: materialTitle.trim(),
        type: materialType,
        url: materialUrl.trim(),
        description: materialDesc.trim() || null
      }
      
      const res = await fetch("/api/study/materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Lỗi xử lý học liệu")
      
      await fetchMaterials(targetLessonId)
      setExpandedLessons(prev => ({ ...prev, [targetLessonId]: true }))
      closeModal()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra")
    } finally {
      setSubmitting(false)
    }
  }
  // Delete Material Trigger
  const handleDeleteMaterial = (lessonId: string, materialId: string, title: string) => {
    setDeleteTarget({ type: "material", id: materialId, parentId: lessonId, title })
  }

  // Handle Section Submissions
  const handleSectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sectionTitle.trim()) return
    setSubmitting(true)
    setError(null)
    
    try {
      const body = {
        id: editingItem?.type === "section" ? editingItem.id : undefined,
        lesson_id: targetLessonId,
        title: sectionTitle.trim(),
        order_index: Number(sectionOrder)
      }
      
      const res = await fetch("/api/study/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Lỗi xử lý phần học")
      
      await fetchSections(targetLessonId)
      setExpandedLessons(prev => ({ ...prev, [targetLessonId]: true }))
      closeModal()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra")
    } finally {
      setSubmitting(false)
    }
  }

  // Delete Section Trigger
  const handleDeleteSection = (lessonId: string, sectionId: string, title: string) => {
    setDeleteTarget({ type: "section", id: sectionId, parentId: lessonId, title })
  }

  // executeDelete function for ConfirmDialog
  const executeDelete = async () => {
    if (!deleteTarget) return
    const { type, id, parentId, title } = deleteTarget
    try {
      if (type === "chapter") {
        const res = await fetch(`/api/study/chapters?id=${id}`, { method: "DELETE" })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || "Không thể xóa chương học")
        }
        fetchChapters()
      } else if (type === "lesson") {
        const res = await fetch(`/api/study/lessons?id=${id}`, { method: "DELETE" })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || "Không thể xóa bài học")
        }
        if (parentId) fetchLessons(parentId)
      } else if (type === "material") {
        const res = await fetch(`/api/study/materials?id=${id}`, { method: "DELETE" })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || "Không thể xóa học liệu")
        }
        if (parentId) fetchMaterials(parentId)
      } else if (type === "section") {
        const res = await fetch(`/api/study/sections?id=${id}`, { method: "DELETE" })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || "Không thể xóa phần học")
        }
        if (parentId) fetchSections(parentId)
      }
      success("Xóa thành công!")
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Lỗi xảy ra")
    }
  }

  // Edit triggers
  const openEditChapter = (chapter: Chapter) => {
    setEditingItem({ type: "chapter", id: chapter.id })
    setChapterTitle(chapter.title)
    setChapterOrder(chapter.order_index)
    setActiveModal("chapter")
  }

  const openEditLesson = (chapterId: string, lesson: Lesson) => {
    setTargetChapterId(chapterId)
    setEditingItem({ type: "lesson", id: lesson.id })
    setLessonTitle(lesson.title)
    setLessonOrder(lesson.order_index)
    setActiveModal("lesson")
  }

  const openEditSection = (lessonId: string, section: Section) => {
    setTargetLessonId(lessonId)
    setEditingItem({ type: "section", id: section.id })
    setSectionTitle(section.title)
    setSectionOrder(section.order_index)
    setActiveModal("section")
  }

  const openEditMaterial = (lessonId: string, material: Material) => {
    setTargetLessonId(lessonId)
    setEditingItem({ type: "material", id: material.id })
    setMaterialTitle(material.title)
    setMaterialType(material.type)
    setMaterialUrl(material.url)
    setMaterialDesc(material.description || "")
    setActiveModal("material")
  }

  const closeModal = () => {
    setActiveModal(null)
    setEditingItem(null)
    setChapterTitle("")
    setChapterOrder(1)
    setLessonTitle("")
    setLessonOrder(1)
    setSectionTitle("")
    setSectionOrder(1)
    setMaterialTitle("")
    setMaterialUrl("")
    setMaterialDesc("")
    setError(null)
  }
  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <TeacherShell onLogout={handleLogout}>
      <header className="fixed top-0 z-50 flex h-16 w-full items-center justify-between border-b border-[hsl(var(--border))]/30 bg-[hsl(var(--background))]/80 px-4 backdrop-blur-xl lg:hidden safe-top">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          <span className="text-lg font-bold tracking-tight">Quản lý bài học</span>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <UserMenu userName={profile?.full_name || ""} role="teacher" onLogout={handleLogout} />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-24 pt-24 md:px-10 lg:pt-28">
        {/* Header Section */}
        <section className="mb-10 grid gap-6 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))]/60 px-4 py-2 text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-widest">
              <FolderOpen className="h-4 w-4" /> Lesson & Video lectures database
            </div>
            <h1 className="max-w-4xl text-5xl font-medium tracking-[-2px] md:text-7xl lg:text-8xl">Quản lý học liệu</h1>
            <p className="mt-6 max-w-2xl text-lg leading-[1.7] text-[hsl(var(--muted-foreground))]">
              Xây dựng kho video bài giảng & tài liệu tự học theo cấu trúc Chương học $\rightarrow$ Bài học. Giáo viên phân lớp và quản lý trực tiếp tại đây.
            </p>
          </div>

          <div className="liquid-glass rounded-[2rem] p-6 shadow-xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))]/50">
            <h3 className="text-sm font-bold uppercase text-[hsl(var(--muted-foreground))] tracking-wider">Thông tin thống kê</h3>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">Tổng số chương</p>
                <p className="text-3xl font-bold tracking-tight mt-1">{chapters.length}</p>
              </div>
              <Button 
                onClick={() => {
                  setChapterTitle("")
                  setChapterOrder(chapters.length + 1)
                  setActiveModal("chapter")
                }}
                className="w-full rounded-2xl bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:bg-[hsl(var(--foreground))]/90 h-full py-4 text-xs font-bold"
              >
                <FolderPlus className="mr-1.5 h-4 w-4" /> Thêm Chương
              </Button>
            </div>
          </div>
        </section>

        {/* Filter Toolbar */}
        <div className="mb-8 flex flex-col gap-4 rounded-3xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))]/30 p-5 md:flex-row md:items-center">
          <div className="flex-1 space-y-1.5">
            <Label className="text-xs font-bold uppercase text-[hsl(var(--muted-foreground))] tracking-wider">Chọn môn học</Label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full rounded-xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--background))] px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--foreground))]"
            >
              {SUBJECTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.icon} {s.label}
                </option>
              ))}
            </select>
          </div>
          <div className="w-full md:w-48 space-y-1.5">
            <Label className="text-xs font-bold uppercase text-[hsl(var(--muted-foreground))] tracking-wider">Chọn khối lớp</Label>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(Number(e.target.value))}
              className="w-full rounded-xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--background))] px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--foreground))]"
            >
              {Array.from({ length: 7 }, (_, i) => i + 6).map((g) => (
                <option key={g} value={g}>
                  Khối lớp {g}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Chapters & Lessons Tree View */}
        <div className="space-y-4">
          {loadingChapters ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-[hsl(var(--foreground))]/60" />
              <p className="mt-3 text-sm text-[hsl(var(--muted-foreground))]">Đang tải cấu trúc bài giảng...</p>
            </div>
          ) : chapters.length === 0 ? (
            <div className="rounded-[2.5rem] border border-dashed border-[hsl(var(--border))]/80 bg-[hsl(var(--card))]/10 p-16 text-center">
              <FolderOpen className="mx-auto h-16 w-16 text-[hsl(var(--muted-foreground))]/40" strokeWidth={1} />
              <h3 className="mt-4 text-xl font-bold">Chưa có chương học nào</h3>
              <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))] max-w-sm mx-auto">
                Bắt đầu xây dựng giáo trình tự học bằng cách thêm chương học đầu tiên cho khối này.
              </p>
              <Button 
                onClick={() => {
                  setChapterTitle("")
                  setChapterOrder(1)
                  setActiveModal("chapter")
                }}
                className="mt-6 rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:bg-[hsl(var(--foreground))]/90"
              >
                <Plus className="mr-1.5 h-4 w-4" /> Tạo chương mới
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {chapters.map((chapter) => {
                const isExpanded = !!expandedChapters[chapter.id]
                const chapterLessons = lessons[chapter.id] || []
                const isLoadingLessons = !!loadingLessons[chapter.id]

                return (
                  <div key={chapter.id} className="overflow-hidden rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))]/40 backdrop-blur-sm shadow-sm transition-all duration-300">
                    {/* Chapter Header */}
                    <div className="flex flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between border-b border-[hsl(var(--border))]/20 bg-[hsl(var(--muted))]/10">
                      <div className="flex items-center gap-3 cursor-pointer select-none min-w-0 flex-1" onClick={() => toggleChapter(chapter.id)}>
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--foreground))]/5 text-[hsl(var(--foreground))]">
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Chương {chapter.order_index}</span>
                          <h3 className="font-bold tracking-tight truncate text-base text-foreground mt-0.5">{chapter.title}</h3>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => {
                            setTargetChapterId(chapter.id)
                            setLessonTitle("")
                            setLessonOrder(chapterLessons.length + 1)
                            setActiveModal("lesson")
                          }}
                          className="rounded-xl border border-[hsl(var(--border))]/40 text-xs font-semibold px-3 py-1.5 hover:bg-[hsl(var(--muted))]"
                        >
                          <Plus className="mr-1 h-3.5 w-3.5" /> Thêm Bài
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => openEditChapter(chapter)}
                          className="rounded-xl border border-[hsl(var(--border))]/40 p-2 hover:bg-[hsl(var(--muted))]"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDeleteChapter(chapter.id, chapter.title)}
                          className="rounded-xl border border-red-500/20 text-red-500 hover:text-red-600 hover:bg-red-500/10 p-2"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Lessons list under Chapter */}
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: "easeInOut" }}
                          className="border-t border-[hsl(var(--border))]/10 divide-y divide-[hsl(var(--border))]/10"
                        >
                          {isLoadingLessons ? (
                            <div className="flex items-center justify-center py-8">
                              <Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--foreground))]/50" />
                              <span className="ml-2.5 text-xs text-[hsl(var(--muted-foreground))]">Đang tải bài học...</span>
                            </div>
                          ) : chapterLessons.length === 0 ? (
                            <div className="p-8 text-center text-xs text-[hsl(var(--muted-foreground))]">
                              Chưa có bài học nào trong chương này. Hãy click "Thêm Bài" ở trên.
                            </div>
                          ) : (
                            chapterLessons.map((lesson) => {
                              const isLessonExpanded = !!expandedLessons[lesson.id]
                              const lessonMaterials = materials[lesson.id] || []
                              const isLoadingMaterials = !!loadingMaterials[lesson.id]

                              return (
                                <div key={lesson.id} className="bg-transparent pl-4 pr-6 py-4">
                                  {/* Lesson Header */}
                                  <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex items-center gap-2 cursor-pointer select-none min-w-0 flex-1" onClick={() => toggleLesson(lesson.id)}>
                                      {isLessonExpanded ? <ChevronDown className="h-3.5 w-3.5 opacity-60" /> : <ChevronRight className="h-3.5 w-3.5 opacity-60" />}
                                      <div className="min-w-0">
                                        <p className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Bài {lesson.order_index}</p>
                                        <h4 className="font-semibold text-sm text-foreground mt-0.5 truncate">{lesson.title}</h4>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-1.5 self-end sm:self-auto">
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={() => {
                                          setTargetLessonId(lesson.id)
                                          setSectionTitle("")
                                          setSectionOrder((sections[lesson.id]?.length || 0) + 1)
                                          setActiveModal("section")
                                        }}
                                        className="h-8 rounded-lg border border-[hsl(var(--border))]/30 text-[10px] font-bold px-2.5 py-1 hover:bg-[hsl(var(--muted))]"
                                      >
                                        <Plus className="mr-0.5 h-3 w-3" /> Phần
                                      </Button>
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={() => {
                                          setTargetLessonId(lesson.id)
                                          setMaterialTitle("")
                                          setMaterialUrl("")
                                          setMaterialDesc("")
                                          setMaterialType("video")
                                          setActiveModal("material")
                                        }}
                                        className="h-8 rounded-lg border border-[hsl(var(--border))]/30 text-[10px] font-bold px-2.5 py-1 hover:bg-[hsl(var(--muted))]"
                                      >
                                        <Plus className="mr-0.5 h-3 w-3" /> Tài nguyên
                                      </Button>
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        onClick={() => openEditLesson(chapter.id, lesson)}
                                        className="h-8 w-8 rounded-lg border border-[hsl(var(--border))]/30 p-1.5 hover:bg-[hsl(var(--muted))]"
                                      >
                                        <Edit3 className="h-3 w-3" />
                                      </Button>
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        onClick={() => handleDeleteLesson(chapter.id, lesson.id, lesson.title)}
                                        className="h-8 w-8 rounded-lg border border-red-500/10 text-red-500 hover:text-red-600 hover:bg-red-500/5 p-1.5"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>

                                  {/* Materials & Sections under Lesson */}
                                  <AnimatePresence initial={false}>
                                    {isLessonExpanded && (
                                      <motion.div 
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="mt-3 ml-6 pl-4 border-l-2 border-[hsl(var(--border))]/40 space-y-5"
                                      >
                                        {/* Sections list block */}
                                        <div>
                                          <span className="text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] flex items-center gap-1 mb-2">
                                            📂 Các phần bài tập ({sections[lesson.id]?.length || 0})
                                          </span>
                                          {loadingSections[lesson.id] ? (
                                            <div className="flex items-center py-2 pl-2">
                                              <Loader2 className="h-4 w-4 animate-spin text-[hsl(var(--foreground))]/45" />
                                              <span className="ml-2 text-[10px] text-[hsl(var(--muted-foreground))]">Đang tải các phần...</span>
                                            </div>
                                          ) : !sections[lesson.id] || sections[lesson.id].length === 0 ? (
                                            <p className="text-[11px] text-[hsl(var(--muted-foreground))] italic py-1 pl-2">
                                              Chưa có phần học nào. Hãy nhấn "+ Phần" để tạo phân cấp bài tập.
                                            </p>
                                          ) : (
                                            <div className="grid gap-2 sm:grid-cols-2 pl-2">
                                              {sections[lesson.id].map((sec) => (
                                                <div key={sec.id} className="flex items-center justify-between gap-3 rounded-xl border border-[hsl(var(--border))]/40 bg-[hsl(var(--background))]/10 px-4 py-2.5 hover:bg-[hsl(var(--background))]/30 transition-all duration-200">
                                                  <div className="min-w-0">
                                                    <span className="text-[9px] font-bold text-[hsl(var(--muted-foreground))] uppercase mr-1">Phần {sec.order_index}:</span>
                                                    <span className="text-xs font-semibold text-foreground truncate">{sec.title}</span>
                                                  </div>
                                                  <div className="flex items-center gap-1 shrink-0">
                                                    <Button 
                                                      variant="ghost" 
                                                      size="icon" 
                                                      onClick={() => openEditSection(lesson.id, sec)}
                                                      className="h-7 w-7 rounded-lg border border-[hsl(var(--border))]/30 p-1.5 hover:bg-[hsl(var(--muted))]"
                                                    >
                                                      <Edit3 className="h-3 w-3" />
                                                    </Button>
                                                    <Button 
                                                      variant="ghost" 
                                                      size="icon" 
                                                      onClick={() => handleDeleteSection(lesson.id, sec.id, sec.title)}
                                                      className="h-7 w-7 rounded-lg border border-red-500/10 text-red-500 hover:text-red-600 hover:bg-red-500/5 p-1.5"
                                                    >
                                                      <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>

                                        {/* Materials list block */}
                                        <div>
                                          <span className="text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] flex items-center gap-1 mb-2">
                                            🎥 Tài nguyên học tập (Video/PDF)
                                          </span>
                                          {isLoadingMaterials ? (
                                            <div className="flex items-center py-2 pl-2">
                                              <Loader2 className="h-4 w-4 animate-spin text-[hsl(var(--foreground))]/50" />
                                              <span className="ml-2 text-[10px] text-[hsl(var(--muted-foreground))]">Đang tải tài nguyên...</span>
                                            </div>
                                          ) : !lessonMaterials || lessonMaterials.length === 0 ? (
                                            <p className="text-[11px] text-[hsl(var(--muted-foreground))] italic py-1 pl-2">
                                              Không có học liệu/bài giảng nào. Hãy nhấn "+ Tài nguyên" để thêm.
                                            </p>
                                          ) : (
                                            <div className="grid gap-2 sm:grid-cols-2 pl-2">
                                              {lessonMaterials.map((material) => (
                                                <div key={material.id} className="flex items-center justify-between gap-3 rounded-xl border border-[hsl(var(--border))]/40 bg-[hsl(var(--background))]/30 px-4 py-3 hover:bg-[hsl(var(--background))]/60 transition-colors">
                                                  <div className="flex items-center gap-3 min-w-0 flex-1">
                                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--background))] border border-[hsl(var(--border))]/60 text-[hsl(var(--muted-foreground))]">
                                                      {material.type === "video" ? (
                                                        <Video className="h-4 w-4 text-rose-500" />
                                                      ) : (
                                                        <FileText className="h-4 w-4 text-emerald-500" />
                                                      )}
                                                    </div>
                                                    <div className="min-w-0">
                                                      <h5 className="font-semibold text-xs text-foreground truncate">{material.title}</h5>
                                                      <p className="text-[10px] text-[hsl(var(--muted-foreground))] truncate mt-0.5 flex items-center gap-1.5">
                                                        <span>{material.type === "video" ? "Video" : "PDF"}</span>
                                                        {material.description && (
                                                          <>
                                                            <span className="h-1 w-1 rounded-full bg-[hsl(var(--border))]"></span>
                                                            <span className="italic truncate">{material.description}</span>
                                                          </>
                                                        )}
                                                      </p>
                                                    </div>
                                                  </div>

                                                  <div className="flex items-center gap-1.5 shrink-0">
                                                    <a 
                                                      href={material.url} 
                                                      target="_blank" 
                                                      rel="noreferrer" 
                                                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-[hsl(var(--border))]/30 text-[hsl(var(--muted-foreground))] hover:text-foreground hover:bg-[hsl(var(--muted))]"
                                                      title="Xem đường dẫn gốc"
                                                    >
                                                      <ExternalLink className="h-3.5 w-3.5" />
                                                    </a>
                                                    <Button 
                                                      variant="ghost" 
                                                      size="icon" 
                                                      onClick={() => openEditMaterial(lesson.id, material)}
                                                      className="h-7 w-7 rounded-lg border border-[hsl(var(--border))]/30 p-1.5 hover:bg-[hsl(var(--muted))]"
                                                    >
                                                      <Edit3 className="h-3 w-3" />
                                                    </Button>
                                                    <Button 
                                                      variant="ghost" 
                                                      size="icon" 
                                                      onClick={() => handleDeleteMaterial(lesson.id, material.id, material.title)}
                                                      className="h-7 w-7 rounded-lg border border-red-500/10 text-red-500 hover:text-red-600 hover:bg-red-500/5 p-1.5"
                                                    >
                                                      <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              )
                            })
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>

      {/* Chapter Modal */}
      {activeModal === "chapter" && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[hsl(var(--border))]/30 pb-4">
              <h3 className="text-lg font-bold tracking-tight">{editingItem ? "Sửa chương học" : "Tạo chương học mới"}</h3>
              <button onClick={closeModal} className="text-[hsl(var(--muted-foreground))] hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleChapterSubmit} className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="ch-title" className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Tên chương học</Label>
                <Input 
                  id="ch-title" 
                  value={chapterTitle} 
                  onChange={(e) => setChapterTitle(e.target.value)} 
                  placeholder="VD: Chương 1: Dao động cơ" 
                  required 
                  className="rounded-xl border-[hsl(var(--border))]/60 bg-[hsl(var(--background))]/50 focus:bg-[hsl(var(--background))]"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ch-order" className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Số thứ tự sắp xếp</Label>
                <Input 
                  id="ch-order" 
                  type="number" 
                  value={chapterOrder} 
                  onChange={(e) => setChapterOrder(Number(e.target.value))} 
                  required 
                  className="rounded-xl border-[hsl(var(--border))]/60 bg-[hsl(var(--background))]/50 focus:bg-[hsl(var(--background))]"
                />
              </div>
              
              {error && <p className="text-xs text-red-500">{error}</p>}
              
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={closeModal} className="rounded-full">Hủy</Button>
                <Button type="submit" disabled={submitting} className="rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:bg-[hsl(var(--foreground))]/90">
                  {submitting ? "Đang xử lý..." : "Lưu"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lesson Modal */}
      {activeModal === "lesson" && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[hsl(var(--border))]/30 pb-4">
              <h3 className="text-lg font-bold tracking-tight">{editingItem ? "Sửa bài học" : "Thêm bài học mới"}</h3>
              <button onClick={closeModal} className="text-[hsl(var(--muted-foreground))] hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleLessonSubmit} className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="les-title" className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Tên bài học</Label>
                <Input 
                  id="les-title" 
                  value={lessonTitle} 
                  onChange={(e) => setLessonTitle(e.target.value)} 
                  placeholder="VD: Bài 1: Dao động điều hòa" 
                  required 
                  className="rounded-xl border-[hsl(var(--border))]/60 bg-[hsl(var(--background))]/50 focus:bg-[hsl(var(--background))]"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="les-order" className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Số thứ tự sắp xếp</Label>
                <Input 
                  id="les-order" 
                  type="number" 
                  value={lessonOrder} 
                  onChange={(e) => setLessonOrder(Number(e.target.value))} 
                  required 
                  className="rounded-xl border-[hsl(var(--border))]/60 bg-[hsl(var(--background))]/50 focus:bg-[hsl(var(--background))]"
                />
              </div>
              
              {error && <p className="text-xs text-red-500">{error}</p>}
              
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={closeModal} className="rounded-full">Hủy</Button>
                <Button type="submit" disabled={submitting} className="rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:bg-[hsl(var(--foreground))]/90">
                  {submitting ? "Đang xử lý..." : "Lưu"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Section Modal */}
      {activeModal === "section" && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[hsl(var(--border))]/30 pb-4">
              <h3 className="text-lg font-bold tracking-tight">{editingItem ? "Sửa phần bài tập" : "Thêm phần bài tập mới"}</h3>
              <button onClick={closeModal} className="text-[hsl(var(--muted-foreground))] hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSectionSubmit} className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="sec-title" className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Tên phần bài tập</Label>
                <Input 
                  id="sec-title" 
                  value={sectionTitle} 
                  onChange={(e) => setSectionTitle(e.target.value)} 
                  placeholder="VD: Phần 1: Các bài tập cơ bản" 
                  required 
                  className="rounded-xl border-[hsl(var(--border))]/60 bg-[hsl(var(--background))]/50 focus:bg-[hsl(var(--background))]"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sec-order" className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Số thứ tự sắp xếp</Label>
                <Input 
                  id="sec-order" 
                  type="number" 
                  value={sectionOrder} 
                  onChange={(e) => setSectionOrder(Number(e.target.value))} 
                  required 
                  className="rounded-xl border-[hsl(var(--border))]/60 bg-[hsl(var(--background))]/50 focus:bg-[hsl(var(--background))]"
                />
              </div>
              
              {error && <p className="text-xs text-red-500">{error}</p>}
              
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={closeModal} className="rounded-full">Hủy</Button>
                <Button type="submit" disabled={submitting} className="rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:bg-[hsl(var(--foreground))]/90">
                  {submitting ? "Đang xử lý..." : "Lưu"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Material Modal */}
      {activeModal === "material" && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[hsl(var(--border))]/30 pb-4">
              <h3 className="text-lg font-bold tracking-tight">{editingItem ? "Sửa tài nguyên" : "Thêm tài nguyên mới"}</h3>
              <button onClick={closeModal} className="text-[hsl(var(--muted-foreground))] hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleMaterialSubmit} className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="mat-title" className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Tiêu đề học liệu</Label>
                <Input 
                  id="mat-title" 
                  value={materialTitle} 
                  onChange={(e) => setMaterialTitle(e.target.value)} 
                  placeholder="VD: Bài giảng lý thuyết Dao Động Điều Hòa" 
                  required 
                  className="rounded-xl border-[hsl(var(--border))]/60 bg-[hsl(var(--background))]/50 focus:bg-[hsl(var(--background))]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Loại tài nguyên</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMaterialType("video")}
                    className={`rounded-xl border py-2.5 text-xs font-bold transition-all ${
                      materialType === "video"
                        ? "bg-[hsl(var(--foreground))] text-[hsl(var(--background))] border-transparent"
                        : "border-[hsl(var(--border))]/60 text-[hsl(var(--muted-foreground))]"
                    }`}
                  >
                    <Video className="inline-block mr-1 h-3.5 w-3.5" /> Video bài giảng
                  </button>
                  <button
                    type="button"
                    onClick={() => setMaterialType("document")}
                    className={`rounded-xl border py-2.5 text-xs font-bold transition-all ${
                      materialType === "document"
                        ? "bg-[hsl(var(--foreground))] text-[hsl(var(--background))] border-transparent"
                        : "border-[hsl(var(--border))]/60 text-[hsl(var(--muted-foreground))]"
                    }`}
                  >
                    <FileText className="inline-block mr-1 h-3.5 w-3.5" /> Tài liệu tự học
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mat-url" className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                  {materialType === "video" ? "Đường dẫn YouTube" : "Đường dẫn file PDF / Tài liệu"}
                </Label>
                <Input 
                  id="mat-url" 
                  value={materialUrl} 
                  onChange={(e) => setMaterialUrl(e.target.value)} 
                  placeholder={materialType === "video" ? "VD: https://www.youtube.com/watch?v=..." : "VD: Link PDF trên storage..."} 
                  required 
                  className="rounded-xl border-[hsl(var(--border))]/60 bg-[hsl(var(--background))]/50 focus:bg-[hsl(var(--background))]"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mat-desc" className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Mô tả ngắn (tùy chọn)</Label>
                <Input 
                  id="mat-desc" 
                  value={materialDesc} 
                  onChange={(e) => setMaterialDesc(e.target.value)} 
                  placeholder="VD: Đọc trước phần này trước khi làm bài tập" 
                  className="rounded-xl border-[hsl(var(--border))]/60 bg-[hsl(var(--background))]/50 focus:bg-[hsl(var(--background))]"
                />
              </div>
              
              {error && <p className="text-xs text-red-500">{error}</p>}
              
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={closeModal} className="rounded-full">Hủy</Button>
                <Button type="submit" disabled={submitting} className="rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:bg-[hsl(var(--foreground))]/90">
                  {submitting ? "Đang xử lý..." : "Lưu"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <TeacherBottomNav />
      
      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={executeDelete}
        title={`Xóa ${
          deleteTarget?.type === "chapter" ? "chương" :
          deleteTarget?.type === "lesson" ? "bài học" :
          deleteTarget?.type === "section" ? "phần học" : "học liệu"
        }?`}
        description={
          deleteTarget?.type === "chapter"
            ? `Bạn chắc chắn muốn xóa chương "${deleteTarget?.title}"? Tất cả bài học và tài liệu con bên trong sẽ bị xóa hoàn toàn và không thể khôi phục.`
            : `Bạn chắc chắn muốn xóa ${
                deleteTarget?.type === "lesson" ? "bài học" :
                deleteTarget?.type === "section" ? "phần học" : "học liệu"
              } "${deleteTarget?.title}"?`
        }
        confirmText="Xóa vĩnh viễn"
        cancelText="Hủy"
        variant="danger"
      />
    </TeacherShell>
  )
}
