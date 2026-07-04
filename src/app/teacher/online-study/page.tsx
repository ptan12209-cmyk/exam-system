"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TeacherShell } from "@/components/teacher/TeacherShell"
import { NotificationBell } from "@/components/NotificationBell"
import { UserMenu } from "@/components/UserMenu"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useToast } from "@/components/ui/toast"
import { ONLINE_SUBJECTS, getOnlineSubjectInfo } from "@/lib/subjects"
import { AnimatePresence, motion } from "framer-motion"
import { 
  Plus, 
  Folder,
  FolderOpen, 
  FolderPlus, 
  FilePlus2, 
  Trash2, 
  Edit3, 
  PlayCircle, 
  FileText, 
  Loader2, 
  ChevronDown, 
  ChevronRight, 
  BookOpen,
  X,
  PlusCircle,
  Video
} from "lucide-react"

interface DbFolder {
  id: string
  name: string
  parent_id: string | null
  subject: string
  order_index: number
}

interface DbLesson {
  id: string
  folder_id: string
  title: string
  description: string | null
  video_url: string | null
  document_url: string | null
  order_index: number
}

interface TreeNode {
  folder: DbFolder
  children: TreeNode[]
  lessons: DbLesson[]
}

export default function TeacherOnlineStudyPage() {
  const router = useRouter()
  const supabase = createClient()
  const { success, error: toastError } = useToast()

  // Auth & Profile
  const [profile, setProfile] = useState<{ full_name: string | null } | null>(null)
  
  // Selection States
  const [selectedSubject, setSelectedSubject] = useState("toan")
  const subjectInfo = getOnlineSubjectInfo(selectedSubject)

  // Data States
  const [folders, setFolders] = useState<DbFolder[]>([])
  const [lessons, setLessons] = useState<DbLesson[]>([])
  const [loadingData, setLoadingData] = useState(false)

  // Collapsed States for Folder tree
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({})

  // Modals & Submitting
  const [activeModal, setActiveModal] = useState<"folder" | "lesson" | null>(null)
  const [editingItem, setEditingItem] = useState<{ type: "folder" | "lesson"; id: string } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ type: "folder" | "lesson"; id: string; title: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Folder Form Values
  const [folderName, setFolderName] = useState("")
  const [folderParentId, setFolderParentId] = useState<string | null>(null)
  const [folderOrder, setFolderOrder] = useState(1)

  // Lesson Form Values
  const [lessonTitle, setLessonTitle] = useState("")
  const [lessonDesc, setLessonDesc] = useState("")
  const [lessonVideoUrl, setLessonVideoUrl] = useState("")
  const [lessonDocUrl, setLessonDocUrl] = useState("")
  const [lessonOrder, setLessonOrder] = useState(1)
  const [targetFolderId, setTargetFolderId] = useState("")

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

  // Fetch Folders and Lessons
  const fetchData = async () => {
    setLoadingData(true)
    try {
      // Fetch folders
      const resFolders = await fetch(`/api/online-study/folders?subject=${subjectInfo.dbValue}`)
      const dataFolders = await resFolders.json()
      
      // Fetch all lessons for this subject
      const resLessons = await fetch(`/api/online-study/lessons?subject=${subjectInfo.dbValue}`)
      const dataLessons = await resLessons.json()

      if (resFolders.ok && dataFolders.success) {
        setFolders(dataFolders.data || [])
      }
      if (resLessons.ok && dataLessons.success) {
        setLessons(dataLessons.data || [])
      }
    } catch (err) {
      console.error(err)
      toastError("Lỗi kết nối tải dữ liệu.")
    } finally {
      setLoadingData(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [selectedSubject])

  // Build Folder Tree
  const treeRoots = useMemo(() => {
    const folderMap = new Map<string, TreeNode>()
    const roots: TreeNode[] = []

    folders.forEach(f => {
      folderMap.set(f.id, { folder: f, children: [], lessons: [] })
    })

    lessons.forEach(l => {
      const node = folderMap.get(l.folder_id)
      if (node) {
        node.lessons.push(l)
      }
    })

    folderMap.forEach(node => {
      node.lessons.sort((a, b) => a.order_index - b.order_index)
    })

    folders.forEach(f => {
      const node = folderMap.get(f.id)!
      if (f.parent_id) {
        const parentNode = folderMap.get(f.parent_id)
        if (parentNode) {
          parentNode.children.push(node)
        } else {
          roots.push(node)
        }
      } else {
        roots.push(node)
      }
    })

    folderMap.forEach(node => {
      node.children.sort((a, b) => a.folder.order_index - b.folder.order_index)
    })

    roots.sort((a, b) => a.folder.order_index - b.folder.order_index)
    return roots
  }, [folders, lessons])

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => ({ ...prev, [folderId]: !prev[folderId] }))
  }

  // Handle Folder Submit
  const handleFolderSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!folderName.trim()) return
    setSubmitting(true)
    setFormError(null)

    try {
      const body = {
        id: editingItem?.type === "folder" ? editingItem.id : undefined,
        name: folderName.trim(),
        parent_id: folderParentId,
        subject: subjectInfo.dbValue,
        order_index: Number(folderOrder)
      }

      const res = await fetch("/api/online-study/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Lỗi xử lý thư mục")

      success(editingItem ? "Cập nhật thư mục thành công!" : "Tạo thư mục thành công!")
      await fetchData()
      closeModal()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Có lỗi xảy ra")
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Lesson Submit
  const handleLessonSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!lessonTitle.trim()) return
    setSubmitting(true)
    setFormError(null)

    try {
      const body = {
        id: editingItem?.type === "lesson" ? editingItem.id : undefined,
        folder_id: targetFolderId,
        title: lessonTitle.trim(),
        description: lessonDesc.trim() || null,
        video_url: lessonVideoUrl.trim() || null,
        document_url: lessonDocUrl.trim() || null,
        order_index: Number(lessonOrder)
      }

      const res = await fetch("/api/online-study/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Lỗi xử lý bài giảng")

      success(editingItem ? "Cập nhật bài giảng thành công!" : "Thêm bài giảng thành công!")
      await fetchData()
      setExpandedFolders(prev => ({ ...prev, [targetFolderId]: true }))
      closeModal()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Có lỗi xảy ra")
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Delete execution
  const executeDelete = async () => {
    if (!deleteTarget) return
    const { type, id } = deleteTarget
    try {
      const endpoint = type === "folder" ? "folders" : "lessons"
      const res = await fetch(`/api/online-study/${endpoint}?id=${id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Không thể xóa đối tượng")
      }
      success("Xóa đối tượng thành công!")
      await fetchData()
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Lỗi xảy ra")
    }
  }

  // Open Edit Forms
  const openEditFolder = (folder: DbFolder) => {
    setEditingItem({ type: "folder", id: folder.id })
    setFolderName(folder.name)
    setFolderParentId(folder.parent_id)
    setFolderOrder(folder.order_index)
    setActiveModal("folder")
  }

  const openEditLesson = (lesson: DbLesson) => {
    setTargetFolderId(lesson.folder_id)
    setEditingItem({ type: "lesson", id: lesson.id })
    setLessonTitle(lesson.title)
    setLessonDesc(lesson.description || "")
    setLessonVideoUrl(lesson.video_url || "")
    setLessonDocUrl(lesson.document_url || "")
    setLessonOrder(lesson.order_index)
    setActiveModal("lesson")
  }

  const closeModal = () => {
    setActiveModal(null)
    setEditingItem(null)
    setFolderParentId(null)
    setFolderName("")
    setFolderOrder(1)
    
    setTargetFolderId("")
    setLessonTitle("")
    setLessonDesc("")
    setLessonVideoUrl("")
    setLessonDocUrl("")
    setLessonOrder(1)
    setFormError(null)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  // Recursive folder tree component for management
  const ManagedFolderNode = ({ node, level = 0 }: { node: TreeNode; level: number }) => {
    const isExpanded = !!expandedFolders[node.folder.id]
    const hasChildren = node.children.length > 0 || node.lessons.length > 0

    return (
      <div className="space-y-1">
        {/* Folder row */}
        <div 
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          className="flex flex-col gap-3 py-3 px-4 rounded-xl border border-[#8C87A2]/10 bg-[#15131F]/30 sm:flex-row sm:items-center sm:justify-between hover:bg-[#15131F]/60 transition-colors"
        >
          <div 
            onClick={() => toggleFolder(node.folder.id)}
            className="flex items-center gap-2 cursor-pointer select-none min-w-0 flex-1"
          >
            <span className="text-[#8C87A2] shrink-0">
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </span>
            <span className="text-[#C18CFF] shrink-0">
              {isExpanded ? <FolderOpen className="h-4 w-4" /> : <Folder className="h-4 w-4" />}
            </span>
            <div className="min-w-0">
              <span className="text-[9px] font-bold text-[#8C87A2] uppercase tracking-wider font-mono">
                Order: {node.folder.order_index}
              </span>
              <h4 className="font-bold text-sm text-[#F1EDF9] truncate mt-0.5">{node.folder.name}</h4>
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
            {/* Add folder sub */}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                setFolderName("")
                setFolderParentId(node.folder.id)
                setFolderOrder(node.children.length + 1)
                setActiveModal("folder")
              }}
              className="h-8 rounded-lg border border-[#8C87A2]/30 text-[10px] font-bold px-2 py-1 hover:bg-[#0B0A13]/40"
            >
              <FolderPlus className="mr-0.5 h-3 w-3 text-[#C18CFF]" /> Thư mục
            </Button>
            {/* Add lesson */}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                setTargetFolderId(node.folder.id)
                setLessonTitle("")
                setLessonDesc("")
                setLessonVideoUrl("")
                setLessonDocUrl("")
                setLessonOrder(node.lessons.length + 1)
                setActiveModal("lesson")
              }}
              className="h-8 rounded-lg border border-[#8C87A2]/30 text-[10px] font-bold px-2 py-1 hover:bg-[#0B0A13]/40"
            >
              <FilePlus2 className="mr-0.5 h-3 w-3 text-[#C18CFF]" /> Bài học
            </Button>
            {/* Edit folder */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => openEditFolder(node.folder)}
              className="h-8 w-8 rounded-lg border border-[#8C87A2]/30 p-1.5 hover:bg-[#0B0A13]/40"
            >
              <Edit3 className="h-3 w-3" />
            </Button>
            {/* Delete folder */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setDeleteTarget({ type: "folder", id: node.folder.id, title: node.folder.name })}
              className="h-8 w-8 rounded-lg border border-red-500/10 text-red-500 hover:text-red-600 hover:bg-red-500/5 p-1.5"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Children render */}
        {isExpanded && hasChildren && (
          <div className="space-y-1.5 mt-1 border-l border-[#8C87A2]/20 pl-2 ml-4">
            {/* Subfolders */}
            {node.children.map(child => (
              <ManagedFolderNode key={child.folder.id} node={child} level={level + 1} />
            ))}

            {/* Lessons list */}
            {node.lessons.map(lesson => (
              <div
                key={lesson.id}
                style={{ paddingLeft: `${(level + 1) * 16 + 12}px` }}
                className="flex flex-col gap-2 py-2.5 px-3 rounded-lg border border-[#8C87A2]/5 bg-[#0B0A13]/30 sm:flex-row sm:items-center sm:justify-between hover:bg-[#0B0A13]/55 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <PlayCircle className="h-4 w-4 text-[#8C87A2] shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[9px] font-semibold text-[#8C87A2] uppercase tracking-wider font-mono">
                      Bài {lesson.order_index}
                    </span>
                    <h5 className="font-semibold text-xs text-[#F1EDF9] truncate mt-0.5">{lesson.title}</h5>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => openEditLesson(lesson)}
                    className="h-7 w-7 rounded-lg border border-[#8C87A2]/30 p-1.5 hover:bg-[#0B0A13]/40"
                  >
                    <Edit3 className="h-2.5 w-2.5" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setDeleteTarget({ type: "lesson", id: lesson.id, title: lesson.title })}
                    className="h-7 w-7 rounded-lg border border-red-500/10 text-red-500 hover:text-red-600 hover:bg-red-500/5 p-1.5"
                  >
                    <Trash2 className="h-2.5 w-2.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <TeacherShell onLogout={handleLogout}>
      <header className="fixed top-0 z-50 flex h-16 w-full items-center justify-between border-b border-[#8C87A2]/20 bg-[#0B0A13]/85 px-4 backdrop-blur-xl lg:hidden safe-top">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-[#C18CFF]" />
          <span className="text-lg font-bold tracking-tight">Học Online</span>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <UserMenu userName={profile?.full_name || ""} role="teacher" onLogout={handleLogout} />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-24 pt-24 md:px-6 lg:pt-28">
        
        {/* Header Section */}
        <section className="mb-10 grid gap-6 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#8C87A2]/40 px-4 py-2 text-xs font-semibold text-[#8C87A2] uppercase tracking-widest font-mono">
              <GraduationCap className="h-4 w-4 text-[#C18CFF]" /> E-learning portal database
            </div>
            <h1 className="max-w-4xl text-5xl font-normal tracking-[-2px] md:text-7xl lg:text-8xl font-serif-italic">
              Quản trị Học Online
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-[1.7] text-[#8C87A2]">
              Xây dựng cây thư mục bài giảng môn học linh hoạt. Học liệu hỗ trợ trực tiếp dán link video và tài liệu lưu trữ từ <strong className="text-[#C18CFF]">Bunny.net</strong> hoặc YouTube.
            </p>
          </div>

          <div className="rounded-2xl p-6 border border-[#8C87A2]/20 bg-[#15131F]">
            <h3 className="text-xs font-bold uppercase text-[#8C87A2] tracking-wider font-mono">Quản lý nhanh</h3>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] text-[#8C87A2] font-mono">Tổng số thư mục</p>
                <p className="text-3xl font-bold tracking-tight mt-1">{folders.length}</p>
              </div>
              <Button 
                onClick={() => {
                  setFolderName("")
                  setFolderParentId(null)
                  setFolderOrder(folders.filter(f => !f.parent_id).length + 1)
                  setActiveModal("folder")
                }}
                className="w-full rounded-xl bg-[#C18CFF] text-[#0B0A13] hover:bg-[#C18CFF]/90 h-full py-4 text-xs font-bold transition-transform active:scale-95"
              >
                <FolderPlus className="mr-1.5 h-4 w-4" /> Tạo Thư Mục Gốc
              </Button>
            </div>
          </div>
        </section>

        {/* Filter Toolbar */}
        <div className="mb-8 flex flex-col gap-4 rounded-2xl border border-[#8C87A2]/20 bg-[#15131F]/30 p-5 md:flex-row md:items-center">
          <div className="flex-1 space-y-1.5">
            <Label className="text-xs font-bold uppercase text-[#8C87A2] tracking-wider font-mono">Chọn môn học</Label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full rounded-xl border border-[#8C87A2]/20 bg-[#0B0A13] px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#C18CFF] text-[#F1EDF9]"
            >
              {ONLINE_SUBJECTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.icon} {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Folder & Lesson tree */}
        <div className="space-y-4">
          {loadingData ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-[#C18CFF]" />
              <p className="mt-3 text-sm text-[#8C87A2]">Đang tải cấu trúc bài giảng môn {subjectInfo.label}...</p>
            </div>
          ) : folders.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-[#8C87A2]/30 bg-[#15131F]/20 p-16 text-center">
              <FolderOpen className="mx-auto h-16 w-16 text-[#8C87A2]/30" strokeWidth={1} />
              <h3 className="mt-4 text-xl font-bold">Chưa có bài học nào</h3>
              <p className="mt-2 text-sm text-[#8C87A2] max-w-sm mx-auto">
                Bắt đầu xây dựng giáo trình học online bằng cách tạo thư mục gốc đầu tiên cho môn này.
              </p>
              <Button 
                onClick={() => {
                  setFolderName("")
                  setFolderParentId(null)
                  setFolderOrder(1)
                  setActiveModal("folder")
                }}
                className="mt-6 rounded-xl bg-[#C18CFF] text-[#0B0A13] hover:bg-[#C18CFF]/90 font-bold px-6 transition-transform active:scale-95"
              >
                <Plus className="mr-1.5 h-4 w-4" /> Tạo thư mục mới
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {treeRoots.map(root => (
                <ManagedFolderNode key={root.folder.id} node={root} level={0} />
              ))}
            </div>
          )}
        </div>

      </main>

      {/* ── Folder Modal ── */}
      <AnimatePresence>
        {activeModal === "folder" && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#0B0A13]/80 backdrop-blur-sm"
              onClick={closeModal}
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md rounded-2xl border border-[#8C87A2]/20 bg-[#15131F] p-6 shadow-2xl z-10"
            >
              <button onClick={closeModal} className="absolute right-4 top-4 text-[#8C87A2] hover:text-[#F1EDF9]">
                <X className="h-5 w-5" />
              </button>
              
              <h3 className="text-xl font-bold text-[#F1EDF9] mb-4">
                {editingItem ? "Sửa Thư Mục" : folderParentId ? "Thêm Thư Mục Con" : "Tạo Thư Mục Gốc"}
              </h3>

              <form onSubmit={handleFolderSubmit} className="space-y-4">
                <div>
                  <Label className="text-xs text-[#8C87A2] font-mono">Tên thư mục</Label>
                  <Input 
                    value={folderName}
                    onChange={(e) => setFolderName(e.target.value)}
                    placeholder="VD: Chương 1: Đạo hàm"
                    className="mt-1 bg-[#0B0A13] border-[#8C87A2]/25 focus:ring-[#C18CFF] text-[#F1EDF9]"
                    required
                  />
                </div>

                <div>
                  <Label className="text-xs text-[#8C87A2] font-mono">Thứ tự sắp xếp (Order Index)</Label>
                  <Input 
                    type="number"
                    value={folderOrder}
                    onChange={(e) => setFolderOrder(Number(e.target.value))}
                    className="mt-1 bg-[#0B0A13] border-[#8C87A2]/25 focus:ring-[#C18CFF] text-[#F1EDF9]"
                    min={1}
                    required
                  />
                </div>

                {formError && <p className="text-xs text-red-500 mt-2">{formError}</p>}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button type="button" variant="ghost" onClick={closeModal} className="rounded-lg border border-[#8C87A2]/20 text-[#8C87A2]">
                    Hủy
                  </Button>
                  <Button type="submit" disabled={submitting} className="rounded-lg bg-[#C18CFF] text-[#0B0A13] hover:bg-[#C18CFF]/90 font-bold px-6">
                    {submitting ? "Đang xử lý..." : editingItem ? "Lưu thay đổi" : "Tạo thư mục"}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Lesson Modal ── */}
      <AnimatePresence>
        {activeModal === "lesson" && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#0B0A13]/80 backdrop-blur-sm"
              onClick={closeModal}
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg rounded-2xl border border-[#8C87A2]/20 bg-[#15131F] p-6 shadow-2xl z-10"
            >
              <button onClick={closeModal} className="absolute right-4 top-4 text-[#8C87A2] hover:text-[#F1EDF9]">
                <X className="h-5 w-5" />
              </button>
              
              <h3 className="text-xl font-bold text-[#F1EDF9] mb-4">
                {editingItem ? "Chỉnh sửa bài giảng" : "Thêm bài giảng mới"}
              </h3>

              <form onSubmit={handleLessonSubmit} className="space-y-4">
                <div>
                  <Label className="text-xs text-[#8C87A2] font-mono">Tiêu đề bài giảng</Label>
                  <Input 
                    value={lessonTitle}
                    onChange={(e) => setLessonTitle(e.target.value)}
                    placeholder="VD: Bài 1: Lý thuyết đạo hàm căn bản"
                    className="mt-1 bg-[#0B0A13] border-[#8C87A2]/25 focus:ring-[#C18CFF] text-[#F1EDF9]"
                    required
                  />
                </div>

                <div>
                  <Label className="text-xs text-[#8C87A2] font-mono">Mô tả bài giảng (Không bắt buộc)</Label>
                  <textarea 
                    value={lessonDesc}
                    onChange={(e) => setLessonDesc(e.target.value)}
                    placeholder="Nhập nội dung mô tả, yêu cầu tự học của bài giảng..."
                    rows={3}
                    className="w-full rounded-lg border border-[#8C87A2]/25 bg-[#0B0A13] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#C18CFF] text-[#F1EDF9] mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs text-[#8C87A2] font-mono">Đường dẫn Video bài giảng (Bunny.net hoặc YouTube)</Label>
                  <Input 
                    value={lessonVideoUrl}
                    onChange={(e) => setLessonVideoUrl(e.target.value)}
                    placeholder="VD: https://iframe.mediadelivery.net/embed/... hoặc YouTube Link"
                    className="mt-1 bg-[#0B0A13] border-[#8C87A2]/25 focus:ring-[#C18CFF] text-[#F1EDF9]"
                  />
                  <p className="text-[10px] text-[#8C87A2] mt-1 italic">Hỗ trợ các link video stream MP4, HLS (m3u8), YouTube, Bunny.net embed.</p>
                </div>

                <div>
                  <Label className="text-xs text-[#8C87A2] font-mono">Đường dẫn Tài liệu bài giảng (Bunny.net PDF / Files)</Label>
                  <Input 
                    value={lessonDocUrl}
                    onChange={(e) => setLessonDocUrl(e.target.value)}
                    placeholder="VD: https://mydomain.bunny.storage/files/doc.pdf"
                    className="mt-1 bg-[#0B0A13] border-[#8C87A2]/25 focus:ring-[#C18CFF] text-[#F1EDF9]"
                  />
                  <p className="text-[10px] text-[#8C87A2] mt-1 italic">Dán link tài liệu học tập của bài được lưu trữ trên Bunny.net.</p>
                </div>

                <div>
                  <Label className="text-xs text-[#8C87A2] font-mono">Thứ tự bài học (Order Index)</Label>
                  <Input 
                    type="number"
                    value={lessonOrder}
                    onChange={(e) => setLessonOrder(Number(e.target.value))}
                    className="mt-1 bg-[#0B0A13] border-[#8C87A2]/25 focus:ring-[#C18CFF] text-[#F1EDF9]"
                    min={1}
                    required
                  />
                </div>

                {formError && <p className="text-xs text-red-500 mt-2">{formError}</p>}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button type="button" variant="ghost" onClick={closeModal} className="rounded-lg border border-[#8C87A2]/20 text-[#8C87A2]">
                    Hủy
                  </Button>
                  <Button type="submit" disabled={submitting} className="rounded-lg bg-[#C18CFF] text-[#0B0A13] hover:bg-[#C18CFF]/90 font-bold px-6">
                    {submitting ? "Đang xử lý..." : editingItem ? "Lưu thay đổi" : "Thêm bài học"}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Confirm Delete Dialog ── */}
      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={executeDelete}
        title="Xác nhận xóa đối tượng"
        description={`Bạn có chắc chắn muốn xóa ${deleteTarget?.type === "folder" ? "thư mục" : "bài giảng"}: "${deleteTarget?.title}"? Hành động này sẽ không thể khôi phục và sẽ xóa toàn bộ nội dung con liên quan.`}
        confirmText="Xác nhận xóa"
        cancelText="Hủy bỏ"
      />
    </TeacherShell>
  )
}
