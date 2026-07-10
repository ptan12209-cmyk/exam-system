"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { OnlineStudentShell } from "@/components/online-student/OnlineStudentShell"
import { OnlineStudentTopbar } from "@/components/online-student/OnlineStudentTopbar"
import { Loading } from "@/components/shared/Loading"
import { getOnlineSubjectInfo } from "@/lib/subjects"
import { 
  Folder as FolderIcon, 
  FolderOpen as FolderOpenIcon, 
  PlayCircle, 
  FileText, 
  ChevronRight, 
  ChevronDown, 
  BookOpen, 
  Download, 
  Video, 
  ArrowLeft,
  ShieldAlert,
  Search,
  LayoutGrid,
  List,
  Home,
  ChevronLeft,
  ExternalLink,
  X,
  CheckCircle2
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import Footer from "@/components/Footer"

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
  folder: DbFolder;
  children: FolderTreeNode[];
}

// Helper to check and resolve video embed
function VideoPlayer({ url, onEnded }: { url: string; onEnded?: () => void }) {
  const [embedUrl, setEmbedUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!url) return
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/
      const match = url.match(regExp)
      if (match && match[2].length === 11) {
        setEmbedUrl(`https://www.youtube.com/embed/${match[2]}`)
        return
      }
    }
    if (url.includes("mediadelivery.net") || url.includes("bunny.net")) {
      // Tự động chuyển dạng play/ sang embed/
      if (url.includes("/play/")) {
        const parts = url.split("/play/")
        if (parts.length === 2) {
          setEmbedUrl(`https://iframe.mediadelivery.net/embed/${parts[1]}`)
          return
        }
      }
      if (url.includes("embed") || url.includes("iframe")) {
        setEmbedUrl(url)
        return
      }
    }
    setEmbedUrl(null)
  }, [url])

  if (embedUrl) {
    return (
      <div 
        className="relative w-full aspect-video rounded-xl overflow-hidden border border-[#8C87A2]/20 bg-black"
        onContextMenu={(e) => {
          e.preventDefault()
          alert("Hệ thống bảo mật StudyHub: Mọi hành vi lấy mã nhúng hoặc sao chép bài giảng video đều bị nghiêm cấm.")
        }}
      >
        <iframe
          src={embedUrl}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
          allowFullScreen
        />
      </div>
    )
  }

  return (
    <video
      src={url}
      controls
      controlsList="nodownload"
      onEnded={onEnded}
      onContextMenu={(e) => {
        e.preventDefault()
        alert("Hệ thống bảo mật StudyHub: Hành vi tải video trái phép hoặc kiểm tra mã nguồn bị chặn để bảo vệ bản quyền.")
      }}
      className="w-full aspect-video rounded-xl bg-black border border-[#8C87A2]/20"
    />
  )
}

