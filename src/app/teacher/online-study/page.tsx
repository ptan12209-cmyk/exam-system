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
import Footer from "@/components/Footer"
import { AccessSecurityPanel } from "@/components/teacher/AccessSecurityPanel"
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
  UserPlus,
  ChevronLeft,
  LayoutGrid,
  List,
  Home,
  Sliders,
  BadgeDollarSign,
  CreditCard,
  Activity,
  RefreshCw,
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
  videos?: Array<{ title: string; url: string }>
  documents?: Array<{ title: string; url: string }>
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
  const [activeTab, setActiveTab] = useState<"lectures" | "permissions" | "payment" | "orders" | "security">("lectures")
  const [orderStatusFilter, setOrderStatusFilter] = useState<"all" | "pending" | "success" | "failed">("all")

  // Selection States
  const [selectedSubject, setSelectedSubject] = useState("toan")
  const subjectInfo = getOnlineSubjectInfo(selectedSubject)

  // File Explorer Navigation States
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null) // null means Root
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({})
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [isMobileTreeOpen, setIsMobileTreeOpen] = useState(false)

  // Payment settings state
  const [bankId, setBankId] = useState("MB")
  const [accountNo, setAccountNo] = useState("")
  const [accountName, setAccountName] = useState("")
  const [subjectPrices, setSubjectPrices] = useState<Record<string, number>>({})
  const [savingSettings, setSavingSettings] = useState(false)

  // Orders and Revenue States
  const [orders, setOrders] = useState<any[]>([])
  const [revenue, setRevenue] = useState(0)
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [approvingOrderId, setApprovingOrderId] = useState<string | null>(null)
  const [approveTarget, setApproveTarget] = useState<{ id: string; label: string } | null>(null)

  // Create student states
  const [isCreateStudentOpen, setIsCreateStudentOpen] = useState(false)
  const [newStudentName, setNewStudentName] = useState("")
  const [newStudentEmail, setNewStudentEmail] = useState("")
  const [newStudentPassword, setNewStudentPassword] = useState("")
  const [newStudentClass, setNewStudentClass] = useState("")
  const [creatingStudent, setCreatingStudent] = useState(false)

  // Handle direct student account creation submit
  const handleCreateStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newStudentName.trim() || !newStudentEmail.trim() || !newStudentPassword.trim()) {
      toastError("Vui lòng nhập đầy đủ Họ tên, Email và Mật khẩu.")
      return
    }
    setCreatingStudent(true)
    try {
      const res = await fetch("/api/online-study/create-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newStudentEmail.trim(),
          fullName: newStudentName.trim(),
          password: newStudentPassword.trim(),
          studentClass: newStudentClass.trim() || null
        })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        success("Đã cấp tài khoản học viên trực tiếp thành công!")
        setIsCreateStudentOpen(false)
        setNewStudentName("")
        setNewStudentEmail("")
        setNewStudentPassword("")
        setNewStudentClass("")
        fetchStudents(searchStudentQuery)
      } else {
        throw new Error(data.error || "Lỗi tạo tài khoản")
      }
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Tạo tài khoản thất bại.")
    } finally {
      setCreatingStudent(false)
    }
  }

  // Fetch payment configurations when entering the tab
  useEffect(() => {
    async function loadPaymentSettings() {
      try {
        const res = await fetch("/api/online-study/payment-settings")
        const data = await res.json()
        if (res.ok && data.success) {
          setBankId(data.data.bankId || "MB")
          setAccountNo(data.data.accountNo || "")
          setAccountName(data.data.accountName || "")
          setSubjectPrices(data.data.prices || {})
        }
      } catch (e) {
        console.error("Lỗi tải cấu hình thanh toán:", e)
      }
    }
    if (activeTab === "payment") {
      loadPaymentSettings()
    } else if (activeTab === "orders") {
      fetchOrders()
    }
  }, [activeTab])

  // Fetch orders and revenue
  const fetchOrders = async () => {
    setLoadingOrders(true)
    try {
      const res = await fetch("/api/online-study/orders")
      const data = await res.json()
      if (res.ok && data.success) {
        setOrders(data.data.orders || [])
        setRevenue(data.data.revenue || 0)
      }
    } catch (err) {
      console.error(err)
      toastError("Không thể tải danh sách đơn hàng.")
    } finally {
      setLoadingOrders(false)
    }
  }

  // Handle manual order approval (after confirm dialog)
  const handleApproveOrder = async (orderId: string) => {
    setApprovingOrderId(orderId)
    try {
      const res = await fetch("/api/online-study/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status: "success" })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        success("Đã duyệt đơn hàng và mở khóa môn học thành công!")
        fetchOrders()
        fetchStudents(searchStudentQuery)
      } else {
        const msg = data?.error?.message || data?.error || "Lỗi duyệt đơn hàng"
        throw new Error(typeof msg === "string" ? msg : "Lỗi duyệt đơn hàng")
      }
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Duyệt đơn hàng thất bại")
    } finally {
      setApprovingOrderId(null)
      setApproveTarget(null)
    }
  }

  // Save payment settings handler
  const handleSavePaymentSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!accountNo.trim() || !accountName.trim()) {
      toastError("Vui lòng nhập đầy đủ Số tài khoản và Tên tài khoản.")
      return
    }
    setSavingSettings(true)
    try {
      const res = await fetch("/api/online-study/payment-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bankId,
          accountNo: accountNo.trim(),
          accountName: accountName.trim().toUpperCase(),
          prices: subjectPrices
        })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        success("Lưu cấu hình thanh toán và bảng giá thành công!")
      } else {
        throw new Error(data.error || "Lỗi lưu cấu hình")
      }
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Không thể lưu cấu hình")
    } finally {
      setSavingSettings(false)
    }
  }

  const handlePriceChange = (val: string, price: number) => {
    setSubjectPrices(prev => ({ ...prev, [val]: price }))
  }

  // Load states from localStorage after mounting
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTab = localStorage.getItem("teacher_study_tab")
      const savedSubject = localStorage.getItem("teacher_study_subject")
      
      if (
        savedTab === "lectures" ||
        savedTab === "permissions" ||
        savedTab === "payment" ||
        savedTab === "orders" ||
        savedTab === "security"
      ) {
        setActiveTab(savedTab)
      }
      if (savedSubject && ONLINE_SUBJECTS.some(s => s.value === savedSubject)) {
        setSelectedSubject(savedSubject)
      }
      
      const targetSub = savedSubject || "toan"
      const savedFolder = localStorage.getItem(`teacher_folder_${targetSub}`)
      const savedExpanded = localStorage.getItem(`teacher_expanded_${targetSub}`)
      if (savedFolder) setSelectedFolderId(savedFolder)
      if (savedExpanded) {
        try {
          setExpandedFolders(JSON.parse(savedExpanded))
        } catch (e){}
      }
    }
  }, [])

  // Save states to localStorage on changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("teacher_study_tab", activeTab)
    }
  }, [activeTab])

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("teacher_study_subject", selectedSubject)
    }
  }, [selectedSubject])

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (selectedFolderId) {
        localStorage.setItem(`teacher_folder_${selectedSubject}`, selectedFolderId)
      } else {
        localStorage.removeItem(`teacher_folder_${selectedSubject}`)
      }
    }
  }, [selectedFolderId, selectedSubject])

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(`teacher_expanded_${selectedSubject}`, JSON.stringify(expandedFolders))
    }
  }, [expandedFolders, selectedSubject])

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
  const [lessonVideos, setLessonVideos] = useState<Array<{ title: string; url: string }>>([])
  const [lessonDocuments, setLessonDocuments] = useState<Array<{ title: string; url: string }>>([])

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
    }
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
      if (typeof window !== "undefined") {
        const savedFolder = localStorage.getItem(`teacher_folder_${selectedSubject}`)
        setSelectedFolderId(savedFolder || null)
      } else {
        setSelectedFolderId(null)
      }
    } else if (activeTab === "permissions") {
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
      const filteredVideos = lessonVideos.filter(v => v.url.trim() !== "")
      const filteredDocuments = lessonDocuments.filter(d => d.url.trim() !== "")

      const body = {
        id: editingItem?.type === "lesson" ? editingItem.id : undefined,
        folder_id: targetFolderId,
        title: lessonTitle.trim(),
        description: lessonDesc.trim() || null,
        video_url: filteredVideos[0]?.url || null,
        document_url: filteredDocuments[0]?.url || null,
        videos: filteredVideos,
        documents: filteredDocuments,
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

    const initialVideos = lesson.videos && lesson.videos.length > 0
      ? lesson.videos
      : (lesson.video_url ? [{ title: "Video bài học", url: lesson.video_url }] : [{ title: "", url: "" }])

    const initialDocs = lesson.documents && lesson.documents.length > 0
      ? lesson.documents
      : (lesson.document_url ? [{ title: "Tài liệu ôn tập", url: lesson.document_url }] : [{ title: "", url: "" }])

    setLessonVideos(initialVideos)
    setLessonDocuments(initialDocs)
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
    setLessonVideos([])
    setLessonDocuments([])
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
          <span className="text-lg font-bold tracking-tight">Quản trị Học Online</span>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <UserMenu userName={profile?.full_name || ""} userClass="Quản trị viên" role="teacher" onLogout={handleLogout} />
        </div>
      </header>

      <main className="mx-auto max-w-7xl w-full px-3 pb-24 pt-24 sm:px-6 lg:px-8 lg:pt-28">
        
        {/* Header Section */}
        <section className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#8C87A2]/40 px-3 py-1 text-[10px] font-semibold text-[#8C87A2] uppercase tracking-widest font-mono">
              <Shield className="h-3.5 w-3.5 text-[#C18CFF]" /> Admin control panel
            </div>
            <h1 className="text-4xl font-normal tracking-tight md:text-5xl lg:text-6xl font-serif-italic">
              Quản trị Hệ thống Học tập
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
                    setLessonVideos([{ title: "", url: "" }])
                    setLessonDocuments([{ title: "", url: "" }])
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

        {/* V3: Bunny / video security checklist (ops) */}
        <section className="mb-6 rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10">
              <ShieldCheck className="h-5 w-5 text-amber-300" />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <h2 className="text-sm font-bold text-[#F1EDF9]">
                Checklist bảo mật video Bunny (V3)
              </h2>
              <p className="text-[11px] text-[#8C87A2] leading-relaxed">
                Cấu hình trên{" "}
                <a
                  href="https://dash.bunny.net"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#C18CFF] underline underline-offset-2"
                >
                  Bunny dashboard
                </a>
                {" "}— app chỉ cấp URL có quyền qua playback API. Domain site:{" "}
                <code className="rounded bg-[#0B0A13] px-1.5 py-0.5 font-mono text-[10px] text-amber-200">
                  luyende.id.vn
                </code>
              </p>
              <ul className="grid gap-1.5 text-[11px] text-[#C8C4D8] sm:grid-cols-2">
                <li className="flex gap-2">
                  <span className="text-amber-400 shrink-0">1.</span>
                  <span>
                    Stream library → <strong className="text-[#F1EDF9]">Security</strong> → bật{" "}
                    <strong className="text-[#F1EDF9]">Token Authentication</strong>
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-400 shrink-0">2.</span>
                  <span>
                    Copy <strong className="text-[#F1EDF9]">Token security key</strong> → Vercel env{" "}
                    <code className="font-mono text-[10px] text-amber-200">BUNNY_STREAM_TOKEN_KEY</code>
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-400 shrink-0">3.</span>
                  <span>
                    Allowed referrers / domains:{" "}
                    <code className="font-mono text-[10px] text-amber-200">luyende.id.vn</code>
                    {" "}+ localhost (dev)
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-400 shrink-0">4.</span>
                  <span>
                    Tắt download / block hotlink nếu Bunny hỗ trợ trên library
                  </span>
                </li>
                <li className="flex gap-2 sm:col-span-2">
                  <span className="text-amber-400 shrink-0">5.</span>
                  <span>
                    Dán link <strong className="text-[#F1EDF9]">embed</strong> hoặc play Bunny vào bài học
                    (app tự chuẩn hóa, bỏ token cũ khi lưu)
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Tab Selection */}
        <div className="mb-6 flex gap-2 border-b border-[#8C87A2]/20 pb-px overflow-x-auto">
          <button
            onClick={() => setActiveTab("lectures")}
            className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "lectures" 
                ? "border-[#C18CFF] text-[#C18CFF]" 
                : "border-transparent text-[#8C87A2] hover:text-[#F1EDF9]"
            }`}
          >
            Quản lý bài giảng (Drive)
          </button>
          <button
            onClick={() => setActiveTab("permissions")}
            className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "permissions" 
                ? "border-[#C18CFF] text-[#C18CFF]" 
                : "border-transparent text-[#8C87A2] hover:text-[#F1EDF9]"
            }`}
          >
            Cấp quyền học sinh
          </button>
          <button
            onClick={() => setActiveTab("payment")}
            className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "payment" 
                ? "border-[#C18CFF] text-[#C18CFF]" 
                : "border-transparent text-[#8C87A2] hover:text-[#F1EDF9]"
            }`}
          >
            Cấu hình thanh toán & Bảng giá
          </button>
          <button
            onClick={() => setActiveTab("orders")}
            className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "orders" 
                ? "border-[#C18CFF] text-[#C18CFF]" 
                : "border-transparent text-[#8C87A2] hover:text-[#F1EDF9]"
            }`}
          >
            Quản lý đơn hàng & Doanh thu
          </button>
          <button
            onClick={() => setActiveTab("security")}
            className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "security" 
                ? "border-[#C18CFF] text-[#C18CFF]" 
                : "border-transparent text-[#8C87A2] hover:text-[#F1EDF9]"
            }`}
          >
            Bảo mật & Logs
          </button>
        </div>

        {/* Tab 1: Lectures Manager */}
        {activeTab === "lectures" && (
          <div className="space-y-4">
            
            {/* Drive-style toolbar (full width, no side tree) */}
            <div className="flex flex-col gap-3 rounded-2xl border border-[#8C87A2]/20 bg-[#15131F] p-4 sm:p-5 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between">
                
                {/* Subject Selector */}
                <div className="flex items-center gap-2 w-full sm:w-72 shrink-0">
                  <select
                    value={selectedSubject}
                    onChange={(e) => {
                      setSelectedSubject(e.target.value)
                      setSelectedFolderId(null)
                    }}
                    className="w-full rounded-xl border border-[#8C87A2]/25 bg-[#0B0A13] px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#C18CFF] text-[#F1EDF9] h-11"
                  >
                    {ONLINE_SUBJECTS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.icon} {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Local search */}
                <div className="relative w-full sm:flex-1 sm:max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C87A2]" />
                  <input
                    value={explorerSearch}
                    onChange={(e) => setExplorerSearch(e.target.value)}
                    placeholder="Tìm trong thư mục hiện tại..."
                    className="w-full rounded-xl border border-[#8C87A2]/25 bg-[#0B0A13] pl-9 pr-4 py-2.5 text-sm text-[#F1EDF9] placeholder-[#8C87A2] outline-none focus:ring-1 focus:ring-[#C18CFF] h-11"
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

              {/* Drive breadcrumb path */}
              <div className="flex items-center gap-1 bg-[#0B0A13] border border-[#8C87A2]/20 rounded-xl px-2 sm:px-3 py-2 overflow-x-auto text-sm scrollbar-none">
                {selectedFolderId && (
                  <button
                    onClick={() => {
                      const currentFolder = folders.find(f => f.id === selectedFolderId)
                      setSelectedFolderId(currentFolder ? currentFolder.parent_id : null)
                    }}
                    className="mr-1 p-2 rounded-lg hover:bg-[#15131F] text-[#C18CFF] shrink-0"
                    title="Lên một cấp"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                )}

                <button
                  onClick={() => setSelectedFolderId(null)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg shrink-0 font-semibold text-xs sm:text-sm ${!selectedFolderId ? "bg-[#C18CFF]/15 text-[#C18CFF]" : "text-[#8C87A2] hover:text-[#F1EDF9] hover:bg-[#15131F]"}`}
                >
                  <Home className="h-4 w-4" /> Gốc
                </button>

                {breadcrumbs.map((crumb, idx) => (
                  <div key={crumb.id} className="flex items-center gap-1 shrink-0 text-[#8C87A2]">
                    <ChevronRight className="h-4 w-4 opacity-50" />
                    <button
                      onClick={() => setSelectedFolderId(crumb.id)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold max-w-[180px] truncate ${idx === breadcrumbs.length - 1 ? "bg-[#C18CFF]/15 text-[#C18CFF]" : "hover:text-[#F1EDF9] hover:bg-[#15131F]"}`}
                    >
                      {crumb.name}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Full-page drive canvas (no side tree) */}
            <div className="w-full">
              <section className="bg-[#15131F]/50 border border-[#8C87A2]/20 rounded-2xl p-4 sm:p-6 min-h-[60vh] flex flex-col">
                
                {loadingData ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-24">
                    <Loader2 className="h-10 w-10 animate-spin text-[#C18CFF]" />
                    <p className="mt-3 text-xs text-[#8C87A2]">Đang đọc dữ liệu thư mục...</p>
                  </div>
                ) : currentSubFolders.length === 0 && currentLessons.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-20">
                    <FolderOpenIcon className="h-16 w-16 text-[#8C87A2]/30 mb-4" />
                    <h4 className="text-base font-bold text-[#F1EDF9]">Thư mục trống</h4>
                    <p className="text-sm text-[#8C87A2] max-w-sm mt-2">
                      Thêm thư mục con hoặc bài học bằng nút góc trên. Điều hướng bằng thanh đường dẫn như Google Drive.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-8 flex-1">
                    
                    {/* Subfolders list */}
                    {currentSubFolders.length > 0 && (
                      <div>
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#8C87A2] font-mono mb-4">Thư mục ({currentSubFolders.length})</h4>
                        
                        {viewMode === "grid" ? (
                          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
                            {currentSubFolders.map(folder => (
                              <div
                                key={folder.id}
                                onDoubleClick={() => setSelectedFolderId(folder.id)}
                                onClick={() => setSelectedFolderId(folder.id)}
                                className="group relative p-4 bg-[#0B0A13]/60 hover:bg-[#0B0A13] border border-[#8C87A2]/15 hover:border-[#C18CFF] rounded-2xl flex flex-col justify-between min-h-[128px] cursor-pointer select-none transition-all duration-200"
                              >
                                <div className="flex justify-between items-start">
                                  <FolderIcon className="h-10 w-10 text-[#C18CFF]" />
                                  <div className="flex gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); openEditFolder(folder); }}
                                      className="p-1.5 rounded-lg bg-[#15131F] text-[#8C87A2] hover:text-[#C18CFF] border border-[#8C87A2]/20"
                                      title="Sửa tên"
                                    >
                                      <Edit3 className="h-3.5 w-3.5" />
                                    </button>
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: "folder", id: folder.id, title: folder.name }); }}
                                      className="p-1.5 rounded-lg bg-[#15131F] text-red-400 hover:text-red-500 border border-[#8C87A2]/20"
                                      title="Xóa"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                                <div className="min-w-0 mt-2">
                                  <h5 className="font-bold text-sm text-[#F1EDF9] line-clamp-2 leading-snug">{folder.name}</h5>
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
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#8C87A2] font-mono mb-4">Bài giảng ({currentLessons.length})</h4>
                        
                        {viewMode === "grid" ? (
                          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {currentLessons.map(lesson => (
                              <div
                                key={lesson.id}
                                className="group relative p-5 bg-[#0B0A13]/50 hover:bg-[#0B0A13] border border-[#8C87A2]/15 hover:border-[#C18CFF]/50 rounded-2xl flex flex-col justify-between min-h-[140px] transition-all duration-200"
                              >
                                <div className="flex justify-between items-start">
                                  <PlayCircle className="h-9 w-9 text-[#8C87A2] group-hover:text-[#C18CFF] transition-colors" />
                                  <div className="flex gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                      onClick={() => openEditLesson(lesson)}
                                      className="p-1.5 rounded-lg bg-[#15131F] text-[#8C87A2] hover:text-[#C18CFF] border border-[#8C87A2]/20"
                                      title="Sửa bài giảng"
                                    >
                                      <Edit3 className="h-3.5 w-3.5" />
                                    </button>
                                    <button 
                                      onClick={() => setDeleteTarget({ type: "lesson", id: lesson.id, title: lesson.title })}
                                      className="p-1.5 rounded-lg bg-[#15131F] text-red-400 hover:text-red-500 border border-[#8C87A2]/20"
                                      title="Xóa"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>

                                <div className="min-w-0 mt-3">
                                  <h5 className="font-bold text-sm text-[#F1EDF9] line-clamp-2 leading-snug">{lesson.title}</h5>
                                  <div className="flex gap-2 mt-2 flex-wrap">
                                    {(lesson.video_url || (lesson.videos && lesson.videos.length > 0)) && <span className="text-[10px] uppercase font-bold text-[#C18CFF] bg-[#C18CFF]/10 px-2 py-0.5 rounded-md">Video</span>}
                                    {(lesson.document_url || (lesson.documents && lesson.documents.length > 0)) && <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">Tài liệu</span>}
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
            
            {/* Search toolbar and Add student button */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <form onSubmit={handleStudentSearchSubmit} className="flex-1 flex items-center gap-2 rounded-xl border border-[#8C87A2]/20 bg-[#15131F]/30 px-3 py-2 w-full">
                <Search className="h-4 w-4 text-[#8C87A2]" />
                <input
                  value={searchStudentQuery}
                  onChange={(e) => setSearchStudentQuery(e.target.value)}
                  placeholder="Tìm học sinh theo tên hoặc email..."
                  className="bg-transparent text-sm w-full outline-none text-[#F1EDF9] placeholder-[#8C87A2] --webkit-appearance-none"
                />
                <Button type="submit" size="sm" className="rounded-lg bg-[#C18CFF] text-[#0B0A13] hover:bg-[#C18CFF]/90 text-xs font-bold px-4 py-1.5 shrink-0">
                  Tìm kiếm
                </Button>
              </form>
              <Button
                onClick={() => setIsCreateStudentOpen(true)}
                className="w-full sm:w-auto rounded-xl bg-[#C18CFF] text-[#0B0A13] hover:bg-[#C18CFF]/90 text-xs font-bold px-4 py-2.5 flex items-center justify-center gap-1.5 transition-transform active:scale-95 shrink-0"
              >
                <UserPlus className="h-4 w-4" /> Cấp tài khoản mới
              </Button>
            </div>

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
                              <span className="rounded bg-[#C18CFF]/10 border border-[#C18CFF]/20 px-1.5 py-0.5 text-[9px] font-bold text-[#C18CFF] font-mono shrink-0">
                                Đã học: {(student as any).progress_percent || 0}%
                              </span>
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

        {/* Tab 3: Payment Configurations */}
        {activeTab === "payment" && (
          <form onSubmit={handleSavePaymentSettings} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-[1fr_1.5fr] items-start">
              
              {/* Left pane: Bank details */}
              <div className="bg-[#15131F] border border-[#8C87A2]/20 rounded-2xl p-6 space-y-4">
                <div className="pb-3 border-b border-[#8C87A2]/10">
                  <h3 className="text-sm font-bold text-[#F1EDF9] font-mono tracking-wide">THÔNG TIN THỤ HƯỞNG</h3>
                  <p className="text-[11px] text-[#8C87A2] mt-1">Cấu hình tài khoản ngân hàng để học sinh chuyển khoản trực tiếp về ví của bạn.</p>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-[#8C87A2] font-mono">Chọn Ngân hàng (VietQR)</Label>
                    <select
                      value={bankId}
                      onChange={(e) => setBankId(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-[#8C87A2]/25 bg-[#0B0A13] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#C18CFF] text-[#F1EDF9] h-9 font-sans"
                    >
                      <option value="MB">MB Bank (Ngân hàng Quân Đội)</option>
                      <option value="VCB">Vietcombank (Ngoại Thương)</option>
                      <option value="TCB">Techcombank (Kỹ Thương)</option>
                      <option value="BIDV">BIDV (Đầu tư & Phát triển)</option>
                      <option value="ICB">VietinBank (Công Thương)</option>
                      <option value="ACB">ACB (Á Châu)</option>
                      <option value="TPB">TPBank (Tiên Phong)</option>
                      <option value="VPB">VPBank (Thịnh Vượng)</option>
                      <option value="STB">Sacombank (Sài Gòn Thương Tín)</option>
                      <option value="VBA">Agribank (Nông nghiệp)</option>
                    </select>
                  </div>

                  <div>
                    <Label className="text-xs text-[#8C87A2] font-mono">Số tài khoản ngân hàng</Label>
                    <Input 
                      value={accountNo}
                      onChange={(e) => setAccountNo(e.target.value)}
                      placeholder="VD: 0348574888"
                      className="mt-1 bg-[#0B0A13] border-[#8C87A2]/25 focus:ring-[#C18CFF] text-[#F1EDF9] font-mono"
                      required
                    />
                  </div>

                  <div>
                    <Label className="text-xs text-[#8C87A2] font-mono">Tên chủ tài khoản (Không dấu)</Label>
                    <Input 
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      placeholder="VD: NGUYEN VAN A"
                      className="mt-1 bg-[#0B0A13] border-[#8C87A2]/25 focus:ring-[#C18CFF] text-[#F1EDF9] uppercase"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Right pane: Price lists */}
              <div className="bg-[#15131F] border border-[#8C87A2]/20 rounded-2xl p-6 space-y-4">
                <div className="pb-3 border-b border-[#8C87A2]/10">
                  <h3 className="text-sm font-bold text-[#F1EDF9] font-mono tracking-wide">CẤU HÌNH GIÁ MÔN HỌC</h3>
                  <p className="text-[11px] text-[#8C87A2] mt-1">Điều chỉnh giá mở khóa từng môn học trực tuyến đối với học sinh.</p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {ONLINE_SUBJECTS.map((sub) => {
                    const currentPrice = subjectPrices[sub.value] !== undefined 
                      ? subjectPrices[sub.value] 
                      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                      // @ts-ignore
                      : (sub.price || 299000)
                    
                    return (
                      <div key={sub.value} className="flex items-center justify-between p-3 rounded-xl border border-[#8C87A2]/10 bg-[#0B0A13]/30">
                        <div className="flex items-center gap-2 min-w-0 mr-2">
                          <span className="text-lg shrink-0">{sub.icon}</span>
                          <span className="text-xs font-semibold text-[#F1EDF9] truncate">{sub.label}</span>
                        </div>
                        <div className="relative w-32 shrink-0">
                          <input 
                            type="number"
                            value={currentPrice}
                            onChange={(e) => handlePriceChange(sub.value, Number(e.target.value))}
                            className="w-full rounded-lg border border-[#8C87A2]/25 bg-[#0B0A13] pr-7 pl-2.5 py-1 text-right text-xs text-[#F1EDF9] placeholder-[#8C87A2] outline-none focus:ring-1 focus:ring-[#C18CFF] font-mono"
                            min={0}
                            required
                          />
                          <span className="absolute right-2 top-1.5 text-[10px] text-[#8C87A2] font-mono">đ</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

            </div>

            <div className="flex items-center justify-end">
              <Button 
                type="submit" 
                disabled={savingSettings}
                className="rounded-xl bg-[#C18CFF] text-[#0B0A13] hover:bg-[#C18CFF]/90 font-bold px-8 py-2.5 transition-transform active:scale-95 flex items-center gap-1.5"
              >
                {savingSettings && <Loader2 className="h-4 w-4 animate-spin" />}
                Lưu cấu hình thanh toán
              </Button>
            </div>
          </form>
        )}

        {/* Tab 4: Orders & Revenue Management */}
        {activeTab === "orders" && (() => {
          const successOrders = orders.filter((o) => o.status === "success")
          const pendingOrders = orders.filter((o) => o.status === "pending")
          const monthStart = new Date()
          monthStart.setDate(1)
          monthStart.setHours(0, 0, 0, 0)
          const monthRevenue = successOrders
            .filter((o) => new Date(o.created_at) >= monthStart)
            .reduce((sum, o) => sum + (Number(o.amount) || 0), 0)
          const filteredOrders =
            orderStatusFilter === "all"
              ? orders
              : orders.filter((o) => o.status === orderStatusFilter)

          return (
          <div className="space-y-6">
            
            {/* Revenue Analytics Cards */}
            <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div className="bg-[#15131F] border border-[#8C87A2]/20 rounded-2xl p-5 relative overflow-hidden shadow-sm">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C87A2] font-mono">Tổng DT đã nhận</span>
                <h3 className="text-2xl sm:text-3xl font-bold text-[#C18CFF] font-mono mt-2">
                  {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(revenue)}
                </h3>
                <BadgeDollarSign className="absolute right-4 top-4 h-5 w-5 text-[#C18CFF]/40" />
              </div>

              <div className="bg-[#15131F] border border-[#8C87A2]/20 rounded-2xl p-5 relative overflow-hidden shadow-sm">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C87A2] font-mono">DT tháng này</span>
                <h3 className="text-2xl sm:text-3xl font-bold text-[#F1EDF9] font-mono mt-2">
                  {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(monthRevenue)}
                </h3>
                <Activity className="absolute right-4 top-4 h-5 w-5 text-[#8C87A2]/40" />
              </div>

              <div className="bg-[#15131F] border border-[#8C87A2]/20 rounded-2xl p-5 relative overflow-hidden shadow-sm">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C87A2] font-mono">Đơn thành công</span>
                <h3 className="text-2xl sm:text-3xl font-bold text-emerald-400 font-mono mt-2">
                  {successOrders.length}
                </h3>
                <CreditCard className="absolute right-4 top-4 h-5 w-5 text-emerald-400/40" />
              </div>

              <div className="bg-[#15131F] border border-yellow-500/20 rounded-2xl p-5 relative overflow-hidden shadow-sm">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C87A2] font-mono">Chờ duyệt</span>
                <h3 className="text-2xl sm:text-3xl font-bold text-yellow-400 font-mono mt-2">
                  {pendingOrders.length}
                </h3>
                <ShieldAlert className="absolute right-4 top-4 h-5 w-5 text-yellow-400/40" />
              </div>
            </div>

            {/* Orders list */}
            <div className="rounded-2xl border border-[#8C87A2]/20 bg-[#15131F]/10 overflow-hidden">
              <div className="p-4 border-b border-[#8C87A2]/20 bg-[#15131F]/50 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[#8C87A2] font-mono">Danh sách giao dịch học viên</span>
                <div className="flex items-center gap-2">
                  <select
                    value={orderStatusFilter}
                    onChange={(e) =>
                      setOrderStatusFilter(e.target.value as typeof orderStatusFilter)
                    }
                    className="h-8 rounded-lg border border-[#8C87A2]/25 bg-[#0B0A13] px-2 text-[10px] text-[#F1EDF9] font-mono"
                  >
                    <option value="all">Tất cả</option>
                    <option value="pending">Chờ duyệt</option>
                    <option value="success">Thành công</option>
                    <option value="failed">Lỗi / Hủy</option>
                  </select>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => void fetchOrders()}
                    className="h-8 rounded-lg border border-[#8C87A2]/25 text-[#8C87A2] text-[10px]"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" /> Làm mới
                  </Button>
                  <span className="text-[10px] bg-[#0B0A13] px-2 py-0.5 rounded border border-[#8C87A2]/20 text-[#8C87A2] font-mono">
                    {filteredOrders.length}/{orders.length}
                  </span>
                </div>
              </div>

              {loadingOrders ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-[#C18CFF]" />
                  <p className="mt-2 text-xs text-[#8C87A2]">Đang tải danh sách đơn hàng...</p>
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="text-center py-20 text-sm text-[#8C87A2] italic">
                  {orders.length === 0
                    ? "Chưa có giao dịch mua khóa học nào được ghi nhận."
                    : "Không có đơn khớp bộ lọc."}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#8C87A2]/10 bg-[#0B0A13]/30 text-[#8C87A2] uppercase font-mono tracking-wider">
                        <th className="p-4 font-bold">Ngày giao dịch</th>
                        <th className="p-4 font-bold">Học viên</th>
                        <th className="p-4 font-bold">Môn học</th>
                        <th className="p-4 font-bold text-right">Số tiền</th>
                        <th className="p-4 font-bold">Nội dung Memo</th>
                        <th className="p-4 font-bold text-center">Trạng thái</th>
                        <th className="p-4 font-bold text-right">Hành động</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#8C87A2]/10 bg-[#15131F]/10">
                      {filteredOrders.map(order => {
                        const studentName = order.student?.full_name || "Học viên ẩn danh"
                        const studentEmail = order.student?.email || "unknown@student.com"
                        const subjectInfo = getOnlineSubjectInfo(order.subject_key)
                        
                        return (
                          <tr key={order.id} className="hover:bg-[#15131F]/30 transition-colors">
                            <td className="p-4 text-[#8C87A2] font-mono whitespace-nowrap">
                              {new Date(order.created_at).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })}
                            </td>
                            <td className="p-4 min-w-[150px]">
                              <p className="font-bold text-[#F1EDF9]">{studentName}</p>
                              <p className="text-[10px] text-[#8C87A2] mt-0.5">{studentEmail}</p>
                            </td>
                            <td className="p-4">
                              <span className="px-2 py-1 rounded bg-[#0B0A13] border border-[#8C87A2]/25 text-[#F1EDF9] inline-flex items-center gap-1 font-mono">
                                <span>{subjectInfo.icon}</span>
                                <span>{subjectInfo.label}</span>
                              </span>
                            </td>
                            <td className="p-4 text-right font-bold text-[#F1EDF9] font-mono">
                              {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(order.amount)}
                            </td>
                            <td className="p-4">
                              <span className="px-2 py-0.5 rounded bg-[#0B0A13] border border-[#C18CFF]/20 text-[#C18CFF] font-bold font-mono">
                                {order.memo}
                              </span>
                            </td>
                            <td className="p-4 text-center whitespace-nowrap">
                              {order.status === "success" ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono">
                                  ✓ Thành công
                                </span>
                              ) : order.status === "failed" ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full font-mono">
                                  ✗ Lỗi / Hủy
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded-full font-mono animate-pulse">
                                  ⏳ Chờ duyệt
                                </span>
                              )}
                            </td>
                            <td className="p-4 text-right">
                              {order.status === "pending" && (
                                <Button
                                  size="sm"
                                  disabled={approvingOrderId === order.id}
                                  onClick={() => {
                                    const studentName =
                                      (order.student as { full_name?: string } | null)?.full_name ||
                                      "học viên"
                                    const subj = getOnlineSubjectInfo(order.subject_key)
                                    setApproveTarget({
                                      id: order.id,
                                      label: `${studentName} · ${subj.label} · ${new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(order.amount)}`,
                                    })
                                  }}
                                  className="rounded-lg bg-emerald-500 text-[#0B0A13] hover:bg-emerald-400 text-[10px] font-bold px-3 py-1 transition-transform active:scale-95 flex items-center justify-center gap-1 ml-auto"
                                >
                                  {approvingOrderId === order.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    "Duyệt thủ công"
                                  )}
                                </Button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
          )
        })()}

        {/* Tab 5: Security logs + anomalies */}
        {activeTab === "security" && <AccessSecurityPanel />}

      </main>
      <Footer />

      {/* ── Create Student Modal ── */}
      <AnimatePresence>
        {isCreateStudentOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#0B0A13]/80 backdrop-blur-sm"
              onClick={() => setIsCreateStudentOpen(false)}
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md rounded-2xl border border-[#8C87A2]/20 bg-[#15131F] p-6 shadow-2xl z-10"
            >
              <button onClick={() => setIsCreateStudentOpen(false)} className="absolute right-4 top-4 text-[#8C87A2] hover:text-[#F1EDF9]">
                <X className="h-5 w-5" />
              </button>
              
              <h3 className="text-xl font-bold text-[#F1EDF9] mb-4 font-mono uppercase tracking-wide text-sm">
                Cấp Tài Khoản Học Viên Mới
              </h3>

              <form onSubmit={handleCreateStudentSubmit} className="space-y-4 text-left">
                <div>
                  <Label className="text-xs text-[#8C87A2] font-mono">Họ và tên học viên</Label>
                  <Input 
                    value={newStudentName}
                    onChange={(e) => setNewStudentName(e.target.value)}
                    placeholder="VD: Nguyễn Văn A"
                    className="mt-1 bg-[#0B0A13] border-[#8C87A2]/25 focus:ring-[#C18CFF] text-[#F1EDF9]"
                    required
                  />
                </div>

                <div>
                  <Label className="text-xs text-[#8C87A2] font-mono">Email đăng nhập</Label>
                  <Input 
                    type="email"
                    value={newStudentEmail}
                    onChange={(e) => setNewStudentEmail(e.target.value)}
                    placeholder="VD: nguyenvana@gmail.com"
                    className="mt-1 bg-[#0B0A13] border-[#8C87A2]/25 focus:ring-[#C18CFF] text-[#F1EDF9]"
                    required
                  />
                </div>

                <div>
                  <Label className="text-xs text-[#8C87A2] font-mono">Mật khẩu đăng nhập</Label>
                  <Input 
                    type="password"
                    value={newStudentPassword}
                    onChange={(e) => setNewStudentPassword(e.target.value)}
                    placeholder="Tối thiểu 6 ký tự"
                    className="mt-1 bg-[#0B0A13] border-[#8C87A2]/25 focus:ring-[#C18CFF] text-[#F1EDF9]"
                    minLength={6}
                    required
                  />
                </div>

                <div>
                  <Label className="text-xs text-[#8C87A2] font-mono">Lớp học (Tùy chọn)</Label>
                  <Input 
                    value={newStudentClass}
                    onChange={(e) => setNewStudentClass(e.target.value)}
                    placeholder="VD: 12A1"
                    className="mt-1 bg-[#0B0A13] border-[#8C87A2]/25 focus:ring-[#C18CFF] text-[#F1EDF9]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button type="button" variant="ghost" onClick={() => setIsCreateStudentOpen(false)} className="rounded-lg border border-[#8C87A2]/20 text-[#8C87A2]">
                    Hủy
                  </Button>
                  <Button type="submit" disabled={creatingStudent} className="rounded-lg bg-[#C18CFF] text-[#0B0A13] hover:bg-[#C18CFF]/90 font-bold px-6 flex items-center gap-1.5">
                    {creatingStudent && <Loader2 className="h-4 w-4 animate-spin" />}
                    Cấp tài khoản
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
              className="relative w-full max-w-xl rounded-2xl border border-[#8C87A2]/20 bg-[#15131F] p-6 shadow-2xl z-10"
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

                {/* Dynamic Video list */}
                <div className="space-y-2 border-t border-[#8C87A2]/10 pt-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-[#C18CFF] uppercase font-mono">Danh sách Video ({lessonVideos.length})</Label>
                    <Button 
                      type="button" 
                      onClick={() => setLessonVideos([...lessonVideos, { title: "", url: "" }])}
                      size="sm"
                      variant="ghost"
                      className="h-7 text-[10px] text-[#C18CFF] hover:bg-[#C18CFF]/10 font-bold rounded-lg border border-[#C18CFF]/20"
                    >
                      + Thêm Video
                    </Button>
                  </div>

                  <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                    {lessonVideos.map((video, idx) => (
                      <div key={idx} className="flex gap-2 items-start bg-[#0B0A13]/40 p-2 rounded-xl border border-[#8C87A2]/10">
                        <div className="flex-1 space-y-1.5 min-w-0">
                          <Input 
                            value={video.title}
                            onChange={(e) => {
                              const updated = [...lessonVideos]
                              updated[idx].title = e.target.value
                              setLessonVideos(updated)
                            }}
                            placeholder="Tiêu đề (VD: Video Lý thuyết)"
                            className="h-8 text-xs bg-[#0B0A13] border-[#8C87A2]/20 text-[#F1EDF9] focus:ring-[#C18CFF]"
                            required
                          />
                          <Input 
                            value={video.url}
                            onChange={(e) => {
                              const updated = [...lessonVideos]
                              updated[idx].url = e.target.value
                              setLessonVideos(updated)
                            }}
                            placeholder="Bunny embed/play hoặc YouTube (không dán token)"
                            className="h-8 text-xs bg-[#0B0A13] border-[#8C87A2]/20 text-[#F1EDF9] focus:ring-[#C18CFF]"
                            required
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setLessonVideos(lessonVideos.filter((_, i) => i !== idx))}
                          className="h-8 w-8 text-red-400 hover:text-red-500 hover:bg-red-500/10 shrink-0 self-center rounded-xl"
                          disabled={lessonVideos.length <= 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Dynamic Document list */}
                <div className="space-y-2 border-t border-[#8C87A2]/10 pt-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-emerald-400 uppercase font-mono">Tài liệu ôn tập ({lessonDocuments.length})</Label>
                    <Button 
                      type="button" 
                      onClick={() => setLessonDocuments([...lessonDocuments, { title: "", url: "" }])}
                      size="sm"
                      variant="ghost"
                      className="h-7 text-[10px] text-emerald-400 hover:bg-emerald-500/10 font-bold rounded-lg border border-emerald-500/20"
                    >
                      + Thêm Tài liệu
                    </Button>
                  </div>

                  <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                    {lessonDocuments.map((doc, idx) => (
                      <div key={idx} className="flex gap-2 items-start bg-[#0B0A13]/40 p-2 rounded-xl border border-[#8C87A2]/10">
                        <div className="flex-1 space-y-1.5 min-w-0">
                          <Input 
                            value={doc.title}
                            onChange={(e) => {
                              const updated = [...lessonDocuments]
                              updated[idx].title = e.target.value
                              setLessonDocuments(updated)
                            }}
                            placeholder="Tiêu đề (VD: Đề tự luyện PDF)"
                            className="h-8 text-xs bg-[#0B0A13] border-[#8C87A2]/20 text-[#F1EDF9] focus:ring-[#C18CFF]"
                            required
                          />
                          <Input 
                            value={doc.url}
                            onChange={(e) => {
                              const updated = [...lessonDocuments]
                              updated[idx].url = e.target.value
                              setLessonDocuments(updated)
                            }}
                            placeholder="Link tài liệu (Bunny PDF / Storage)"
                            className="h-8 text-xs bg-[#0B0A13] border-[#8C87A2]/20 text-[#F1EDF9] focus:ring-[#C18CFF]"
                            required
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setLessonDocuments(lessonDocuments.filter((_, i) => i !== idx))}
                          className="h-8 w-8 text-red-400 hover:text-red-500 hover:bg-red-500/10 shrink-0 self-center rounded-xl"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {lessonDocuments.length === 0 && (
                      <p className="text-[10px] text-[#8C87A2] italic text-center py-2">Không có tài liệu đính kèm.</p>
                    )}
                  </div>
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
                      const isChecked = tempSelectedSubjects.includes("all") || tempSelectedSubjects.includes(subject.value as string)
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
                            disabled={isDisabled && (subject.value as string) !== "all"}
                            onChange={() => handleToggleSubjectCheckbox(subject.value as string)}
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

      {/* ── Confirm approve order (bank transfer fallback) ── */}
      <ConfirmDialog
        isOpen={approveTarget !== null}
        onClose={() => setApproveTarget(null)}
        onConfirm={async () => {
          if (approveTarget) await handleApproveOrder(approveTarget.id)
        }}
        title="Xác nhận duyệt đơn hàng"
        description={`Mở khóa môn cho: ${approveTarget?.label || ""}. Chỉ duyệt khi đã nhận đủ tiền chuyển khoản.`}
        confirmText="Duyệt & mở khóa"
        cancelText="Hủy"
        variant="success"
      />

      {/* Mobile Folder Tree Drawer */}
      {isMobileTreeOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden bg-black/60 backdrop-blur-sm transition-all duration-300">
          <div className="w-80 max-w-[85%] bg-[#0B0A13] border-r border-[#8C87A2]/20 h-full flex flex-col p-4 shadow-2xl relative animate-in slide-in-from-left duration-300">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#8C87A2]/10">
              <span className="text-sm font-bold text-[#F1EDF9] font-mono tracking-wide">CÂY THƯ MỤC</span>
              <button 
                onClick={() => setIsMobileTreeOpen(false)} 
                className="p-1.5 rounded-lg border border-[#8C87A2]/20 text-[#8C87A2] hover:text-[#F1EDF9] hover:bg-[#15131F] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto pr-1">
              {folderTree.length === 0 ? (
                <p className="text-xs text-[#8C87A2] italic text-center py-4">Chưa có thư mục</p>
              ) : (
                <div className="space-y-0.5">
                  {folderTree.map(root => (
                    <div key={root.folder.id} onClick={() => setIsMobileTreeOpen(false)}>
                      <LeftFolderTreeNode node={root} level={0} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex-1" onClick={() => setIsMobileTreeOpen(false)} />
        </div>
      )}
    </TeacherShell>
  )
}
