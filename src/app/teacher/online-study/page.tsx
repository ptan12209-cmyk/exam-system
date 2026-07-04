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
  Folder as FolderIcon,
  FolderOpen as FolderOpenIcon, 
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
  Video,
  GraduationCap,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserX,
  ChevronLeft,
  LayoutGrid,
  List,
  Home,
  Sliders
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

interface FolderTreeNode {
  folder: DbFolder
  children: FolderTreeNode[]
}

interface StudentProfile {
  id: string
  full_name: string | null
  email: string | null
  role: string
  class: string | null
  online_subjects: string[]
}

export default function TeacherOnlineStudyPage() {
  const router = useRouter()
  const supabase = createClient()
  const { success, error: toastError } = useToast()

  // Auth & Profile
  const [profile, setProfile] = useState<{ full_name: string | null } | null>(null)
  
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<"lectures" | "permissions">("lectures")

  // Selection States
  const [selectedSubject, setSelectedSubject] = useState("toan")
  const subjectInfo = getOnlineSubjectInfo(selectedSubject)

  // File Explorer Navigation States
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null) // null means Root
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({})
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

  // Data States (Lectures)
  const [folders, setFolders] = useState<DbFolder[]>([])
  const [lessons, setLessons] = useState<DbLesson[]>([])
  const [loadingData, setLoadingData] = useState(false)
  const [explorerSearch, setExplorerSearch] = useState("")

  // Data States (Student Permissions)
  const [students, setStudents] = useState<StudentProfile[]>([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [searchStudentQuery, setSearchStudentQuery] = useState("")
  
  // Student Permission Modal Selection State
  const [selectedStudentForPermission, setSelectedStudentForPermission] = useState<StudentProfile | null>(null)
  const [tempSelectedSubjects, setTempSelectedSubjects] = useState<string[]>([]) // array of values or ['all']

  // Modals & Submitting
  const [activeModal, setActiveModal] = useState<"folder" | "lesson" | "permissions" | null>(null)
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

  // Check auth
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
      const resFolders = await fetch(`/api/online-study/folders?subject=${subjectInfo.dbValue}`)
      const dataFolders = await resFolders.json()
      
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
    } fill-level: 50%
    setLoadingData(false)
  }

  // Fetch Student List for permissions
  const fetchStudents = async (query = "") => {
    setLoadingStudents(true)
    try {
      const res = await fetch(`/api/online-study/assign-role?search=${encodeURIComponent(query)}`)
      const data = await res.json()
      if (res.ok && data.success) {
        setStudents(data.data || [])
      }
    } catch (err) {
      console.error(err)
      toastError("Không thể tải danh sách học sinh.")
    } finally {
      setLoadingStudents(false)
    }
  }

  useEffect(() => {
    if (activeTab === "lectures") {
      fetchData()
      setSelectedFolderId(null)
    } else {
      fetchStudents(searchStudentQuery)
    }
  }, [selectedSubject, activeTab])

  // Build Left Folder Tree
  const folderTree = useMemo(() => {
    const map = new Map<string, FolderTreeNode>()
    const roots: FolderTreeNode[] = []

    folders.forEach(f => {
      map.set(f.id, { folder: f, children: [] })
    })

    folders.forEach(f => {
      const node = map.get(f.id)!
      if (f.parent_id) {
        const parentNode = map.get(f.parent_id)
        if (parentNode) {
          parentNode.children.push(node)
        } else {
          roots.push(node)
        }
      } else {
        roots.push(node)
      }
    })

    map.forEach(node => {
      node.children.sort((a, b) => a.folder.order_index - b.folder.order_index)
    })

    roots.sort((a, b) => a.folder.order_index - b.folder.order_index)
    return roots
  }, [folders])

  // Breadcrumbs Generator
  const breadcrumbs = useMemo(() => {
    if (!selectedFolderId) return []
    const path: DbFolder[] = []
    let currentId: string | null = selectedFolderId
    while (currentId) {
      const folder = folders.find(f => f.id === currentId)
      if (folder) {
        path.unshift(folder)
        currentId = folder.parent_id
      } else {
        break
      }
    }
    return path
  }, [selectedFolderId, folders])

  // Current folder's children and lessons
  const currentSubFolders = useMemo(() => {
    const filtered = folders.filter(f => f.parent_id === selectedFolderId)
    if (explorerSearch.trim()) {
      return filtered.filter(f => f.name.toLowerCase().includes(explorerSearch.toLowerCase()))
    }
    return filtered.sort((a, b) => a.order_index - b.order_index)
  }, [folders, selectedFolderId, explorerSearch])

  const currentLessons = useMemo(() => {
    const filtered = lessons.filter(l => l.folder_id === selectedFolderId)
    if (explorerSearch.trim()) {
      return filtered.filter(l => l.title.toLowerCase().includes(explorerSearch.toLowerCase()))
    }
    return filtered.sort((a, b) => a.order_index - b.order_index)
  }, [lessons, selectedFolderId, explorerSearch])

  const toggleFolderExpand = (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation()
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

  // Handle Permissions Submit (Save selected subjects for student)
  const handlePermissionsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStudentForPermission) return
    setSubmitting(true)
    setFormError(null)

    try {
      const res = await fetch("/api/online-study/assign-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: selectedStudentForPermission.id,
          subjects: tempSelectedSubjects
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Lỗi cập nhật quyền")

      success("Đã cập nhật quyền môn học online thành công!")
      
      // Update local state list
      setStudents(prev => prev.map(s => 
        s.id === selectedStudentForPermission.id 
          ? { ...s, online_subjects: tempSelectedSubjects, role: tempSelectedSubjects.length > 0 ? "online_student" : "student" } 
          : s
      ))
      closeModal()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Lỗi xử lý đổi quyền")
    } finally {
      setSubmitting(false)
    }
  }

  const handleStudentSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    fetchStudents(searchStudentQuery)
  }

  // Toggle single subject check
  const handleToggleSubjectCheckbox = (value: string) => {
    if (value === "all") {
      if (tempSelectedSubjects.includes("all")) {
        setTempSelectedSubjects([])
      } else {
        setTempSelectedSubjects(["all"])
      }
      return
    }

    // If "all" was selected and now we select a specific subject, remove "all" and add this subject
    let nextList = tempSelectedSubjects.filter(s => s !== "all")
    if (nextList.includes(value)) {
      nextList = nextList.filter(s => s !== value)
    } else {
      nextList.push(value)
    }
    setTempSelectedSubjects(nextList)
  }

  // Quick Select All subjects
  const handleSelectAllSubjects = () => {
    setTempSelectedSubjects(["all"])
  }

  // Clear all selections
  const handleClearAllSubjects = () => {
    setTempSelectedSubjects([])
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

  const openPermissionsModal = (student: StudentProfile) => {
    setSelectedStudentForPermission(student)
    setTempSelectedSubjects(student.online_subjects || [])
    setActiveModal("permissions")
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

    setSelectedStudentForPermission(null)
    setTempSelectedSubjects([])
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  // Helper to translate subject values to labels
  const getSubjectLabelsDisplay = (subjects: string[]) => {
    if (subjects.includes("all")) {
      return <span className="text-[#C18CFF] font-bold">Tất cả các môn</span>
    }
    if (subjects.length === 0) {
      return <span className="text-[#8C87A2] italic">Chưa cấp quyền môn nào</span>
    }
    
    return (
      <div className="flex flex-wrap gap-1">
        {subjects.map(s => {
          const info = getOnlineSubjectInfo(s)
          return (
            <span key={s} className="px-1.5 py-0.5 rounded bg-[#0B0A13] border border-[#8C87A2]/20 text-[10px] text-[#F1EDF9] font-mono">
              {info.icon} {info.label.split(" ")[0]}
            </span>
          )
        })}
      </div>
    )
  }

  // Left Sidebar Tree Folder Component
  const LeftFolderTreeNode = ({ node, level = 0 }: { node: FolderTreeNode; level: number }) => {
    const isExpanded = !!expandedFolders[node.folder.id]
    const hasSubfolders = node.children.length > 0
    const isSelected = selectedFolderId === node.folder.id

    return (
      <div className="space-y-0.5">
        <div 
          onClick={() => {
            setSelectedFolderId(node.folder.id)
            setExpandedFolders(prev => ({ ...prev, [node.folder.id]: true }))
          }}
          style={{ paddingLeft: `${level * 12 + 6}px` }}
          className={`flex items-center justify-between py-1.5 px-2 rounded-lg cursor-pointer transition-colors ${
            isSelected 
              ? "bg-[#C18CFF]/15 text-[#C18CFF] font-bold" 
              : "hover:bg-[#15131F]/50 text-[#8C87A2] hover:text-[#F1EDF9]"
          }`}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <span 
              onClick={(e) => toggleFolderExpand(node.folder.id, e)}
              className="p-0.5 rounded hover:bg-[#0B0A13] shrink-0 text-[#8C87A2]"
            >
              {hasSubfolders ? (
                isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />
              ) : (
                <span className="w-3 block" />
              )}
            </span>
            <span className={isSelected ? "text-[#C18CFF]" : "text-[#8C87A2]"}>
              {isExpanded ? <FolderOpenIcon className="h-3.5 w-3.5" /> : <FolderIcon className="h-3.5 w-3.5" />}
            </span>
            <span className="text-xs truncate">{node.folder.name}</span>
          </div>
        </div>

        {isExpanded && hasSubfolders && (
          <div className="space-y-0.5">
            {node.children.map(child => (
              <LeftFolderTreeNode key={child.folder.id} node={child} level={level + 1} />
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

      <main className="mx-auto max-w-6xl px-2 pb-24 pt-24 md:px-4 lg:pt-28">
        
        {/* Header Section */}
        <section className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#8C87A2]/40 px-3 py-1 text-[10px] font-semibold text-[#8C87A2] uppercase tracking-widest font-mono">
              <GraduationCap className="h-3.5 w-3.5 text-[#C18CFF]" /> E-learning portal
            </div>
            <h1 className="text-4xl font-normal tracking-tight md:text-5xl lg:text-6xl font-serif-italic">
              Quản trị Học Online
            </h1>
          </div>

          {/* Quick Actions (Explorer Style) */}
          {activeTab === "lectures" && (
            <div className="flex items-center gap-2 shrink-0">
              <Button 
                onClick={() => {
                  setFolderName("")
                  setFolderParentId(selectedFolderId)
                  setFolderOrder(currentSubFolders.length + 1)
                  setActiveModal("folder")
                }}
                size="sm"
                className="rounded-xl border border-[#8C87A2]/30 bg-[#15131F] text-xs font-bold text-[#F1EDF9] hover:bg-[#15131F]/80 flex items-center gap-1.5 transition-transform active:scale-95"
              >
                <FolderPlus className="h-4 w-4 text-[#C18CFF]" /> + Thư mục con
              </Button>
              
              {selectedFolderId && (
                <Button 
                  onClick={() => {
                    setTargetFolderId(selectedFolderId)
                    setLessonTitle("")
                    setLessonDesc("")
                    setLessonVideoUrl("")
                    setLessonDocUrl("")
                    setLessonOrder(currentLessons.length + 1)
                    setActiveModal("lesson")
                  }}
                  size="sm"
                  className="rounded-xl bg-[#C18CFF] text-[#0B0A13] hover:bg-[#C18CFF]/90 text-xs font-bold flex items-center gap-1.5 transition-transform active:scale-95"
                >
                  <FilePlus2 className="h-4 w-4" /> + Thêm Bài học
                </Button>
              )}
            </div>
          )}
        </section>

        {/* Tab Selection */}
        <div className="mb-6 flex gap-2 border-b border-[#8C87A2]/20 pb-px">
          <button
            onClick={() => setActiveTab("lectures")}
            className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === "lectures" 
                ? "border-[#C18CFF] text-[#C18CFF]" 
                : "border-transparent text-[#8C87A2] hover:text-[#F1EDF9]"
            }`}
          >
            Quản lý bài giảng (File Explorer)
          </button>
          <button
            onClick={() => setActiveTab("permissions")}
            className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === "permissions" 
                ? "border-[#C18CFF] text-[#C18CFF]" 
                : "border-transparent text-[#8C87A2] hover:text-[#F1EDF9]"
            }`}
          >
            Cấp quyền học sinh
          </button>
        </div>

        {/* Tab 1: Lectures Manager */}
        {activeTab === "lectures" && (
          <div className="space-y-4">
            
            {/* Top Toolbar */}
            <div className="flex flex-col gap-3 rounded-2xl border border-[#8C87A2]/20 bg-[#15131F]/30 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between">
                
                {/* Subject Selector */}
                <div className="w-full sm:w-64">
                  <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="w-full rounded-xl border border-[#8C87A2]/25 bg-[#0B0A13] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#C18CFF] text-[#F1EDF9]"
                  >
                    {ONLINE_SUBJECTS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.icon} {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Local search */}
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#8C87A2]" />
                  <input
                    value={explorerSearch}
                    onChange={(e) => setExplorerSearch(e.target.value)}
                    placeholder="Tìm trong thư mục hiện tại..."
                    className="w-full rounded-xl border border-[#8C87A2]/25 bg-[#0B0A13] pl-9 pr-4 py-2 text-sm text-[#F1EDF9] placeholder-[#8C87A2] outline-none focus:ring-1 focus:ring-[#C18CFF]"
                  />
                </div>

                {/* View Mode selection */}
                <div className="flex items-center gap-1 shrink-0 bg-[#0B0A13] p-1 rounded-lg border border-[#8C87A2]/20 self-end sm:self-auto">
                  <button 
                    onClick={() => setViewMode("grid")}
                    className={`p-1.5 rounded transition-colors ${viewMode === "grid" ? "bg-[#C18CFF]/15 text-[#C18CFF]" : "text-[#8C87A2]"}`}
                    title="Dạng lưới"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => setViewMode("list")}
                    className={`p-1.5 rounded transition-colors ${viewMode === "list" ? "bg-[#C18CFF]/15 text-[#C18CFF]" : "text-[#8C87A2]"}`}
                    title="Dạng danh sách"
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>

              </div>

              {/* Windows Explorer Style Address Bar */}
              <div className="flex items-center gap-1.5 bg-[#0B0A13] border border-[#8C87A2]/20 rounded-xl px-3 py-2 overflow-x-auto text-xs font-mono scrollbar-none">
                {selectedFolderId && (
                  <button
                    onClick={() => {
                      const currentFolder = folders.find(f => f.id === selectedFolderId)
                      setSelectedFolderId(currentFolder ? currentFolder.parent_id : null)
                    }}
                    className="mr-1.5 p-1 rounded hover:bg-[#15131F] text-[#C18CFF] shrink-0"
                    title="Quay lại thư mục cha"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                )}

                <button
                  onClick={() => setSelectedFolderId(null)}
                  className={`flex items-center gap-1 hover:text-[#C18CFF] shrink-0 ${!selectedFolderId ? "text-[#C18CFF] font-bold" : "text-[#8C87A2]"}`}
                >
                  <Home className="h-3.5 w-3.5" /> Thư mục gốc
                </button>

                {breadcrumbs.map((crumb, idx) => (
                  <div key={crumb.id} className="flex items-center gap-1.5 shrink-0 text-[#8C87A2]">
                    <ChevronRight className="h-3 w-3" />
                    <button
                      onClick={() => setSelectedFolderId(crumb.id)}
                      className={`hover:text-[#C18CFF] ${idx === breadcrumbs.length - 1 ? "text-[#C18CFF] font-bold" : ""}`}
                    >
                      {crumb.name}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Split Screen Panel */}
            <div className="grid gap-4 md:grid-cols-[240px_1fr] items-start">
              
              {/* Left Pane: Folder Tree Navigation */}
              <aside className="bg-[#15131F]/30 border border-[#8C87A2]/20 rounded-2xl p-3 max-h-[500px] overflow-y-auto w-full hidden md:block">
                <div className="pb-2 mb-2 border-b border-[#8C87A2]/10 flex items-center justify-between text-[10px] uppercase font-bold text-[#8C87A2] font-mono">
                  <span>Cây thư mục</span>
                  <button onClick={() => setSelectedFolderId(null)} className="hover:text-[#C18CFF]">Mở Root</button>
                </div>
                {folderTree.length === 0 ? (
                  <p className="text-[11px] text-[#8C87A2] italic text-center py-4">Chưa có thư mục</p>
                ) : (
                  <div className="space-y-0.5">
                    {folderTree.map(root => (
                      <LeftFolderTreeNode key={root.folder.id} node={root} level={0} />
                    ))}
                  </div>
                )}
              </aside>

              {/* Right Pane: Main Files Explorer View */}
              <section className="bg-[#15131F]/15 border border-[#8C87A2]/20 rounded-2xl p-5 min-h-[400px] flex flex-col">
                
                {loadingData ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-20">
                    <Loader2 className="h-10 w-10 animate-spin text-[#C18CFF]" />
                    <p className="mt-3 text-xs text-[#8C87A2]">Đang đọc dữ liệu thư mục...</p>
                  </div>
                ) : currentSubFolders.length === 0 && currentLessons.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-16">
                    <FolderOpenIcon className="h-12 w-12 text-[#8C87A2]/30 mb-3" />
                    <h4 className="text-sm font-bold text-[#F1EDF9]">Thư mục trống</h4>
                    <p className="text-xs text-[#8C87A2] max-w-xs mt-1">
                      Thư mục này hiện không chứa thư mục con hay bài giảng nào. Hãy nhấn nút ở góc trên để thêm bài học.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6 flex-1">
                    
                    {/* Subfolders list */}
                    {currentSubFolders.length > 0 && (
                      <div>
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#8C87A2] font-mono mb-3">Thư mục con ({currentSubFolders.length})</h4>
                        
                        {viewMode === "grid" ? (
                          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                            {currentSubFolders.map(folder => (
                              <div
                                key={folder.id}
                                onDoubleClick={() => setSelectedFolderId(folder.id)}
                                onClick={() => setSelectedFolderId(folder.id)}
                                className="group relative p-3.5 bg-[#15131F] hover:bg-[#15131F]/80 border border-[#8C87A2]/20 hover:border-[#C18CFF] rounded-xl flex flex-col justify-between h-28 cursor-pointer select-none transition-all duration-200"
                              >
                                <div className="flex justify-between items-start">
                                  <FolderIcon className="h-7 w-7 text-[#C18CFF]" />
                                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); openEditFolder(folder); }}
                                      className="p-1 rounded bg-[#0B0A13] text-[#8C87A2] hover:text-[#C18CFF] border border-[#8C87A2]/20"
                                      title="Sửa tên"
                                    >
                                      <Edit3 className="h-2.5 w-2.5" />
                                    </button>
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: "folder", id: folder.id, title: folder.name }); }}
                                      className="p-1 rounded bg-[#0B0A13] text-red-400 hover:text-red-500 border border-[#8C87A2]/20"
                                      title="Xóa"
                                    >
                                      <Trash2 className="h-2.5 w-2.5" />
                                    </button>
                                  </div>
                                </div>
                                <div className="min-w-0">
                                  <span className="text-[8px] font-mono text-[#8C87A2]">Order: {folder.order_index}</span>
                                  <h5 className="font-bold text-xs text-[#F1EDF9] truncate leading-tight mt-0.5">{folder.name}</h5>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="border border-[#8C87A2]/15 rounded-xl overflow-hidden divide-y divide-[#8C87A2]/10 bg-[#15131F]/10">
                            {currentSubFolders.map(folder => (
                              <div
                                key={folder.id}
                                onClick={() => setSelectedFolderId(folder.id)}
                                className="group flex items-center justify-between p-3 cursor-pointer hover:bg-[#15131F]/50 transition-colors"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <FolderIcon className="h-4.5 w-4.5 text-[#C18CFF] shrink-0" />
                                  <span className="text-xs font-semibold text-[#F1EDF9] truncate">{folder.name}</span>
                                  <span className="text-[9px] font-mono text-[#8C87A2]">Thứ tự: {folder.order_index}</span>
                                </div>
                                <div className="flex gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={(e) => { e.stopPropagation(); openEditFolder(folder); }}
                                    className="h-7 w-7 rounded-lg border border-[#8C87A2]/20 p-1 hover:bg-[#0B0A13]"
                                  >
                                    <Edit3 className="h-2.5 w-2.5" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: "folder", id: folder.id, title: folder.name }); }}
                                    className="h-7 w-7 rounded-lg border border-red-500/10 text-red-400 hover:text-red-500 hover:bg-red-500/10 p-1"
                                  >
                                    <Trash2 className="h-2.5 w-2.5" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Lessons list */}
                    {currentLessons.length > 0 && (
                      <div>
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#8C87A2] font-mono mb-3">Bài học ({currentLessons.length})</h4>
                        
                        {viewMode === "grid" ? (
                          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                            {currentLessons.map(lesson => (
                              <div
                                key={lesson.id}
                                className="group relative p-4 bg-[#0B0A13]/30 hover:bg-[#0B0A13]/60 border border-[#8C87A2]/10 hover:border-[#C18CFF]/50 rounded-xl flex flex-col justify-between h-32 transition-all duration-200"
                              >
                                <div className="flex justify-between items-start">
                                  <PlayCircle className="h-7 w-7 text-[#8C87A2] group-hover:text-[#C18CFF] transition-colors" />
                                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                      onClick={() => openEditLesson(lesson)}
                                      className="p-1 rounded bg-[#15131F] text-[#8C87A2] hover:text-[#C18CFF] border border-[#8C87A2]/20"
                                      title="Sửa bài giảng"
                                    >
                                      <Edit3 className="h-2.5 w-2.5" />
                                    </button>
                                    <button 
                                      onClick={() => setDeleteTarget({ type: "lesson", id: lesson.id, title: lesson.title })}
                                      className="p-1 rounded bg-[#15131F] text-red-400 hover:text-red-500 border border-[#8C87A2]/20"
                                      title="Xóa"
                                    >
                                      <Trash2 className="h-2.5 w-2.5" />
                                    </button>
                                  </div>
                                </div>

                                <div className="min-w-0 mt-2">
                                  <span className="text-[8px] font-mono text-[#8C87A2]">Bài giảng {lesson.order_index}</span>
                                  <h5 className="font-bold text-xs text-[#F1EDF9] truncate leading-tight mt-0.5">{lesson.title}</h5>
                                  <div className="flex gap-2 mt-2">
                                    {lesson.video_url && <span className="text-[8px] uppercase font-bold text-[#C18CFF] bg-[#C18CFF]/10 px-1 rounded">Video</span>}
                                    {lesson.document_url && <span className="text-[8px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-1 rounded">Tài liệu</span>}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="border border-[#8C87A2]/10 rounded-xl overflow-hidden divide-y divide-[#8C87A2]/10 bg-[#0B0A13]/10">
                            {currentLessons.map(lesson => (
                              <div
                                key={lesson.id}
                                className="group flex items-center justify-between p-3 hover:bg-[#0B0A13]/30 transition-colors"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <PlayCircle className="h-4.5 w-4.5 text-[#8C87A2] shrink-0" />
                                  <span className="text-xs font-semibold text-[#F1EDF9] truncate">{lesson.title}</span>
                                  <span className="text-[9px] font-mono text-[#8C87A2]">Bài: {lesson.order_index}</span>
                                  <div className="flex gap-1.5 shrink-0">
                                    {lesson.video_url && <Video className="h-3 w-3 text-[#C18CFF]" />}
                                    {lesson.document_url && <FileText className="h-3 w-3 text-emerald-400" />}
                                  </div>
                                </div>
                                <div className="flex gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => openEditLesson(lesson)}
                                    className="h-7 w-7 rounded-lg border border-[#8C87A2]/20 p-1 hover:bg-[#15131F]"
                                  >
                                    <Edit3 className="h-2.5 w-2.5" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => setDeleteTarget({ type: "lesson", id: lesson.id, title: lesson.title })}
                                    className="h-7 w-7 rounded-lg border border-red-500/10 text-red-400 hover:text-red-500 hover:bg-red-500/10 p-1"
                                  >
                                    <Trash2 className="h-2.5 w-2.5" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </section>
            </div>
          </div>
        )}

        {/* Tab 2: Permission Manager (Granular Subjects Assignment) */}
        {activeTab === "permissions" && (
          <div className="space-y-6">
            
            {/* Search toolbar */}
            <form onSubmit={handleStudentSearchSubmit} className="flex items-center gap-2 rounded-xl border border-[#8C87A2]/20 bg-[#15131F]/30 px-3 py-2">
              <Search className="h-4 w-4 text-[#8C87A2]" />
              <input
                value={searchStudentQuery}
                onChange={(e) => setSearchStudentQuery(e.target.value)}
                placeholder="Tìm học sinh theo tên hoặc email..."
                className="bg-transparent text-sm w-full outline-none text-[#F1EDF9] placeholder-[#8C87A2] --webkit-appearance-none"
              />
              <Button type="submit" size="sm" className="rounded-lg bg-[#C18CFF] text-[#0B0A13] hover:bg-[#C18CFF]/90 text-xs font-bold px-4 py-1.5">
                Tìm kiếm
              </Button>
            </form>

            {/* Students list */}
            <div className="rounded-2xl border border-[#8C87A2]/20 bg-[#15131F]/10 overflow-hidden">
              <div className="p-4 border-b border-[#8C87A2]/20 bg-[#15131F]/50 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#8C87A2] font-mono">Cấp quyền học trực tuyến</span>
                <span className="text-[10px] bg-[#0B0A13] px-2 py-0.5 rounded border border-[#8C87A2]/20 text-[#8C87A2] font-mono">
                  {students.length} học viên
                </span>
              </div>

              {loadingStudents ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-[#C18CFF]" />
                  <p className="mt-2 text-xs text-[#8C87A2]">Đang tải học sinh...</p>
                </div>
              ) : students.length === 0 ? (
                <div className="text-center py-20 text-sm text-[#8C87A2] italic">
                  Không tìm thấy học sinh nào.
                </div>
              ) : (
                <div className="divide-y divide-[#8C87A2]/10 bg-[#15131F]/20">
                  {students.map(student => {
                    const isOnline = student.online_subjects && student.online_subjects.length > 0
                    return (
                      <div key={student.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between hover:bg-[#15131F]/30 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${
                            isOnline 
                              ? "border-[#C18CFF]/50 bg-[#C18CFF]/10 text-[#C18CFF]" 
                              : "border-[#8C87A2]/30 bg-[#0B0A13] text-[#8C87A2]"
                          }`}>
                            {student.full_name?.[0]?.toUpperCase() || "H"}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-sm text-[#F1EDF9] truncate">{student.full_name || "Chưa đặt tên"}</h4>
                              {student.class && (
                                <span className="rounded bg-[#0B0A13] border border-[#8C87A2]/20 px-1.5 py-0.5 text-[9px] font-bold text-[#8C87A2] font-mono shrink-0">
                                  {student.class}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-[#8C87A2] mt-0.5 truncate">{student.email}</p>
                          </div>
                        </div>

                        {/* Middle display: Assigned Subjects list */}
                        <div className="flex-1 px-0 sm:px-6 max-w-md">
                          <div className="text-[9px] font-bold uppercase tracking-wider text-[#8C87A2] font-mono mb-1">Môn học trực tuyến được cấp</div>
                          {getSubjectLabelsDisplay(student.online_subjects || [])}
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                          <Button
                            size="sm"
                            onClick={() => openPermissionsModal(student)}
                            className="rounded-xl font-bold text-xs py-1.5 px-4 bg-[#C18CFF] text-[#0B0A13] hover:bg-[#C18CFF]/90 flex items-center gap-1.5 transition-transform active:scale-95"
                          >
                            <Sliders className="h-3.5 w-3.5" /> Điều chỉnh quyền
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

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

      {/* ── Granular Subjects Permission Modal ── */}
      <AnimatePresence>
        {activeModal === "permissions" && selectedStudentForPermission && (
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
              
              <div className="mb-4">
                <h3 className="text-lg font-bold text-[#F1EDF9]">Cấp quyền môn học trực tuyến</h3>
                <p className="text-xs text-[#8C87A2] mt-1">
                  Đang thiết lập quyền cho: <strong className="text-[#C18CFF]">{selectedStudentForPermission.full_name}</strong> ({selectedStudentForPermission.email})
                </p>
              </div>

              <form onSubmit={handlePermissionsSubmit} className="space-y-4">
                
                {/* Master Switch: All subjects */}
                <div className="p-3 bg-[#0B0A13]/40 border border-[#8C87A2]/20 rounded-xl flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-[#F1EDF9]">Cấp tất cả các môn</span>
                    <span className="text-[10px] text-[#8C87A2] mt-0.5">Cho phép truy cập toàn bộ 12 môn học trực tuyến</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={tempSelectedSubjects.includes("all")}
                    onChange={() => handleToggleSubjectCheckbox("all")}
                    className="h-4 w-4 rounded border-[#8C87A2]/40 bg-[#0B0A13] text-[#C18CFF] focus:ring-[#C18CFF] accent-[#C18CFF] cursor-pointer"
                  />
                </div>

                {/* Sub-selector: Individual subjects (disabled if "all" is checked) */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-bold text-[#8C87A2] uppercase tracking-wider font-mono">
                    <span>Chọn từng môn học</span>
                    <div className="flex gap-2">
                      <button 
                        type="button" 
                        onClick={handleSelectAllSubjects}
                        className="text-[#C18CFF] hover:underline"
                      >
                        Chọn hết
                      </button>
                      <span>|</span>
                      <button 
                        type="button" 
                        onClick={handleClearAllSubjects}
                        className="text-red-400 hover:underline"
                      >
                        Bỏ chọn hết
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1 border border-[#8C87A2]/10 rounded-xl p-3 bg-[#0B0A13]/20 custom-scrollbar">
                    {ONLINE_SUBJECTS.map(subject => {
                      const isChecked = tempSelectedSubjects.includes("all") || tempSelectedSubjects.includes(subject.value)
                      const isDisabled = tempSelectedSubjects.includes("all")

                      return (
                        <label 
                          key={subject.value}
                          className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                            isChecked 
                              ? "bg-[#C18CFF]/10 border-[#C18CFF]/30 text-[#F1EDF9]" 
                              : "bg-[#0B0A13]/30 border-[#8C87A2]/10 text-[#8C87A2] hover:text-[#F1EDF9] hover:bg-[#0B0A13]/55"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-base shrink-0">{subject.icon}</span>
                            <span className="truncate font-medium">{subject.label}</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={isDisabled && subject.value !== "all"}
                            onChange={() => handleToggleSubjectCheckbox(subject.value)}
                            className="h-3.5 w-3.5 rounded border-[#8C87A2]/40 bg-[#0B0A13] text-[#C18CFF] focus:ring-[#C18CFF] accent-[#C18CFF] cursor-pointer disabled:opacity-50"
                          />
                        </label>
                      )
                    })}
                  </div>
                </div>

                {formError && <p className="text-xs text-red-500 mt-2">{formError}</p>}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#8C87A2]/10">
                  <Button type="button" variant="ghost" onClick={closeModal} className="rounded-lg border border-[#8C87A2]/20 text-[#8C87A2]">
                    Hủy
                  </Button>
                  <Button type="submit" disabled={submitting} className="rounded-lg bg-[#C18CFF] text-[#0B0A13] hover:bg-[#C18CFF]/90 font-bold px-6">
                    {submitting ? "Đang xử lý..." : "Lưu quyền hạn"}
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