export default function OnlineStudentStudy() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const subjectKey = searchParams.get("subject") || "toan"
  const subjectInfo = getOnlineSubjectInfo(subjectKey)

  const [profile, setProfile] = useState<{ full_name: string | null; role: string } | null>(null)
  const [loadingAuth, setLoadingAuth] = useState(true)
  const [loadingData, setLoadingData] = useState(true)
  const [mySubjects, setMySubjects] = useState<string[]>([])

  // Data States
  const [folders, setFolders] = useState<DbFolder[]>([])
  const [lessons, setLessons] = useState<DbLesson[]>([])

  // File Explorer Navigation States
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null) // null = Root
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({})
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [explorerSearch, setExplorerSearch] = useState("")
  const [isMobileTreeOpen, setIsMobileTreeOpen] = useState(false)

  // Active Lesson Viewer (like double clicking a file to open viewer)
  const [activeLesson, setActiveLesson] = useState<DbLesson | null>(null)

  // Lesson progress tracking states
  const [completedLessons, setCompletedLessons] = useState<string[]>([])

  // DevTools detection state
  const [isDevToolsOpen, setIsDevToolsOpen] = useState(false)

  // 1. DevTools detection (window size change & developer controls check)
  useEffect(() => {
    if (typeof window === "undefined") return
    
    const threshold = 160
    const checkDevTools = () => {
      const widthDev = window.outerWidth - window.innerWidth > threshold
      const heightDev = window.outerHeight - window.innerHeight > threshold
      if (widthDev || heightDev) {
        setIsDevToolsOpen(true)
      }
    }
    
    window.addEventListener("resize", checkDevTools)
    const interval = setInterval(checkDevTools, 1000)
    
    return () => {
      window.removeEventListener("resize", checkDevTools)
      clearInterval(interval)
    }
  }, [])

  // 2. Keyboard shortcut blocking
  useEffect(() => {
    if (typeof window === "undefined") return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F12") {
        e.preventDefault()
        alert("Hệ thống bảo mật StudyHub: Bảng điều khiển nhà phát triển đã bị khóa để bảo vệ bản quyền nội dung.")
        return
      }
      if (e.ctrlKey && (e.shiftKey && (e.key === "I" || e.key === "C" || e.key === "J") || e.key === "u" || e.key === "s")) {
        e.preventDefault()
        alert("Hệ thống bảo mật StudyHub: Thao tác này đã bị chặn để bảo vệ bản quyền video bài giảng.")
        return
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  // 3. Load folder tree state from localStorage on mount/subject change
  useEffect(() => {
    if (typeof window === "undefined") return
    const savedFolder = localStorage.getItem(`student_folder_${subjectKey}`)
    const savedExpanded = localStorage.getItem(`student_expanded_${subjectKey}`)
    const savedLesson = localStorage.getItem(`student_lesson_${subjectKey}`)

    if (savedFolder) setSelectedFolderId(savedFolder)
    if (savedExpanded) {
      try {
        setExpandedFolders(JSON.parse(savedExpanded))
      } catch (e) {}
    }
    if (savedLesson) {
      try {
        setActiveLesson(JSON.parse(savedLesson))
      } catch (e) {}
    }
  }, [subjectKey])

  // 4. Save folder tree state to localStorage on changes
  useEffect(() => {
    if (typeof window === "undefined") return
    if (selectedFolderId) {
      localStorage.setItem(`student_folder_${subjectKey}`, selectedFolderId)
    } else {
      localStorage.removeItem(`student_folder_${subjectKey}`)
    }
  }, [selectedFolderId, subjectKey])

  useEffect(() => {
    if (typeof window === "undefined") return
    localStorage.setItem(`student_expanded_${subjectKey}`, JSON.stringify(expandedFolders))
  }, [expandedFolders, subjectKey])

  useEffect(() => {
    if (typeof window === "undefined") return
    if (activeLesson) {
      localStorage.setItem(`student_lesson_${subjectKey}`, JSON.stringify(activeLesson))
    } else {
      localStorage.removeItem(`student_lesson_${subjectKey}`)
    }
  }, [activeLesson, subjectKey])
  
  // Selected Video Player State
  const [activeVideo, setActiveVideo] = useState<{ title: string; url: string } | null>(null)

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

      if (!profileData || (profileData.role !== "online_student" && profileData.role !== "student")) {
        router.push("/login")
        return
      }

      setProfile(profileData)
      
      // Fetch assigned online subjects to verify permissions
      try {
        const res = await fetch("/api/online-study/my-subjects")
        const data = await res.json()
        if (res.ok && data.success) {
          setMySubjects(data.data || [])
        }
      } catch (e) {
        console.error("Lỗi lấy môn học:", e)
      } finally {
        setLoadingAuth(false)
      }
    }

    checkAuth()
  }, [router, supabase])

  // Fetch lesson completion progress
  const fetchProgress = async () => {
    try {
      const res = await fetch("/api/online-study/progress")
      const data = await res.json()
      if (res.ok && data.success) {
        setCompletedLessons((data.data || []).filter((p: any) => p.completed).map((p: any) => p.lesson_id))
      }
    } catch (e) {
      console.error("Lỗi lấy tiến độ:", e)
    }
  }

  useEffect(() => {
    if (!loadingAuth && hasAccessToSubject) {
      fetchProgress()
    }
  }, [loadingAuth, subjectKey, hasAccessToSubject])

  // Save lesson completion progress
  const handleMarkCompleted = async (lessonId: string, completed: boolean = true) => {
    try {
      const res = await fetch("/api/online-study/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId, completed })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        fetchProgress()
      }
    } catch (e) {
      console.error("Lỗi ghi nhận hoàn thành bài học:", e)
    }
  }

  // Set active video playlist item when active lesson changes
  useEffect(() => {
    if (activeLesson) {
      const initialVideo = activeLesson.videos && activeLesson.videos.length > 0
        ? activeLesson.videos[0]
        : (activeLesson.video_url ? { title: "Video bài học", url: activeLesson.video_url } : null)
      setActiveVideo(initialVideo)
    } else {
      setActiveVideo(null)
    }
  }, [activeLesson])

  // Verify access permissions for current subject
  const hasAccessToSubject = useMemo(() => {
    if (loadingAuth) return true
    return mySubjects.includes("all") || mySubjects.includes(subjectKey)
  }, [loadingAuth, mySubjects, subjectKey])

  // Fetch Folders & Lessons
  useEffect(() => {
    if (loadingAuth || !hasAccessToSubject) return

    async function fetchData() {
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
      } catch (e) {
        console.error("Lỗi tải bài học online:", e)
      }
      setLoadingData(false)
    }

    fetchData()
  }, [loadingAuth, subjectInfo.dbValue, hasAccessToSubject])

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
            setActiveLesson(null) // Close any active lesson viewer when switching folder
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

  if (isDevToolsOpen) {
    return (
      <div className="min-h-screen bg-[#0B0A13] flex flex-col items-center justify-center text-center p-6 select-none">
        <div className="h-16 w-16 bg-[#15131F] border border-red-500/20 rounded-full flex items-center justify-center text-red-400 mb-4 animate-pulse">
          <ShieldAlert className="h-8 w-8 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-[#F1EDF9]">Cảnh báo bảo mật hệ thống</h1>
        <p className="text-sm text-[#8C87A2] max-w-md mt-3 leading-relaxed">
          Phát hiện hành vi mở DevTools hoặc kiểm tra mã nguồn. Vui lòng đóng bảng điều khiển lập trình (F12) và tải lại trang để tiếp tục học tập. Hành vi cố tình bắt link tải video bài giảng sẽ được ghi lại trên tài khoản hệ thống.
        </p>
        <Button 
          onClick={() => window.location.reload()} 
          className="mt-6 rounded-xl bg-[#C18CFF] hover:bg-[#C18CFF]/90 text-[#0B0A13] font-bold text-xs px-6 py-2.5 transition-all"
        >
          Tải lại trang
        </Button>
      </div>
    )
  }

  if (loadingAuth || (loadingData && hasAccessToSubject)) {
    return (
      <div className="min-h-screen bg-[#0B0A13] flex items-center justify-center">
        <Loading label="Đang tải học liệu online..." />
      </div>
    )
  }

  // Access Denied UI if student is not assigned to this subject
  if (!hasAccessToSubject) {
    return (
      <OnlineStudentShell>
        <OnlineStudentTopbar name={profile?.full_name} onLogout={handleLogout} />
        <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6">
          <div className="h-16 w-16 bg-[#15131F] border border-red-500/20 rounded-full flex items-center justify-center text-red-400 mb-4">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-[#F1EDF9]">Không có quyền truy cập</h2>
          <p className="text-xs text-[#8C87A2] max-w-sm mt-2 leading-relaxed">
            Môn học trực tuyến này chưa được đăng ký hoặc cấp quyền truy cập cho tài khoản của bạn. Vui lòng liên hệ Giáo viên/Admin để đăng ký lớp học.
          </p>
          <div className="mt-6">
            <Link href="/online-student/dashboard">
              <Button className="rounded-xl border border-[#8C87A2]/20 bg-[#15131F] text-xs font-bold text-[#F1EDF9] hover:bg-[#15131F]/80 flex items-center gap-1.5 transition-transform active:scale-95">
                <ArrowLeft className="h-3.5 w-3.5" /> Quay lại Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </OnlineStudentShell>
    )
  }

  return (
    <OnlineStudentShell>
      <OnlineStudentTopbar name={profile?.full_name} onLogout={handleLogout} />

      <div className="mx-auto max-w-7xl w-full px-4 py-6 sm:px-6 lg:px-8 flex-1 flex flex-col min-h-0">
        
        {/* Back and Page title */}
        <div className="flex items-center justify-between mb-4 gap-4 w-full">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/online-student/dashboard" className="shrink-0">
              <Button variant="ghost" size="icon" className="rounded-xl border border-[#8C87A2]/20 text-[#8C87A2] hover:text-[#F1EDF9] hover:bg-[#15131F] h-10 w-10">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xl shrink-0">{subjectInfo.icon}</span>
                <h1 className="text-xl sm:text-2xl font-bold text-[#F1EDF9] tracking-tight truncate">{subjectInfo.label} học online</h1>
              </div>
              <p className="text-[10px] sm:text-xs text-[#8C87A2] mt-0.5 font-mono">StudyHub E-learning Portal</p>
            </div>
          </div>

          <Button
            onClick={() => setIsMobileTreeOpen(true)}
            className="md:hidden shrink-0 rounded-xl border border-[#8C87A2]/30 bg-[#15131F] text-xs font-bold text-[#F1EDF9] hover:bg-[#15131F]/80 flex items-center gap-1.5 px-3 h-10 transition-transform active:scale-95"
          >
            <FolderIcon className="h-4 w-4 text-[#C18CFF]" /> Danh mục
          </Button>
        </div>

        {/* Address and Explorer Controls Toolbar */}
        {!activeLesson && (
          <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-[#8C87A2]/20 bg-[#15131F]/30 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between">
              
              {/* Explorer Search inside current folder */}
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#8C87A2]" />
                <input
                  value={explorerSearch}
                  onChange={(e) => setExplorerSearch(e.target.value)}
                  placeholder="Tìm bài học/thư mục..."
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

            {/* Address Bar */}
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
        )}

        {/* Explorer Split Layout */}
        <div className="grid gap-4 md:grid-cols-[240px_1fr] items-start flex-1 min-h-0">
          
          {/* Left Pane: Folder Tree Sidebar */}
          <aside className="bg-[#15131F] border border-[#8C87A2]/20 rounded-2xl p-3 max-h-[500px] overflow-y-auto w-full hidden md:block lg:sticky lg:top-24">
            <div className="pb-2 mb-2 border-b border-[#8C87A2]/10 flex items-center justify-between text-[10px] uppercase font-bold text-[#8C87A2] font-mono">
              <span>Thư mục</span>
              <button onClick={() => { setSelectedFolderId(null); setActiveLesson(null); }} className="hover:text-[#C18CFF]">Mở Root</button>
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

          {/* Right Pane: Main Explorer Content/Lecture Viewer */}
          <div className="flex flex-col min-h-[400px]">
            
            {activeLesson ? (
              /* A. Integrated Lecture Content Viewer Mode (Opened File) */
              <section className="bg-[#15131F] border border-[#8C87A2]/20 rounded-2xl p-6 space-y-6">
                
                {/* Back to current folder explorer */}
                <div className="flex items-center">
                  <Button 
                    variant="ghost" 
                    onClick={() => setActiveLesson(null)} 
                    className="rounded-xl border border-[#8C87A2]/20 text-[#8C87A2] hover:text-[#F1EDF9] hover:bg-[#0B0A13] text-xs font-semibold px-4 flex items-center gap-1.5 transition-transform active:scale-95"
                  >
                    <ArrowLeft className="h-4 w-4" /> Quay lại Thư mục
                  </Button>
                </div>

                {/* Title */}
                <div>
                  <h2 className="text-2xl font-bold text-[#F1EDF9] tracking-tight">{activeLesson.title}</h2>
                  <div className="flex items-center gap-4 mt-2 text-xs text-[#8C87A2] font-mono">
                    <span className="flex items-center gap-1"><Video className="h-3.5 w-3.5" /> Video bài học</span>
                  </div>
                </div>

                {/* Video Player & Playlist Selector */}
                {activeVideo ? (
                  <div className="space-y-4">
                    <VideoPlayer url={activeVideo.url} onEnded={() => handleMarkCompleted(activeLesson.id)} />
                    {activeVideo.title && (
                      <p className="text-xs text-[#8C87A2] font-semibold italic mt-1.5">Đang phát: {activeVideo.title}</p>
                    )}

                    {/* Progress Tracking Checkbox / Toggle */}
                    <div className="flex items-center justify-between p-4 bg-[#0B0A13]/30 rounded-xl border border-[#8C87A2]/10 mt-4">
                      <div className="space-y-1 mr-4 text-left">
                        <h5 className="text-xs font-bold text-[#F1EDF9] font-mono uppercase tracking-wider">Trạng thái hoàn thành</h5>
                        <p className="text-[11px] text-[#8C87A2]">Đánh dấu bài học này đã được hoàn thành để lưu vào tiến trình học tập của bạn.</p>
                      </div>
                      <Button
                        onClick={() => handleMarkCompleted(activeLesson.id, !completedLessons.includes(activeLesson.id))}
                        className={`rounded-lg text-xs font-bold px-4 py-2 shrink-0 transition-all duration-300 flex items-center gap-1.5 ${
                          completedLessons.includes(activeLesson.id)
                            ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                            : "bg-[#C18CFF] hover:bg-[#C18CFF]/90 text-[#0B0A13]"
                        }`}
                      >
                        {completedLessons.includes(activeLesson.id) ? (
                          <>
                            <CheckCircle2 className="h-4 w-4" /> Đã hoàn thành
                          </>
                        ) : (
                          "Đánh dấu hoàn thành"
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="aspect-video rounded-xl bg-[#0B0A13] border border-[#8C87A2]/20 flex flex-col items-center justify-center text-center p-6">
                    <PlayCircle className="h-12 w-12 text-[#8C87A2]/30 mb-3" />
                    <p className="text-sm font-medium text-[#8C87A2]">Bài giảng này không có video.</p>
                  </div>
                )}

                {/* Video Playlist Selector */}
                {activeLesson.videos && activeLesson.videos.length > 1 && (
                  <div className="space-y-2.5 mt-4 bg-[#0B0A13]/40 p-4 rounded-xl border border-[#8C87A2]/10">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#8C87A2] font-mono">Danh sách Video bài giảng ({activeLesson.videos.length})</h4>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {activeLesson.videos.map((vid, idx) => {
                        const isPlaying = activeVideo?.url === vid.url
                        return (
                          <button
                            key={idx}
                            onClick={() => setActiveVideo(vid)}
                            className={`flex items-center gap-2 p-2.5 rounded-lg border text-left text-xs font-semibold transition-all ${
                              isPlaying
                                ? "bg-[#C18CFF]/15 border-[#C18CFF]/30 text-[#C18CFF] font-bold"
                                : "bg-[#15131F] border-[#8C87A2]/20 text-[#8C87A2] hover:text-[#F1EDF9] hover:bg-[#15131F]/80"
                            }`}
                          >
                            <PlayCircle className="h-4 w-4 shrink-0" />
                            <span className="truncate">{vid.title || `Video ${idx + 1}`}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Description */}
                {activeLesson.description && (
                  <div className="p-4 bg-[#0B0A13]/50 rounded-xl border border-[#8C87A2]/10">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#8C87A2] font-mono mb-2">Mô tả bài giảng</h4>
                    <p className="text-sm text-[#8C87A2] leading-relaxed whitespace-pre-line">{activeLesson.description}</p>
                  </div>
                )}

                {/* Documents Section */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#8C87A2] font-mono mb-3">Tài liệu ôn tập đính kèm</h4>
                  {(() => {
                    const docsToDisplay = (activeLesson.documents && activeLesson.documents.length > 0)
                      ? activeLesson.documents
                      : (activeLesson.document_url ? [{ title: "Tài liệu học tập", url: activeLesson.document_url }] : [])

                    if (docsToDisplay.length === 0) {
                      return <p className="text-xs text-[#8C87A2] italic pl-2">Không có tài liệu đính kèm cho bài học này.</p>
                    }

                    return (
                      <div className="space-y-2">
                        {docsToDisplay.map((doc, idx) => (
                          <div key={idx} className="flex items-center justify-between p-4 bg-[#0B0A13] border border-[#8C87A2]/20 rounded-xl hover:border-[#C18CFF] transition-colors">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="h-10 w-10 shrink-0 rounded-lg bg-[#C18CFF]/10 flex items-center justify-center text-[#C18CFF]">
                                <FileText className="h-5 w-5" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-[#F1EDF9] truncate">{doc.title || `Tài liệu ôn tập ${idx + 1}`}</p>
                                <p className="text-xs text-[#8C87A2] font-mono truncate mt-0.5">{doc.url}</p>
                              </div>
                            </div>
                            <a 
                              href={doc.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="ml-4 shrink-0"
                            >
                              <Button className="rounded-lg bg-[#C18CFF] hover:bg-[#C18CFF]/90 text-[#0B0A13] font-semibold text-xs py-2 px-4 flex items-center gap-1.5 transition-transform active:scale-95">
                                <Download className="h-3.5 w-3.5" /> Xem / Tải về <ExternalLink className="h-3 w-3" />
                              </Button>
                            </a>
                          </div>
                        ))}
                      </div>
                    )
                  })()}
                </div>

              </section>
            ) : (
              /* B. Explorer Folder Viewer Mode */
              <section className="bg-[#15131F] border border-[#8C87A2]/20 rounded-2xl p-5 flex-1 flex flex-col justify-start">
                
                {currentSubFolders.length === 0 && currentLessons.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-16">
                    <FolderOpenIcon className="h-12 w-12 text-[#8C87A2]/30 mb-3" />
                    <h4 className="text-sm font-bold text-[#F1EDF9]">Thư mục trống</h4>
                    <p className="text-xs text-[#8C87A2] max-w-xs mt-1">
                      Thư mục này hiện không chứa thư mục con hay bài giảng nào.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    
                    {/* Subfolders list */}
                    {currentSubFolders.length > 0 && (
                      <div>
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#8C87A2] font-mono mb-3">Thư mục con ({currentSubFolders.length})</h4>
                        
                        {viewMode === "grid" ? (
                          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                            {currentSubFolders.map(folder => (
                              <div
                                key={folder.id}
                                onClick={() => setSelectedFolderId(folder.id)}
                                className="group p-3.5 bg-[#15131F]/50 hover:bg-[#15131F]/90 border border-[#8C87A2]/20 hover:border-[#C18CFF] rounded-xl flex flex-col justify-between h-24 cursor-pointer select-none transition-all duration-200"
                              >
                                <FolderIcon className="h-7 w-7 text-[#C18CFF]" />
                                <div className="min-w-0 mt-1">
                                  <h5 className="font-bold text-xs text-[#F1EDF9] truncate leading-tight">{folder.name}</h5>
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
                                className="group flex items-center justify-between p-3 cursor-pointer hover:bg-[#15131F]/50 transition-colors text-xs font-semibold text-[#F1EDF9]"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <FolderIcon className="h-4.5 w-4.5 text-[#C18CFF] shrink-0" />
                                  <span className="truncate">{folder.name}</span>
                                </div>
                                <ChevronRight className="h-4 w-4 text-[#8C87A2] group-hover:text-[#C18CFF] transition-colors" />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Lessons list inside current folder */}
                    {currentLessons.length > 0 && (
                      <div>
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#8C87A2] font-mono mb-3">Bài giảng ({currentLessons.length})</h4>
                        
                        {viewMode === "grid" ? (
                          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                            {currentLessons.map(lesson => (
                              <div
                                key={lesson.id}
                                onClick={() => setActiveLesson(lesson)}
                                className="group p-4 bg-[#0B0A13]/30 hover:bg-[#0B0A13]/60 border border-[#8C87A2]/10 hover:border-[#C18CFF]/50 rounded-xl flex flex-col justify-between h-30 cursor-pointer transition-all duration-200"
                              >
                                <div className="flex items-center justify-between w-full">
                                  <PlayCircle className="h-7 w-7 text-[#8C87A2] group-hover:text-[#C18CFF] transition-colors" />
                                  {completedLessons.includes(lesson.id) && (
                                    <span className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full p-0.5" title="Đã học xong">
                                      <CheckCircle2 className="h-4 w-4" />
                                    </span>
                                  )}
                                </div>

                                <div className="min-w-0 mt-2 text-left">
                                  <span className="text-[8px] font-mono text-[#8C87A2]">Bài giảng {lesson.order_index}</span>
                                  <h5 className="font-bold text-xs text-[#F1EDF9] truncate leading-tight mt-0.5">{lesson.title}</h5>
                                  <div className="flex gap-2 mt-2">
                                    {(lesson.videos && lesson.videos.length > 0) || lesson.video_url ? (
                                      <span className="text-[8px] uppercase font-bold text-[#C18CFF] bg-[#C18CFF]/10 px-1.5 rounded">
                                        Video ({lesson.videos?.length || 1})
                                      </span>
                                    ) : null}
                                    {(lesson.documents && lesson.documents.length > 0) || lesson.document_url ? (
                                      <span className="text-[8px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-1.5 rounded">
                                        Tài liệu ({lesson.documents?.length || 1})
                                      </span>
                                    ) : null}
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
                                onClick={() => setActiveLesson(lesson)}
                                className="group flex items-center justify-between p-3 cursor-pointer hover:bg-[#0B0A13]/30 transition-colors"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  {completedLessons.includes(lesson.id) ? (
                                    <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400 shrink-0" />
                                  ) : (
                                    <PlayCircle className="h-4.5 w-4.5 text-[#8C87A2] shrink-0 group-hover:text-[#C18CFF] transition-colors" />
                                  )}
                                  <span className="text-xs font-semibold text-[#F1EDF9] truncate">{lesson.title}</span>
                                  <span className="text-[9px] font-mono text-[#8C87A2]">Bài: {lesson.order_index}</span>
                                  <div className="flex gap-1.5 shrink-0">
                                    {((lesson.videos && lesson.videos.length > 0) || lesson.video_url) && (
                                      <Video className="h-3 w-3 text-[#C18CFF]" />
                                    )}
                                    {((lesson.documents && lesson.documents.length > 0) || lesson.document_url) && (
                                      <FileText className="h-3 w-3 text-emerald-400" />
                                    )}
                                  </div>
                                </div>
                                <ChevronRight className="h-4 w-4 text-[#8C87A2] group-hover:text-[#C18CFF] transition-colors" />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </section>
            )}

          </div>
        </div>

      </div>

      {/* Mobile Folder Tree Drawer */}
      {isMobileTreeOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden bg-black/60 backdrop-blur-sm transition-all duration-300">
          <div className="w-80 max-w-[85%] bg-[#0B0A13] border-r border-[#8C87A2]/20 h-full flex flex-col p-4 shadow-2xl relative animate-in slide-in-from-left duration-300">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#8C87A2]/10">
              <span className="text-sm font-bold text-[#F1EDF9] font-mono tracking-wide">DANH MỤC BÀI HỌC</span>
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
      <Footer />
    </OnlineStudentShell>
  )
}
