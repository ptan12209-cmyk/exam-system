"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { OnlineStudentShell } from "@/components/online-student/OnlineStudentShell"
import { OnlineStudentTopbar } from "@/components/online-student/OnlineStudentTopbar"
import { Loading } from "@/components/shared/Loading"
import { getOnlineSubjectInfo } from "@/lib/subjects"
import { 
  Folder, 
  FolderOpen, 
  PlayCircle, 
  FileText, 
  ChevronRight, 
  ChevronDown, 
  BookOpen, 
  Download, 
  Video, 
  ArrowLeft,
  ShieldAlert
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

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

// Helper to check and resolve video embed
function VideoPlayer({ url }: { url: string }) {
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
    if (url.includes("iframe.mediadelivery.net") || url.includes("bunny.net")) {
      if (url.includes("embed") || url.includes("iframe")) {
        setEmbedUrl(url)
        return
      }
    }
    setEmbedUrl(null)
  }, [url])

  if (embedUrl) {
    return (
      <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-[#8C87A2]/20 bg-black">
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
  
  // Selection
  const [selectedLesson, setSelectedLesson] = useState<DbLesson | null>(null)
  
  // UI Expansion
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({})

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

      if (!profileData || profileData.role !== "online_student") {
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
      } finally {
        setLoadingData(false)
      }
    }

    fetchData()
  }, [loadingAuth, subjectInfo.dbValue, hasAccessToSubject])

  // Build recursive tree node structure
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
    setExpandedFolders(prev => ({
      ...prev,
      [folderId]: !prev[folderId]
    }))
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  // Recursive tree renderer
  const FolderTreeNode = ({ node, level = 0 }: { node: TreeNode; level: number }) => {
    const isExpanded = !!expandedFolders[node.folder.id]
    const hasChildren = node.children.length > 0 || node.lessons.length > 0

    return (
      <div className="space-y-1">
        <div 
          onClick={() => toggleFolder(node.folder.id)}
          style={{ paddingLeft: `${level * 12 + 8}px` }}
          className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-[#15131F]/60 cursor-pointer select-none group transition-colors"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[#8C87A2] shrink-0">
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </span>
            <span className="text-[#C18CFF] shrink-0">
              {isExpanded ? <FolderOpen className="h-4 w-4" /> : <Folder className="h-4 w-4" />}
            </span>
            <span className="text-sm font-semibold text-[#F1EDF9] truncate group-hover:text-[#C18CFF] transition-colors">
              {node.folder.name}
            </span>
          </div>
        </div>

        {isExpanded && hasChildren && (
          <div className="space-y-1 mt-0.5">
            {node.children.map(child => (
              <FolderTreeNode key={child.folder.id} node={child} level={level + 1} />
            ))}

            {node.lessons.map(lesson => {
              const isSelected = selectedLesson?.id === lesson.id
              return (
                <div
                  key={lesson.id}
                  onClick={() => setSelectedLesson(lesson)}
                  style={{ paddingLeft: `${(level + 1) * 12 + 12}px` }}
                  className={`flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer transition-colors ${
                    isSelected 
                      ? "bg-[#C18CFF]/15 text-[#C18CFF]" 
                      : "hover:bg-[#15131F]/30 text-[#8C87A2] hover:text-[#F1EDF9]"
                  }`}
                >
                  <PlayCircle className={`h-4 w-4 shrink-0 ${isSelected ? "text-[#C18CFF]" : "text-[#8C87A2]"}`} />
                  <span className="text-xs font-medium truncate">{lesson.title}</span>
                </div>
              )
            })}
          </div>
        )}
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/online-student/dashboard">
              <Button variant="ghost" size="icon" className="rounded-xl border border-[#8C87A2]/20 text-[#8C87A2] hover:text-[#F1EDF9] hover:bg-[#15131F]">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">{subjectInfo.icon}</span>
                <h1 className="text-2xl font-bold text-[#F1EDF9] tracking-tight">{subjectInfo.label} học online</h1>
              </div>
              <p className="text-xs text-[#8C87A2] mt-0.5 font-mono">ExamHub E-learning Portal</p>
            </div>
          </div>
        </div>

        {/* Layout split */}
        <div className="grid gap-6 lg:grid-cols-[300px_1fr] flex-1 min-h-0 items-start">
          
          {/* Left panel: Tree Navigation */}
          <aside className="bg-[#15131F] border border-[#8C87A2]/20 rounded-2xl p-4 max-h-[calc(100vh-12rem)] overflow-y-auto w-full lg:sticky lg:top-24">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#8C87A2]/10">
              <span className="text-xs font-bold uppercase tracking-wider text-[#8C87A2] font-mono">Danh mục bài học</span>
              <span className="text-[10px] bg-[#0B0A13] px-2 py-0.5 rounded border border-[#8C87A2]/20 text-[#8C87A2] font-mono">
                {lessons.length} bài
              </span>
            </div>

            {treeRoots.length === 0 ? (
              <div className="text-center py-10 text-xs text-[#8C87A2]">
                Chưa có cấu trúc thư mục nào.
              </div>
            ) : (
              <div className="space-y-1">
                {treeRoots.map(root => (
                  <FolderTreeNode key={root.folder.id} node={root} level={0} />
                ))}
              </div>
            )}
          </aside>

          {/* Right panel: Lecture Content Viewer */}
          <section className="bg-[#15131F] border border-[#8C87A2]/20 rounded-2xl p-6 min-h-[400px]">
            {selectedLesson ? (
              <div className="space-y-6">
                
                {/* 1. Header */}
                <div>
                  <h2 className="text-2xl font-bold text-[#F1EDF9] tracking-tight">{selectedLesson.title}</h2>
                  <div className="flex items-center gap-4 mt-2 text-xs text-[#8C87A2] font-mono">
                    <span className="flex items-center gap-1"><Video className="h-3.5 w-3.5" /> Bunny.net video</span>
                  </div>
                </div>

                {/* 2. Video Player */}
                {selectedLesson.video_url ? (
                  <VideoPlayer url={selectedLesson.video_url} />
                ) : (
                  <div className="aspect-video rounded-xl bg-[#0B0A13] border border-[#8C87A2]/20 flex flex-col items-center justify-center text-center p-6">
                    <PlayCircle className="h-12 w-12 text-[#8C87A2]/30 mb-3" />
                    <p className="text-sm font-medium text-[#8C87A2]">Bài giảng này không có video.</p>
                  </div>
                )}

                {/* 3. Description */}
                {selectedLesson.description && (
                  <div className="p-4 bg-[#0B0A13]/50 rounded-xl border border-[#8C87A2]/10">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#8C87A2] font-mono mb-2">Mô tả bài giảng</h4>
                    <p className="text-sm text-[#8C87A2] leading-relaxed whitespace-pre-line">{selectedLesson.description}</p>
                  </div>
                )}

                {/* 4. Documents Section */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#8C87A2] font-mono mb-3">Tài liệu học tập đính kèm</h4>
                  {selectedLesson.document_url ? (
                    <div className="flex items-center justify-between p-4 bg-[#0B0A13] border border-[#8C87A2]/20 rounded-xl hover:border-[#C18CFF] transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 shrink-0 rounded-lg bg-[#C18CFF]/10 flex items-center justify-center text-[#C18CFF]">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#F1EDF9] truncate">Tài liệu đính kèm bài giảng</p>
                          <p className="text-xs text-[#8C87A2] font-mono truncate mt-0.5">{selectedLesson.document_url}</p>
                        </div>
                      </div>
                      <a 
                        href={selectedLesson.document_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="ml-4"
                      >
                        <Button className="rounded-lg bg-[#C18CFF] hover:bg-[#C18CFF]/90 text-[#0B0A13] font-semibold text-xs py-2 px-4 flex items-center gap-1.5 shrink-0 transition-transform active:scale-95">
                          <Download className="h-3.5 w-3.5" /> Xem / Tải về
                        </Button>
                      </a>
                    </div>
                  ) : (
                    <p className="text-xs text-[#8C87A2] italic pl-2">Không có tài liệu đính kèm cho bài học này.</p>
                  )}
                </div>

              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="h-16 w-16 rounded-full bg-[#0B0A13] border border-[#8C87A2]/20 flex items-center justify-center text-[#C18CFF] mb-4">
                  <BookOpen className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-bold text-[#F1EDF9]">Vui lòng chọn bài giảng</h3>
                <p className="text-sm text-[#8C87A2] max-w-sm mt-1">
                  Mở các thư mục ở thanh bên trái và nhấp vào bài giảng để bắt đầu xem video bài học & ôn tập tài liệu.
                </p>
              </div>
            )}
          </section>

        </div>

      </div>
    </OnlineStudentShell>
  )
}
