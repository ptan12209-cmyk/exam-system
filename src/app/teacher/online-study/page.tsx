"use client"

import { useState, useEffect, useMemo, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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
import { cn } from "@/lib/utils"
import dynamic from "next/dynamic"
import { BunnySecurityChecklist } from "@/components/teacher/online-study/BunnySecurityChecklist"
import {
  OrdersRevenuePanel,
  type TeacherOrder,
} from "@/components/teacher/online-study/OrdersRevenuePanel"
import { PaymentSettingsPanel } from "@/components/teacher/online-study/PaymentSettingsPanel"
import { ImportLogsPanel } from "@/components/teacher/online-study/ImportLogsPanel"
import { StudentPermissionsPanel } from "@/components/teacher/online-study/StudentPermissionsPanel"
import type {
  DbFolder,
  DbLesson,
  FolderTreeNode,
  StudyTab,
} from "@/components/teacher/online-study/types"

const LazyAccessSecurityPanel = dynamic(
  () =>
    import("@/components/teacher/AccessSecurityPanel").then(
      (m) => m.AccessSecurityPanel
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex justify-center py-16 text-[var(--os-muted)] text-xs font-mono">
        Đang tải panel bảo mật…
      </div>
    ),
  }
)
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
  UserCheck,
  UserX,
  ChevronLeft,
  LayoutGrid,
  List,
  Home,
  CheckSquare,
  Square,
} from "lucide-react"

function TeacherOnlineStudyPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const { success, error: toastError } = useToast()

  // Auth & Profile
  const [profile, setProfile] = useState<{ full_name: string | null } | null>(null)
  
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<StudyTab>("lectures")
  const [orderStatusFilter, setOrderStatusFilter] = useState<"all" | "pending" | "success" | "failed">("all")

  const goTab = (tab: StudyTab) => {
    setActiveTab(tab)
    try {
      localStorage.setItem("teacher_study_tab", tab)
    } catch {
      /* ignore */
    }
    const next = new URLSearchParams(searchParams?.toString() || "")
    if (tab === "lectures") next.delete("tab")
    else next.set("tab", tab)
    const q = next.toString()
    router.replace(q ? `/teacher/online-study?${q}` : "/teacher/online-study", { scroll: false })
  }

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
  const [orders, setOrders] = useState<TeacherOrder[]>([])
  const [revenue, setRevenue] = useState(0)
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [approvingOrderId, setApprovingOrderId] = useState<string | null>(null)
  const [approveTarget, setApproveTarget] = useState<{
    ids: string[]
    label: string
    status: "success" | "failed"
  } | null>(null)
  const [bulkOrderBusy, setBulkOrderBusy] = useState(false)
  const [pendingOrderCount, setPendingOrderCount] = useState(0)
  const [anomalyCount, setAnomalyCount] = useState(0)

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
        const list = (data.data.orders || []) as TeacherOrder[]
        setOrders(list)
        setRevenue(data.data.revenue || 0)
        setPendingOrderCount(list.filter((o) => o.status === "pending").length)
      }
    } catch (err) {
      console.error(err)
      toastError("Không thể tải danh sách đơn hàng.")
    } finally {
      setLoadingOrders(false)
    }
  }

  // Prefetch badge counts (ops UX)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [ro, ra] = await Promise.all([
          fetch("/api/online-study/orders"),
          fetch("/api/online-study/access-logs?limit=1&hours=24"),
        ])
        const [do_, da] = await Promise.all([ro.json(), ra.json()])
        if (cancelled) return
        if (ro.ok && do_.success) {
          const list = (do_.data.orders || []) as TeacherOrder[]
          setPendingOrderCount(list.filter((o) => o.status === "pending").length)
          // Warm orders if user opens tab soon
          setOrders(list)
          setRevenue(do_.data.revenue || 0)
        }
        if (ra.ok && da.success) {
          setAnomalyCount(Number(da.data.anomaly_count) || 0)
        }
      } catch {
        /* ignore badge errors */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Handle manual order approve/reject (single or bulk, after confirm)
  const handleUpdateOrders = async (
    orderIds: string[],
    status: "success" | "failed"
  ) => {
    if (orderIds.length === 0) return
    const single = orderIds.length === 1
    if (single) setApprovingOrderId(orderIds[0])
    else setBulkOrderBusy(true)
    try {
      const res = await fetch("/api/online-study/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          single
            ? { orderId: orderIds[0], status }
            : { orderIds, status }
        ),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        const msg =
          data?.data?.message ||
          (status === "success"
            ? `Đã duyệt ${orderIds.length} đơn và mở khóa môn`
            : `Đã từ chối ${orderIds.length} đơn`)
        success(typeof msg === "string" ? msg : "Cập nhật đơn thành công")
        fetchOrders()
      } else {
        const msg = data?.error?.message || data?.error || "Lỗi cập nhật đơn hàng"
        throw new Error(typeof msg === "string" ? msg : "Lỗi cập nhật đơn hàng")
      }
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Cập nhật đơn hàng thất bại")
    } finally {
      setApprovingOrderId(null)
      setBulkOrderBusy(false)
      setApproveTarget(null)
    }
  }

  const orderActionLabel = (order: {
    student?: { full_name?: string | null } | null
    subject_key: string
    amount: number
  }) => {
    const studentName = order.student?.full_name || "học viên"
    const subj = getOnlineSubjectInfo(order.subject_key)
    return `${studentName} · ${subj.label} · ${new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(order.amount)}`
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

  // URL tab (?tab=orders) > localStorage > default
  useEffect(() => {
    if (typeof window === "undefined") return
    const urlTab = searchParams?.get("tab")
    const savedTab = localStorage.getItem("teacher_study_tab")
    const pick =
      urlTab === "lectures" ||
      urlTab === "permissions" ||
      urlTab === "payment" ||
      urlTab === "orders" ||
      urlTab === "security"
        ? urlTab
        : savedTab === "lectures" ||
            savedTab === "permissions" ||
            savedTab === "payment" ||
            savedTab === "orders" ||
            savedTab === "security"
          ? savedTab
          : "lectures"
    setActiveTab(pick)

    const savedSubject = localStorage.getItem("teacher_study_subject")
    if (savedSubject && ONLINE_SUBJECTS.some((s) => s.value === savedSubject)) {
      setSelectedSubject(savedSubject)
    }
    const targetSub = savedSubject || "toan"
    const savedFolder = localStorage.getItem(`teacher_folder_${targetSub}`)
    const savedExpanded = localStorage.getItem(`teacher_expanded_${targetSub}`)
    if (savedFolder) setSelectedFolderId(savedFolder)
    if (savedExpanded) {
      try {
        setExpandedFolders(JSON.parse(savedExpanded))
      } catch {
        /* ignore */
      }
    }
  }, [searchParams])

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
  const [explorerSearchScope, setExplorerSearchScope] = useState<"folder" | "subject">("folder")
  const [moveTargetFolderId, setMoveTargetFolderId] = useState<string>("")
  const [moveDialogOpen, setMoveDialogOpen] = useState(false)
  const [movingLessons, setMovingLessons] = useState(false)

  // Modals & Submitting (lectures only — permissions tab is self-contained)
  const [activeModal, setActiveModal] = useState<"folder" | "lesson" | null>(null)
  const [editingItem, setEditingItem] = useState<{ type: "folder" | "lesson"; id: string } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ type: "folder" | "lesson"; id: string; title: string } | null>(null)
  /** Bulk selection in lectures explorer */
  const [selectedFolderIds, setSelectedFolderIds] = useState<Set<string>>(new Set())
  const [selectedLessonIds, setSelectedLessonIds] = useState<Set<string>>(new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
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
  // Critical: always re-fetch lessons for the *selected folder* by folder_id.
  // Subject-wide list alone was truncated at Supabase's 1000-row default, so
  // late-imported videos (high order_index) never reached the client.
  const fetchData = async () => {
    setLoadingData(true)
    try {
      const resFolders = await fetch(`/api/online-study/folders?subject=${subjectInfo.dbValue}`)
      const dataFolders = await resFolders.json()

      if (resFolders.ok && dataFolders.success) {
        setFolders(dataFolders.data || [])
      }

      // Prefer folder-scoped load when a folder is selected (complete, small).
      // Also load subject catalog (API now paginates past 1000) for search/move.
      const lessonUrl = selectedFolderId
        ? `/api/online-study/lessons?folder_id=${encodeURIComponent(selectedFolderId)}`
        : `/api/online-study/lessons?subject=${subjectInfo.dbValue}`
      const resLessons = await fetch(lessonUrl)
      const dataLessons = await resLessons.json()

      if (resLessons.ok && dataLessons.success) {
        const folderRows: DbLesson[] = dataLessons.data || []
        if (selectedFolderId) {
          // Merge folder rows into existing subject cache so other folders stay browsable
          setLessons((prev) => {
            const byId = new Map(prev.map((l) => [l.id, l]))
            // Drop stale rows that claimed this folder but are gone
            for (const [id, row] of byId) {
              if (row.folder_id === selectedFolderId && !folderRows.some((r) => r.id === id)) {
                byId.delete(id)
              }
            }
            for (const row of folderRows) byId.set(row.id, row)
            return Array.from(byId.values())
          })
        } else {
          setLessons(folderRows)
        }
      }
    } catch (err) {
      console.error(err)
      toastError("Lỗi kết nối tải dữ liệu.")
    }
    setLoadingData(false)
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
    }
  }, [selectedSubject, activeTab])

  // Re-load lessons every time teacher clicks a folder (folder_id = complete list)
  useEffect(() => {
    if (activeTab !== "lectures" || !selectedFolderId) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(
          `/api/online-study/lessons?folder_id=${encodeURIComponent(selectedFolderId)}`
        )
        const data = await res.json()
        if (cancelled || !res.ok || !data.success) return
        const folderRows: DbLesson[] = data.data || []
        setLessons((prev) => {
          const byId = new Map(prev.map((l) => [l.id, l]))
          for (const [id, row] of byId) {
            if (row.folder_id === selectedFolderId && !folderRows.some((r) => r.id === id)) {
              byId.delete(id)
            }
          }
          for (const row of folderRows) byId.set(row.id, row)
          return Array.from(byId.values())
        })
      } catch (e) {
        console.error(e)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [selectedFolderId, activeTab])

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

    const folderSort = (a: { folder: DbFolder }, b: { folder: DbFolder }) => {
      if (a.folder.order_index !== b.folder.order_index) {
        return a.folder.order_index - b.folder.order_index
      }
      // Tie-break: natural Vietnamese/numeric name (1 < 2 < 10) — fixes legacy depth-based order_index
      return String(a.folder.name || '').localeCompare(String(b.folder.name || ''), 'vi', {
        numeric: true,
        sensitivity: 'base',
      })
    }
    map.forEach(node => {
      node.children.sort(folderSort)
    })

    roots.sort(folderSort)
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
    const q = explorerSearch.trim().toLowerCase()
    const list =
      q && explorerSearchScope === "folder"
        ? filtered.filter((f) => f.name.toLowerCase().includes(q))
        : filtered
    return list.sort((a, b) => {
      if (a.order_index !== b.order_index) return a.order_index - b.order_index
      return String(a.name || '').localeCompare(String(b.name || ''), 'vi', {
        numeric: true,
        sensitivity: 'base',
      })
    })
  }, [folders, selectedFolderId, explorerSearch, explorerSearchScope])

  const currentLessons = useMemo(() => {
    const filtered = lessons.filter(l => l.folder_id === selectedFolderId)
    const q = explorerSearch.trim().toLowerCase()
    const list =
      q && explorerSearchScope === "folder"
        ? filtered.filter((l) => l.title.toLowerCase().includes(q))
        : filtered
    return list.sort((a, b) => {
      if (a.order_index !== b.order_index) return a.order_index - b.order_index
      return String(a.title || '').localeCompare(String(b.title || ''), 'vi', {
        numeric: true,
        sensitivity: 'base',
      })
    })
  }, [lessons, selectedFolderId, explorerSearch, explorerSearchScope])

  const subjectExplorerHits = useMemo(() => {
    const q = explorerSearch.trim().toLowerCase()
    if (!q || explorerSearchScope !== "subject") {
      return { folders: [] as DbFolder[], lessons: [] as DbLesson[] }
    }
    return {
      folders: folders.filter((f) => f.name.toLowerCase().includes(q)).slice(0, 40),
      lessons: lessons.filter((l) => l.title.toLowerCase().includes(q)).slice(0, 60),
    }
  }, [explorerSearch, explorerSearchScope, folders, lessons])

  const folderOptions = useMemo(() => {
    // Flat list with indent depth for move/select
    const byParent = new Map<string | null, DbFolder[]>()
    for (const f of folders) {
      const key = f.parent_id
      if (!byParent.has(key)) byParent.set(key, [])
      byParent.get(key)!.push(f)
    }
    for (const list of byParent.values()) {
      list.sort((a, b) => a.order_index - b.order_index || a.name.localeCompare(b.name, "vi"))
    }
    const out: Array<{ id: string; label: string }> = [{ id: "", label: "— Gốc (chọn folder con) —" }]
    const walk = (parent: string | null, depth: number) => {
      const kids = byParent.get(parent) || []
      for (const k of kids) {
        out.push({ id: k.id, label: `${"—".repeat(depth)} ${k.name}`.trim() })
        walk(k.id, depth + 1)
      }
    }
    walk(null, 0)
    // Fix root option: lessons need a real folder_id. Use first real folder as empty invalid.
    return out.filter((o) => o.id !== "")
  }, [folders])

  const executeBulkMoveLessons = async () => {
    if (selectedLessonIds.size === 0 || !moveTargetFolderId) {
      toastError("Chọn ít nhất một bài và thư mục đích.")
      return
    }
    setMovingLessons(true)
    try {
      const res = await fetch("/api/online-study/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "move",
          ids: Array.from(selectedLessonIds),
          folder_id: moveTargetFolderId,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data?.error?.message || data?.error || "Chuyển bài thất bại")
      }
      success(`Đã chuyển ${selectedLessonIds.size} bài sang thư mục mới`)
      setMoveDialogOpen(false)
      setSelectedLessonIds(new Set())
      await fetchData()
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Chuyển bài thất bại")
    } finally {
      setMovingLessons(false)
    }
  }

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

  // Handle Delete execution (single)
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
      success("Xóa đối tượng thành công")
      setSelectedFolderIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      setSelectedLessonIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      await fetchData()
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Lỗi xảy ra")
    }
  }

  const clearSelection = () => {
    setSelectedFolderIds(new Set())
    setSelectedLessonIds(new Set())
  }

  const toggleFolderSelect = (id: string) => {
    setSelectedFolderIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleLessonSelect = (id: string) => {
    setSelectedLessonIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAllInView = () => {
    setSelectedFolderIds(new Set(currentSubFolders.map((f) => f.id)))
    setSelectedLessonIds(new Set(currentLessons.map((l) => l.id)))
  }

  const selectedCount = selectedFolderIds.size + selectedLessonIds.size

  const executeBulkDelete = async () => {
    if (selectedCount === 0) return
    setBulkDeleting(true)
    try {
      const folderIds = Array.from(selectedFolderIds)
      const lessonIds = Array.from(selectedLessonIds)
      const results: string[] = []

      // Folders first (CASCADE removes nested lessons/subfolders)
      if (folderIds.length > 0) {
        const res = await fetch("/api/online-study/folders", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: folderIds }),
        })
        const data = await res.json()
        if (!res.ok) {
          throw new Error(
            data?.error?.message || data?.error || "Không thể xóa thư mục"
          )
        }
        results.push(`${folderIds.length} thư mục`)
      }

      if (lessonIds.length > 0) {
        const res = await fetch("/api/online-study/lessons", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: lessonIds }),
        })
        const data = await res.json()
        if (!res.ok) {
          throw new Error(
            data?.error?.message || data?.error || "Không thể xóa bài giảng"
          )
        }
        results.push(`${lessonIds.length} bài giảng`)
      }

      success(`Đã xóa hàng loạt: ${results.join(", ")}`)
      clearSelection()
      await fetchData()
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Xóa hàng loạt thất bại")
    } finally {
      setBulkDeleting(false)
      setBulkDeleteOpen(false)
    }
  }

  // Clear multi-select when navigating folder/subject
  useEffect(() => {
    clearSelection()
  }, [selectedFolderId, selectedSubject])

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
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
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
              ? "bg-[var(--os-accent)]/15 text-[var(--os-accent)] font-bold" 
              : "hover:bg-[var(--os-card)]/50 text-[var(--os-muted)] hover:text-[var(--os-fg)]"
          }`}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <span 
              onClick={(e) => toggleFolderExpand(node.folder.id, e)}
              className="p-0.5 rounded hover:bg-[var(--os-bg)] shrink-0 text-[var(--os-muted)]"
            >
              {hasSubfolders ? (
                isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />
              ) : (
                <span className="w-3 block" />
              )}
            </span>
            <span className={isSelected ? "text-[var(--os-accent)]" : "text-[var(--os-muted)]"}>
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
      <header className="fixed top-0 z-50 flex h-16 w-full items-center justify-between border-b border-[var(--os-muted)]/20 bg-[var(--os-bg)]/85 px-4 backdrop-blur-xl lg:hidden safe-top">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-[var(--os-accent)]" />
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
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[var(--os-muted)]/40 px-3 py-1 text-[10px] font-semibold text-[var(--os-muted)] uppercase tracking-widest font-mono">
              <Shield className="h-3.5 w-3.5 text-[var(--os-accent)]" /> Admin control panel
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
                className="rounded-xl border border-[var(--os-muted)]/30 bg-[var(--os-card)] text-xs font-bold text-[var(--os-fg)] hover:bg-[var(--os-card)]/80 flex items-center gap-1.5 transition-transform active:scale-95"
              >
                <FolderPlus className="h-4 w-4 text-[var(--os-accent)]" /> + Thư mục con
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
                  className="rounded-xl bg-[var(--os-accent)] text-[var(--os-accent-fg)] hover:bg-[var(--os-accent)]/90 text-xs font-bold flex items-center gap-1.5 transition-transform active:scale-95"
                >
                  <FilePlus2 className="h-4 w-4" /> + Thêm Bài học
                </Button>
              )}
            </div>
          )}
        </section>

        <BunnySecurityChecklist />

        {/* Tabs: mobile select + desktop bar with badges */}
        <div className="mb-6">
          <label className="sr-only" htmlFor="teacher-os-tab">
            Chọn tab quản trị
          </label>
          <select
            id="teacher-os-tab"
            value={activeTab}
            onChange={(e) => goTab(e.target.value as StudyTab)}
            className="w-full sm:hidden h-11 rounded-xl border border-[var(--os-muted)]/25 bg-[var(--os-card)] px-3 text-sm text-[var(--os-fg)] mb-3"
          >
            <option value="lectures">Bài giảng (Drive)</option>
            <option value="permissions">Cấp quyền HV</option>
            <option value="payment">Thanh toán & giá</option>
            <option value="orders">
              Đơn hàng{pendingOrderCount > 0 ? ` (${pendingOrderCount} chờ)` : ""}
            </option>
            <option value="security">
              Bảo mật{anomalyCount > 0 ? ` (${anomalyCount} cảnh báo)` : ""}
            </option>
          </select>

          <div
            className="hidden sm:flex gap-1 border-b border-[var(--os-muted)]/20 pb-px overflow-x-auto"
            role="tablist"
            aria-label="Quản trị học online"
          >
            {(
              [
                { id: "lectures" as const, label: "Bài giảng (Drive)" },
                { id: "permissions" as const, label: "Cấp quyền HV" },
                { id: "payment" as const, label: "Thanh toán & giá" },
                {
                  id: "orders" as const,
                  label: "Đơn hàng",
                  badge: pendingOrderCount,
                  badgeClass: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
                },
                {
                  id: "security" as const,
                  label: "Bảo mật",
                  badge: anomalyCount,
                  badgeClass: "bg-red-500/20 text-red-300 border-red-500/30",
                },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => goTab(tab.id)}
                className={`pb-3 px-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap inline-flex items-center gap-1.5 min-h-[44px] ${
                  activeTab === tab.id
                    ? "border-[var(--os-accent)] text-[var(--os-accent)]"
                    : "border-transparent text-[var(--os-muted)] hover:text-[var(--os-fg)]"
                }`}
              >
                {tab.label}
                {"badge" in tab && tab.badge > 0 && (
                  <span
                    className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full border ${tab.badgeClass}`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab 1: Lectures Manager */}
        {activeTab === "lectures" && (
          <div className="space-y-4">
            
            {/* Drive-style toolbar (full width, no side tree) */}
            <div className="flex flex-col gap-3 rounded-2xl border border-[var(--os-muted)]/20 bg-[var(--os-card)] p-4 sm:p-5 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between">
                
                {/* Subject Selector */}
                <div className="flex items-center gap-2 w-full sm:w-72 shrink-0">
                  <select
                    value={selectedSubject}
                    onChange={(e) => {
                      setSelectedSubject(e.target.value)
                      setSelectedFolderId(null)
                    }}
                    className="w-full rounded-xl border border-[var(--os-muted)]/25 bg-[var(--os-bg)] px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--os-accent)] text-[var(--os-fg)] h-11"
                  >
                    {ONLINE_SUBJECTS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.icon} {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Local / subject search */}
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:flex-1 sm:max-w-xl">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--os-muted)]" />
                    <input
                      value={explorerSearch}
                      onChange={(e) => setExplorerSearch(e.target.value)}
                      placeholder={
                        explorerSearchScope === "subject"
                          ? "Tìm trong cả môn..."
                          : "Tìm trong thư mục hiện tại..."
                      }
                      className="w-full rounded-xl border border-[var(--os-muted)]/25 bg-[var(--os-bg)] pl-9 pr-4 py-2.5 text-sm text-[var(--os-fg)] placeholder-[var(--os-muted)] outline-none focus:ring-1 focus:ring-[var(--os-accent)] h-11"
                    />
                  </div>
                  <div className="flex rounded-xl border border-[var(--os-border)] bg-[var(--os-bg)] p-1 h-11">
                    <button
                      type="button"
                      onClick={() => setExplorerSearchScope("folder")}
                      className={cn(
                        "px-2.5 rounded-lg text-[10px] font-bold",
                        explorerSearchScope === "folder"
                          ? "bg-[var(--os-accent)]/15 text-[var(--os-accent)]"
                          : "text-[var(--os-muted)]"
                      )}
                    >
                      Thư mục
                    </button>
                    <button
                      type="button"
                      onClick={() => setExplorerSearchScope("subject")}
                      className={cn(
                        "px-2.5 rounded-lg text-[10px] font-bold",
                        explorerSearchScope === "subject"
                          ? "bg-[var(--os-accent)]/15 text-[var(--os-accent)]"
                          : "text-[var(--os-muted)]"
                      )}
                    >
                      Cả môn
                    </button>
                  </div>
                </div>

                {/* View Mode selection */}
                <div className="flex items-center gap-1 shrink-0 bg-[var(--os-bg)] p-1 rounded-lg border border-[var(--os-muted)]/20 self-end sm:self-auto">
                  <button 
                    onClick={() => setViewMode("grid")}
                    className={`p-1.5 rounded transition-colors ${viewMode === "grid" ? "bg-[var(--os-accent)]/15 text-[var(--os-accent)]" : "text-[var(--os-muted)]"}`}
                    title="Dạng lưới"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => setViewMode("list")}
                    className={`p-1.5 rounded transition-colors ${viewMode === "list" ? "bg-[var(--os-accent)]/15 text-[var(--os-accent)]" : "text-[var(--os-muted)]"}`}
                    title="Dạng danh sách"
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>

              </div>

              {/* Drive breadcrumb path */}
              <div className="flex items-center gap-1 bg-[var(--os-bg)] border border-[var(--os-muted)]/20 rounded-xl px-2 sm:px-3 py-2 overflow-x-auto text-sm scrollbar-none">
                {selectedFolderId && (
                  <button
                    onClick={() => {
                      const currentFolder = folders.find(f => f.id === selectedFolderId)
                      setSelectedFolderId(currentFolder ? currentFolder.parent_id : null)
                    }}
                    className="mr-1 p-2 rounded-lg hover:bg-[var(--os-card)] text-[var(--os-accent)] shrink-0"
                    title="Lên một cấp"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                )}

                <button
                  onClick={() => setSelectedFolderId(null)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg shrink-0 font-semibold text-xs sm:text-sm ${!selectedFolderId ? "bg-[var(--os-accent)]/15 text-[var(--os-accent)]" : "text-[var(--os-muted)] hover:text-[var(--os-fg)] hover:bg-[var(--os-card)]"}`}
                >
                  <Home className="h-4 w-4" /> Gốc
                </button>

                {breadcrumbs.map((crumb, idx) => (
                  <div key={crumb.id} className="flex items-center gap-1 shrink-0 text-[var(--os-muted)]">
                    <ChevronRight className="h-4 w-4 opacity-50" />
                    <button
                      onClick={() => setSelectedFolderId(crumb.id)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold max-w-[180px] truncate ${idx === breadcrumbs.length - 1 ? "bg-[var(--os-accent)]/15 text-[var(--os-accent)]" : "hover:text-[var(--os-fg)] hover:bg-[var(--os-card)]"}`}
                    >
                      {crumb.name}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Full-page drive canvas (no side tree) */}
            <div className="w-full">
              <section className="bg-[var(--os-card)]/50 border border-[var(--os-muted)]/20 rounded-2xl p-4 sm:p-6 min-h-[60vh] flex flex-col">

                {/* Bulk selection toolbar */}
                {!loadingData && (currentSubFolders.length > 0 || currentLessons.length > 0) && (
                  <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-[var(--os-border)] bg-[var(--os-bg)]/50 px-3 py-2.5">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--os-muted)]">
                      <button
                        type="button"
                        onClick={selectAllInView}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--os-border)] px-2.5 py-1.5 font-semibold text-[var(--os-fg)] hover:border-[var(--os-accent)]/40 hover:text-[var(--os-accent)]"
                      >
                        <CheckSquare className="h-3.5 w-3.5" />
                        Chọn tất cả trong thư mục
                      </button>
                      {selectedCount > 0 && (
                        <button
                          type="button"
                          onClick={clearSelection}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--os-border)] px-2.5 py-1.5 hover:text-[var(--os-fg)]"
                        >
                          <Square className="h-3.5 w-3.5" />
                          Bỏ chọn
                        </button>
                      )}
                      <span className="font-mono tabular-nums">
                        Đã chọn:{" "}
                        <strong className="text-[var(--os-accent)]">{selectedCount}</strong>
                        {selectedFolderIds.size > 0 && (
                          <span className="ml-1">({selectedFolderIds.size} thư mục</span>
                        )}
                        {selectedLessonIds.size > 0 && (
                          <span>
                            {selectedFolderIds.size > 0 ? ", " : " ("}
                            {selectedLessonIds.size} bài
                          </span>
                        )}
                        {selectedCount > 0 && ")"}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        disabled={selectedLessonIds.size === 0 || movingLessons}
                        onClick={() => {
                          setMoveTargetFolderId(folderOptions[0]?.id || "")
                          setMoveDialogOpen(true)
                        }}
                        className="rounded-xl border border-[var(--os-border)] bg-[var(--os-card)] text-[var(--os-fg)] text-xs font-bold h-9 disabled:opacity-40"
                      >
                        Chuyển bài ({selectedLessonIds.size})
                      </Button>
                      <Button
                        type="button"
                        disabled={selectedCount === 0 || bulkDeleting}
                        onClick={() => setBulkDeleteOpen(true)}
                        className="rounded-xl bg-red-600 hover:bg-red-600/90 text-white text-xs font-bold h-9 disabled:opacity-40"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                        Xóa hàng loạt
                        {selectedCount > 0 ? ` (${selectedCount})` : ""}
                      </Button>
                    </div>
                  </div>
                )}
                
                {loadingData ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-24">
                    <Loader2 className="h-10 w-10 animate-spin text-[var(--os-accent)]" />
                    <p className="mt-3 text-xs text-[var(--os-muted)]">Đang đọc dữ liệu thư mục...</p>
                  </div>
                ) : currentSubFolders.length === 0 && currentLessons.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-20">
                    <FolderOpenIcon className="h-16 w-16 text-[var(--os-muted)]/30 mb-4" />
                    <h4 className="text-base font-bold text-[var(--os-fg)]">Thư mục trống</h4>
                    <p className="text-sm text-[var(--os-muted)] max-w-sm mt-2">
                      Thêm thư mục con hoặc bài học bằng nút góc trên. Điều hướng bằng thanh đường dẫn như Google Drive.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-8 flex-1">
                    
                    {/* Subfolders list */}
                    {currentSubFolders.length > 0 && (
                      <div>
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-[var(--os-muted)] font-mono mb-4">Thư mục ({currentSubFolders.length})</h4>
                        
                        {viewMode === "grid" ? (
                          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
                            {currentSubFolders.map(folder => {
                              const checked = selectedFolderIds.has(folder.id)
                              return (
                              <div
                                key={folder.id}
                                onDoubleClick={() => setSelectedFolderId(folder.id)}
                                onClick={() => setSelectedFolderId(folder.id)}
                                className={cn(
                                  "group relative p-4 bg-[var(--os-bg)]/60 hover:bg-[var(--os-bg)] border rounded-2xl flex flex-col justify-between min-h-[128px] cursor-pointer select-none transition-all duration-200",
                                  checked
                                    ? "border-[var(--os-accent)] ring-1 ring-[var(--os-accent)]/40"
                                    : "border-[var(--os-muted)]/15 hover:border-[var(--os-accent)]"
                                )}
                              >
                                <div className="flex justify-between items-start">
                                  <div className="flex items-start gap-2">
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); toggleFolderSelect(folder.id) }}
                                      className="mt-0.5 p-0.5 rounded text-[var(--os-muted)] hover:text-[var(--os-accent)]"
                                      title={checked ? "Bỏ chọn" : "Chọn để xóa"}
                                      aria-label={checked ? "Bỏ chọn thư mục" : "Chọn thư mục"}
                                    >
                                      {checked ? (
                                        <CheckSquare className="h-4 w-4 text-[var(--os-accent)]" />
                                      ) : (
                                        <Square className="h-4 w-4" />
                                      )}
                                    </button>
                                    <FolderIcon className="h-10 w-10 text-[var(--os-accent)]" />
                                  </div>
                                  <div className="flex gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); openEditFolder(folder); }}
                                      className="p-1.5 rounded-lg bg-[var(--os-card)] text-[var(--os-muted)] hover:text-[var(--os-accent)] border border-[var(--os-muted)]/20"
                                      title="Sửa tên"
                                    >
                                      <Edit3 className="h-3.5 w-3.5" />
                                    </button>
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: "folder", id: folder.id, title: folder.name }); }}
                                      className="p-1.5 rounded-lg bg-[var(--os-card)] text-red-400 hover:text-red-500 border border-[var(--os-muted)]/20"
                                      title="Xóa"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                                <div className="min-w-0 mt-2">
                                  <h5 className="font-bold text-sm text-[var(--os-fg)] line-clamp-2 leading-snug">{folder.name}</h5>
                                </div>
                              </div>
                              )
                            })}
                          </div>
                        ) : (
                          <div className="border border-[var(--os-muted)]/15 rounded-xl overflow-hidden divide-y divide-[var(--os-muted)]/10 bg-[var(--os-card)]/10">
                            {currentSubFolders.map(folder => {
                              const checked = selectedFolderIds.has(folder.id)
                              return (
                              <div
                                key={folder.id}
                                onClick={() => setSelectedFolderId(folder.id)}
                                className={cn(
                                  "group flex items-center justify-between p-3 cursor-pointer hover:bg-[var(--os-card)]/50 transition-colors",
                                  checked && "bg-[var(--os-accent)]/5"
                                )}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); toggleFolderSelect(folder.id) }}
                                    className="shrink-0 p-0.5 text-[var(--os-muted)] hover:text-[var(--os-accent)]"
                                    aria-label={checked ? "Bỏ chọn thư mục" : "Chọn thư mục"}
                                  >
                                    {checked ? (
                                      <CheckSquare className="h-4 w-4 text-[var(--os-accent)]" />
                                    ) : (
                                      <Square className="h-4 w-4" />
                                    )}
                                  </button>
                                  <FolderIcon className="h-4.5 w-4.5 text-[var(--os-accent)] shrink-0" />
                                  <span className="text-xs font-semibold text-[var(--os-fg)] truncate">{folder.name}</span>
                                  <span className="text-[9px] font-mono text-[var(--os-muted)]">Thứ tự: {folder.order_index}</span>
                                </div>
                                <div className="flex gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={(e) => { e.stopPropagation(); openEditFolder(folder); }}
                                    className="h-7 w-7 rounded-lg border border-[var(--os-muted)]/20 p-1 hover:bg-[var(--os-bg)]"
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
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Lessons list */}
                    {currentLessons.length > 0 && (
                      <div>
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-[var(--os-muted)] font-mono mb-4">Bài giảng ({currentLessons.length})</h4>
                        
                        {viewMode === "grid" ? (
                          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {currentLessons.map(lesson => {
                              const checked = selectedLessonIds.has(lesson.id)
                              return (
                              <div
                                key={lesson.id}
                                className={cn(
                                  "group relative p-5 bg-[var(--os-bg)]/50 hover:bg-[var(--os-bg)] border rounded-2xl flex flex-col justify-between min-h-[140px] transition-all duration-200",
                                  checked
                                    ? "border-[var(--os-accent)] ring-1 ring-[var(--os-accent)]/40"
                                    : "border-[var(--os-muted)]/15 hover:border-[var(--os-accent)]/50"
                                )}
                              >
                                <div className="flex justify-between items-start">
                                  <div className="flex items-start gap-2">
                                    <button
                                      type="button"
                                      onClick={() => toggleLessonSelect(lesson.id)}
                                      className="mt-0.5 p-0.5 rounded text-[var(--os-muted)] hover:text-[var(--os-accent)]"
                                      title={checked ? "Bỏ chọn" : "Chọn để xóa"}
                                      aria-label={checked ? "Bỏ chọn bài giảng" : "Chọn bài giảng"}
                                    >
                                      {checked ? (
                                        <CheckSquare className="h-4 w-4 text-[var(--os-accent)]" />
                                      ) : (
                                        <Square className="h-4 w-4" />
                                      )}
                                    </button>
                                    <PlayCircle className="h-9 w-9 text-[var(--os-muted)] group-hover:text-[var(--os-accent)] transition-colors" />
                                  </div>
                                  <div className="flex gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                      onClick={() => openEditLesson(lesson)}
                                      className="p-1.5 rounded-lg bg-[var(--os-card)] text-[var(--os-muted)] hover:text-[var(--os-accent)] border border-[var(--os-muted)]/20"
                                      title="Sửa bài giảng"
                                    >
                                      <Edit3 className="h-3.5 w-3.5" />
                                    </button>
                                    <button 
                                      onClick={() => setDeleteTarget({ type: "lesson", id: lesson.id, title: lesson.title })}
                                      className="p-1.5 rounded-lg bg-[var(--os-card)] text-red-400 hover:text-red-500 border border-[var(--os-muted)]/20"
                                      title="Xóa"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>

                                <div className="min-w-0 mt-3">
                                  <h5 className="font-bold text-sm text-[var(--os-fg)] line-clamp-2 leading-snug">{lesson.title}</h5>
                                  <div className="flex gap-2 mt-2 flex-wrap">
                                    {(lesson.video_url || (lesson.videos && lesson.videos.length > 0)) && <span className="text-[10px] uppercase font-bold text-[var(--os-accent)] bg-[var(--os-accent)]/10 px-2 py-0.5 rounded-md">Video</span>}
                                    {(lesson.document_url || (lesson.documents && lesson.documents.length > 0)) && <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">Tài liệu</span>}
                                  </div>
                                </div>
                              </div>
                              )
                            })}
                          </div>
                        ) : (
                          <div className="border border-[var(--os-muted)]/10 rounded-xl overflow-hidden divide-y divide-[var(--os-muted)]/10 bg-[var(--os-bg)]/10">
                            {currentLessons.map(lesson => {
                              const checked = selectedLessonIds.has(lesson.id)
                              return (
                              <div
                                key={lesson.id}
                                className={cn(
                                  "group flex items-center justify-between p-3 hover:bg-[var(--os-bg)]/30 transition-colors",
                                  checked && "bg-[var(--os-accent)]/5"
                                )}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <button
                                    type="button"
                                    onClick={() => toggleLessonSelect(lesson.id)}
                                    className="shrink-0 p-0.5 text-[var(--os-muted)] hover:text-[var(--os-accent)]"
                                    aria-label={checked ? "Bỏ chọn bài giảng" : "Chọn bài giảng"}
                                  >
                                    {checked ? (
                                      <CheckSquare className="h-4 w-4 text-[var(--os-accent)]" />
                                    ) : (
                                      <Square className="h-4 w-4" />
                                    )}
                                  </button>
                                  <PlayCircle className="h-4.5 w-4.5 text-[var(--os-muted)] shrink-0" />
                                  <span className="text-xs font-semibold text-[var(--os-fg)] truncate">{lesson.title}</span>
                                  <span className="text-[9px] font-mono text-[var(--os-muted)]">Bài: {lesson.order_index}</span>
                                  <div className="flex gap-1.5 shrink-0">
                                    {lesson.video_url && <Video className="h-3 w-3 text-[var(--os-accent)]" />}
                                    {lesson.document_url && <FileText className="h-3 w-3 text-emerald-400" />}
                                  </div>
                                </div>
                                <div className="flex gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => openEditLesson(lesson)}
                                    className="h-7 w-7 rounded-lg border border-[var(--os-muted)]/20 p-1 hover:bg-[var(--os-card)]"
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
                              )
                            })}
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

        {/* Tab 2: Permission Manager */}
        <StudentPermissionsPanel active={activeTab === "permissions"} />

        {activeTab === "payment" && (
          <PaymentSettingsPanel
            bankId={bankId}
            accountNo={accountNo}
            accountName={accountName}
            subjectPrices={subjectPrices}
            saving={savingSettings}
            onBankIdChange={setBankId}
            onAccountNoChange={setAccountNo}
            onAccountNameChange={setAccountName}
            onPriceChange={handlePriceChange}
            onSubmit={handleSavePaymentSettings}
          />
        )}

        {/* Tab 4: Orders & Revenue */}
        {activeTab === "orders" && (
          <OrdersRevenuePanel
            orders={orders}
            revenue={revenue}
            loading={loadingOrders}
            statusFilter={orderStatusFilter}
            onStatusFilterChange={setOrderStatusFilter}
            onRefresh={() => void fetchOrders()}
            approvingOrderId={approvingOrderId}
            bulkBusy={bulkOrderBusy}
            onRequestApprove={(order) => {
              setApproveTarget({
                ids: [order.id],
                label: orderActionLabel(order),
                status: "success",
              })
            }}
            onRequestReject={(order) => {
              setApproveTarget({
                ids: [order.id],
                label: orderActionLabel(order),
                status: "failed",
              })
            }}
            onBulkApprove={(list) => {
              setApproveTarget({
                ids: list.map((o) => o.id),
                label: `${list.length} đơn chờ duyệt`,
                status: "success",
              })
            }}
            onBulkReject={(list) => {
              setApproveTarget({
                ids: list.map((o) => o.id),
                label: `${list.length} đơn chờ duyệt`,
                status: "failed",
              })
            }}
          />
        )}

        {/* Tab 5: Security + import logs */}
        {activeTab === "security" && (
          <div className="space-y-8">
            <LazyAccessSecurityPanel />
            <ImportLogsPanel />
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
              className="absolute inset-0 bg-[var(--os-bg)]/80 backdrop-blur-sm"
              onClick={closeModal}
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md rounded-2xl border border-[var(--os-muted)]/20 bg-[var(--os-card)] p-6 shadow-2xl z-10"
            >
              <button onClick={closeModal} className="absolute right-4 top-4 text-[var(--os-muted)] hover:text-[var(--os-fg)]">
                <X className="h-5 w-5" />
              </button>
              
              <h3 className="text-xl font-bold text-[var(--os-fg)] mb-4">
                {editingItem ? "Sửa Thư Mục" : folderParentId ? "Thêm Thư Mục Con" : "Tạo Thư Mục Gốc"}
              </h3>

              <form onSubmit={handleFolderSubmit} className="space-y-4">
                <div>
                  <Label className="text-xs text-[var(--os-muted)] font-mono">Tên thư mục</Label>
                  <Input 
                    value={folderName}
                    onChange={(e) => setFolderName(e.target.value)}
                    placeholder="VD: Chương 1: Đạo hàm"
                    className="mt-1 bg-[var(--os-bg)] border-[var(--os-muted)]/25 focus:ring-[var(--os-accent)] text-[var(--os-fg)]"
                    required
                  />
                </div>

                <div>
                  <Label className="text-xs text-[var(--os-muted)] font-mono">Thứ tự sắp xếp (Order Index)</Label>
                  <Input 
                    type="number"
                    value={folderOrder}
                    onChange={(e) => setFolderOrder(Number(e.target.value))}
                    className="mt-1 bg-[var(--os-bg)] border-[var(--os-muted)]/25 focus:ring-[var(--os-accent)] text-[var(--os-fg)]"
                    min={1}
                    required
                  />
                </div>

                {formError && <p className="text-xs text-red-500 mt-2">{formError}</p>}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button type="button" variant="ghost" onClick={closeModal} className="rounded-lg border border-[var(--os-muted)]/20 text-[var(--os-muted)]">
                    Hủy
                  </Button>
                  <Button type="submit" disabled={submitting} className="rounded-lg bg-[var(--os-accent)] text-[var(--os-accent-fg)] hover:bg-[var(--os-accent)]/90 font-bold px-6">
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
              className="absolute inset-0 bg-[var(--os-bg)]/80 backdrop-blur-sm"
              onClick={closeModal}
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-xl rounded-2xl border border-[var(--os-muted)]/20 bg-[var(--os-card)] p-6 shadow-2xl z-10"
            >
              <button onClick={closeModal} className="absolute right-4 top-4 text-[var(--os-muted)] hover:text-[var(--os-fg)]">
                <X className="h-5 w-5" />
              </button>
              
              <h3 className="text-xl font-bold text-[var(--os-fg)] mb-4">
                {editingItem ? "Chỉnh sửa bài giảng" : "Thêm bài giảng mới"}
              </h3>

              <form onSubmit={handleLessonSubmit} className="space-y-4">
                <div>
                  <Label className="text-xs text-[var(--os-muted)] font-mono">Tiêu đề bài giảng</Label>
                  <Input 
                    value={lessonTitle}
                    onChange={(e) => setLessonTitle(e.target.value)}
                    placeholder="VD: Bài 1: Lý thuyết đạo hàm căn bản"
                    className="mt-1 bg-[var(--os-bg)] border-[var(--os-muted)]/25 focus:ring-[var(--os-accent)] text-[var(--os-fg)]"
                    required
                  />
                </div>

                <div>
                  <Label className="text-xs text-[var(--os-muted)] font-mono">Thư mục chứa</Label>
                  <select
                    value={targetFolderId || ""}
                    onChange={(e) => setTargetFolderId(e.target.value)}
                    className="mt-1 w-full h-10 rounded-lg border border-[var(--os-muted)]/25 bg-[var(--os-bg)] px-3 text-sm text-[var(--os-fg)]"
                    required
                  >
                    {folderOptions.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-[10px] text-[var(--os-muted)]">
                    Đổi thư mục để chuyển bài (move) khi lưu.
                  </p>
                </div>

                <div>
                  <Label className="text-xs text-[var(--os-muted)] font-mono">Mô tả bài giảng (Không bắt buộc)</Label>
                  <textarea 
                    value={lessonDesc}
                    onChange={(e) => setLessonDesc(e.target.value)}
                    placeholder="Nhập nội dung mô tả, yêu cầu tự học của bài giảng..."
                    rows={3}
                    className="w-full rounded-lg border border-[var(--os-muted)]/25 bg-[var(--os-bg)] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--os-accent)] text-[var(--os-fg)] mt-1"
                  />
                </div>

                {/* Dynamic Video list */}
                <div className="space-y-2 border-t border-[var(--os-muted)]/10 pt-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-[var(--os-accent)] uppercase font-mono">Danh sách Video ({lessonVideos.length})</Label>
                    <Button 
                      type="button" 
                      onClick={() => setLessonVideos([...lessonVideos, { title: "", url: "" }])}
                      size="sm"
                      variant="ghost"
                      className="h-7 text-[10px] text-[var(--os-accent)] hover:bg-[var(--os-accent)]/10 font-bold rounded-lg border border-[var(--os-accent)]/20"
                    >
                      + Thêm Video
                    </Button>
                  </div>

                  <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                    {lessonVideos.map((video, idx) => (
                      <div key={idx} className="flex gap-2 items-start bg-[var(--os-bg)]/40 p-2 rounded-xl border border-[var(--os-muted)]/10">
                        <div className="flex-1 space-y-1.5 min-w-0">
                          <Input 
                            value={video.title}
                            onChange={(e) => {
                              const updated = [...lessonVideos]
                              updated[idx].title = e.target.value
                              setLessonVideos(updated)
                            }}
                            placeholder="Tiêu đề (VD: Video Lý thuyết)"
                            className="h-8 text-xs bg-[var(--os-bg)] border-[var(--os-muted)]/20 text-[var(--os-fg)] focus:ring-[var(--os-accent)]"
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
                            className="h-8 text-xs bg-[var(--os-bg)] border-[var(--os-muted)]/20 text-[var(--os-fg)] focus:ring-[var(--os-accent)]"
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
                <div className="space-y-2 border-t border-[var(--os-muted)]/10 pt-3">
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
                      <div key={idx} className="flex gap-2 items-start bg-[var(--os-bg)]/40 p-2 rounded-xl border border-[var(--os-muted)]/10">
                        <div className="flex-1 space-y-1.5 min-w-0">
                          <Input 
                            value={doc.title}
                            onChange={(e) => {
                              const updated = [...lessonDocuments]
                              updated[idx].title = e.target.value
                              setLessonDocuments(updated)
                            }}
                            placeholder="Tiêu đề (VD: Đề tự luyện PDF)"
                            className="h-8 text-xs bg-[var(--os-bg)] border-[var(--os-muted)]/20 text-[var(--os-fg)] focus:ring-[var(--os-accent)]"
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
                            className="h-8 text-xs bg-[var(--os-bg)] border-[var(--os-muted)]/20 text-[var(--os-fg)] focus:ring-[var(--os-accent)]"
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
                      <p className="text-[10px] text-[var(--os-muted)] italic text-center py-2">Không có tài liệu đính kèm.</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-[var(--os-muted)] font-mono">Thứ tự bài học (Order Index)</Label>
                  <Input 
                    type="number"
                    value={lessonOrder}
                    onChange={(e) => setLessonOrder(Number(e.target.value))}
                    className="mt-1 bg-[var(--os-bg)] border-[var(--os-muted)]/25 focus:ring-[var(--os-accent)] text-[var(--os-fg)]"
                    min={1}
                    required
                  />
                </div>

                {formError && <p className="text-xs text-red-500 mt-2">{formError}</p>}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button type="button" variant="ghost" onClick={closeModal} className="rounded-lg border border-[var(--os-muted)]/20 text-[var(--os-muted)]">
                    Hủy
                  </Button>
                  <Button type="submit" disabled={submitting} className="rounded-lg bg-[var(--os-accent)] text-[var(--os-accent-fg)] hover:bg-[var(--os-accent)]/90 font-bold px-6">
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

      {/* ── Bulk delete confirm ── */}
      <ConfirmDialog
        isOpen={bulkDeleteOpen}
        onClose={() => !bulkDeleting && setBulkDeleteOpen(false)}
        onConfirm={executeBulkDelete}
        title="Xóa hàng loạt"
        description={
          bulkDeleting
            ? "Đang xóa, vui lòng chờ…"
            : `Xóa ${selectedFolderIds.size > 0 ? `${selectedFolderIds.size} thư mục` : ""}${selectedFolderIds.size > 0 && selectedLessonIds.size > 0 ? " và " : ""}${selectedLessonIds.size > 0 ? `${selectedLessonIds.size} bài giảng` : ""} trong thư mục hiện tại? Thư mục sẽ xóa cả nội dung con (CASCADE). Không thể hoàn tác.`
        }
        confirmText={bulkDeleting ? "Đang xóa…" : `Xóa ${selectedCount} mục`}
        cancelText="Hủy"
        variant="danger"
      />

      {/* ── Confirm approve / reject order(s) ── */}
      <ConfirmDialog
        isOpen={approveTarget !== null}
        onClose={() => setApproveTarget(null)}
        onConfirm={async () => {
          if (approveTarget) {
            await handleUpdateOrders(approveTarget.ids, approveTarget.status)
          }
        }}
        title={
          approveTarget?.status === "failed"
            ? "Xác nhận từ chối đơn"
            : "Xác nhận duyệt đơn hàng"
        }
        description={
          approveTarget?.status === "failed"
            ? `Từ chối: ${approveTarget?.label || ""}. Học viên sẽ không được mở khóa môn.`
            : `Duyệt & mở khóa: ${approveTarget?.label || ""}. Chỉ duyệt khi đã nhận đủ tiền.`
        }
        confirmText={
          approveTarget?.status === "failed"
            ? `Từ chối${approveTarget && approveTarget.ids.length > 1 ? ` (${approveTarget.ids.length})` : ""}`
            : `Duyệt & mở khóa${approveTarget && approveTarget.ids.length > 1 ? ` (${approveTarget.ids.length})` : ""}`
        }
        cancelText="Hủy"
        variant={approveTarget?.status === "failed" ? "danger" : "success"}
      />

      {/* Move lessons dialog */}
      <ConfirmDialog
        isOpen={moveDialogOpen}
        onClose={() => !movingLessons && setMoveDialogOpen(false)}
        onConfirm={executeBulkMoveLessons}
        title="Chuyển bài giảng"
        description={`Chuyển ${selectedLessonIds.size} bài sang thư mục đích. Chọn folder bên dưới rồi xác nhận.`}
        confirmText={movingLessons ? "Đang chuyển…" : "Chuyển bài"}
        cancelText="Hủy"
        variant="info"
      />

      {moveDialogOpen && (
        <div className="fixed bottom-6 left-1/2 z-[80] w-[min(420px,92vw)] -translate-x-1/2 rounded-2xl border border-[var(--os-border)] bg-[var(--os-card)] p-4 shadow-2xl">
          <Label className="text-xs text-[var(--os-muted)] font-mono">Thư mục đích</Label>
          <select
            value={moveTargetFolderId}
            onChange={(e) => setMoveTargetFolderId(e.target.value)}
            className="mt-1 w-full h-11 rounded-xl border border-[var(--os-border)] bg-[var(--os-bg)] px-3 text-sm text-[var(--os-fg)]"
          >
            {folderOptions.length === 0 ? (
              <option value="">Chưa có thư mục</option>
            ) : (
              folderOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))
            )}
          </select>
        </div>
      )}

      {/* Mobile Folder Tree Drawer */}
      {isMobileTreeOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden bg-black/60 backdrop-blur-sm transition-all duration-300">
          <div className="w-80 max-w-[85%] bg-[var(--os-bg)] border-r border-[var(--os-muted)]/20 h-full flex flex-col p-4 shadow-2xl relative animate-in slide-in-from-left duration-300">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--os-muted)]/10">
              <span className="text-sm font-bold text-[var(--os-fg)] font-mono tracking-wide">CÂY THƯ MỤC</span>
              <button 
                onClick={() => setIsMobileTreeOpen(false)} 
                className="p-1.5 rounded-lg border border-[var(--os-muted)]/20 text-[var(--os-muted)] hover:text-[var(--os-fg)] hover:bg-[var(--os-card)] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto pr-1">
              {folderTree.length === 0 ? (
                <p className="text-xs text-[var(--os-muted)] italic text-center py-4">Chưa có thư mục</p>
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

export default function TeacherOnlineStudyPageWithSuspense() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--os-bg)] flex items-center justify-center text-[var(--os-muted)] text-sm">
          Đang tải quản trị học liệu…
        </div>
      }
    >
      <TeacherOnlineStudyPage />
    </Suspense>
  )
}
