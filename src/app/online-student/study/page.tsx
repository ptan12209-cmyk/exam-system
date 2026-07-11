"use client"

import { useEffect, useState, useMemo, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { OnlineStudentShell } from "@/components/online-student/OnlineStudentShell"
import { OnlineStudentTopbar } from "@/components/online-student/OnlineStudentTopbar"
import { Loading } from "@/components/shared/Loading"
import { ProtectedVideoPlayer } from "@/components/exam/ProtectedVideoPlayer"
import { SupportFab } from "@/components/support/SupportFab"
import { getOnlineSubjectInfo } from "@/lib/subjects"
import { supportZaloUrlWithText } from "@/lib/support"
import {
  Folder as FolderIcon,
  FolderOpen as FolderOpenIcon,
  PlayCircle,
  FileText,
  ChevronRight,
  ChevronLeft,
  BookOpen,
  Download,
  Video,
  ArrowLeft,
  ShieldAlert,
  Search,
  CheckCircle2,
  Home,
  LayoutGrid,
  List,
  MessageCircle,
  ExternalLink,
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast"
import Footer from "@/components/Footer"
import { cn } from "@/lib/utils"

interface DbFolder {
  id: string
  name: string
  parent_id: string | null
  subject: string
  order_index: number
}

/** Catalog row from API — no media URLs for students */
interface CatalogLesson {
  id: string
  folder_id: string
  title: string
  description: string | null
  order_index: number
  has_video?: boolean
  video_count?: number
  has_documents?: boolean
  document_count?: number
  // legacy full rows (teacher) — optional
  video_url?: string | null
  document_url?: string | null
  videos?: Array<{ title: string; url: string }>
  documents?: Array<{ title: string; url: string }>
}

interface PlaybackPayload {
  lesson_id: string
  title: string
  description: string | null
  videos: Array<{ title: string; url: string }>
  documents: Array<{ title: string; url: string }>
}

function StudyPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const { error: toastError, success: toastSuccess } = useToast()
  const subjectKey = searchParams.get("subject") || "toan"
  const subjectInfo = getOnlineSubjectInfo(subjectKey)

  const [profile, setProfile] = useState<{
    full_name: string | null
    role: string
    email?: string | null
  } | null>(null)
  const [loadingAuth, setLoadingAuth] = useState(true)
  const [loadingData, setLoadingData] = useState(true)
  const [mySubjects, setMySubjects] = useState<string[]>([])
  const [folders, setFolders] = useState<DbFolder[]>([])
  const [lessons, setLessons] = useState<CatalogLesson[]>([])
  const [completedLessons, setCompletedLessons] = useState<string[]>([])
  /** null = drive root */
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [activeLesson, setActiveLesson] = useState<CatalogLesson | null>(null)
  const [playback, setPlayback] = useState<PlaybackPayload | null>(null)
  const [loadingPlayback, setLoadingPlayback] = useState(false)
  const [activeVideo, setActiveVideo] = useState<{ title: string; url: string } | null>(null)
  const [isDevToolsOpen, setIsDevToolsOpen] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    const threshold = 160
    const check = () => {
      if (
        window.outerWidth - window.innerWidth > threshold ||
        window.outerHeight - window.innerHeight > threshold
      ) {
        setIsDevToolsOpen(true)
      }
    }
    window.addEventListener("resize", check)
    const interval = setInterval(check, 1500)
    return () => {
      window.removeEventListener("resize", check)
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "F12") e.preventDefault()
      if (
        e.ctrlKey &&
        (e.key === "u" ||
          e.key === "s" ||
          (e.shiftKey && (e.key === "I" || e.key === "J" || e.key === "C")))
      ) {
        e.preventDefault()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    localStorage.setItem("drive_last_subject", subjectKey)
    const f = localStorage.getItem(`drive_folder_${subjectKey}`)
    if (f) setCurrentFolderId(f)
    else setCurrentFolderId(null)
    const lid = localStorage.getItem(`drive_lesson_id_${subjectKey}`)
    if (lid) {
      ;(window as unknown as { __pendingLessonId?: string }).__pendingLessonId = lid
    }
    const vm = localStorage.getItem(`drive_view_${subjectKey}`)
    if (vm === "list" || vm === "grid") setViewMode(vm)
  }, [subjectKey])

  useEffect(() => {
    if (typeof window === "undefined") return
    if (currentFolderId) localStorage.setItem(`drive_folder_${subjectKey}`, currentFolderId)
    else localStorage.removeItem(`drive_folder_${subjectKey}`)
  }, [currentFolderId, subjectKey])

  useEffect(() => {
    if (typeof window === "undefined") return
    localStorage.setItem(`drive_view_${subjectKey}`, viewMode)
  }, [viewMode, subjectKey])

  useEffect(() => {
    if (typeof window === "undefined") return
    if (activeLesson) localStorage.setItem(`drive_lesson_id_${subjectKey}`, activeLesson.id)
    else localStorage.removeItem(`drive_lesson_id_${subjectKey}`)
  }, [activeLesson, subjectKey])

  useEffect(() => {
    ;(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push("/login")
        return
      }
      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, role, email")
        .eq("id", user.id)
        .single()
      if (
        !profileData ||
        (profileData.role !== "online_student" && profileData.role !== "student")
      ) {
        router.push("/login")
        return
      }
      setProfile(profileData)
      try {
        const res = await fetch("/api/online-study/my-subjects")
        const data = await res.json()
        if (res.ok && data.success) setMySubjects(data.data || [])
      } catch (e) {
        console.error(e)
      } finally {
        setLoadingAuth(false)
      }
    })()
  }, [router, supabase])

  const hasAccess = useMemo(() => {
    if (loadingAuth) return true
    return mySubjects.includes("all") || mySubjects.includes(subjectKey)
  }, [loadingAuth, mySubjects, subjectKey])

  useEffect(() => {
    if (!loadingAuth && !hasAccess) router.replace("/online-student/dashboard")
  }, [loadingAuth, hasAccess, router])

  const fetchProgress = async () => {
    try {
      const res = await fetch("/api/online-study/progress")
      const data = await res.json()
      if (res.ok && data.success) {
        setCompletedLessons(
          (data.data || [])
            .filter((p: { completed?: boolean }) => p.completed)
            .map((p: { lesson_id: string }) => p.lesson_id)
        )
      }
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    if (!loadingAuth && hasAccess) fetchProgress()
  }, [loadingAuth, hasAccess, subjectKey])

  useEffect(() => {
    if (loadingAuth || !hasAccess) return
    ;(async () => {
      setLoadingData(true)
      try {
        const [rf, rl] = await Promise.all([
          fetch(`/api/online-study/folders?subject=${subjectInfo.dbValue}`),
          fetch(`/api/online-study/lessons?subject=${subjectInfo.dbValue}`),
        ])
        if (rf.status === 403 || rl.status === 403) {
          router.replace("/online-student/dashboard")
          return
        }
        const [df, dl] = await Promise.all([rf.json(), rl.json()])
        const folderList: DbFolder[] = rf.ok && df.success ? df.data || [] : []
        const lessonList: CatalogLesson[] = rl.ok && dl.success ? dl.data || [] : []
        setFolders(folderList)
        setLessons(lessonList)
        const pending = (window as unknown as { __pendingLessonId?: string }).__pendingLessonId
        if (pending) {
          const found = lessonList.find((l) => l.id === pending)
          if (found) {
            setCurrentFolderId(found.folder_id)
            void openLesson(found)
          }
          delete (window as unknown as { __pendingLessonId?: string }).__pendingLessonId
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoadingData(false)
      }
    })()
  }, [loadingAuth, hasAccess, subjectInfo.dbValue, router])

  const breadcrumbs = useMemo(() => {
    if (!currentFolderId) return [] as DbFolder[]
    const path: DbFolder[] = []
    let id: string | null = currentFolderId
    while (id) {
      const f = folders.find((x) => x.id === id)
      if (!f) break
      path.unshift(f)
      id = f.parent_id
    }
    return path
  }, [currentFolderId, folders])

  const currentFolders = useMemo(() => {
    let list = folders.filter((f) => f.parent_id === currentFolderId)
    const q = search.trim().toLowerCase()
    if (q) list = list.filter((f) => f.name.toLowerCase().includes(q))
    return list.sort((a, b) => a.order_index - b.order_index)
  }, [folders, currentFolderId, search])

  const currentLessons = useMemo(() => {
    let list = lessons.filter((l) => l.folder_id === currentFolderId)
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          (l.description || "").toLowerCase().includes(q)
      )
    }
    return list.sort((a, b) => a.order_index - b.order_index)
  }, [lessons, currentFolderId, search])

  const openLesson = async (lesson: CatalogLesson) => {
    setActiveLesson(lesson)
    setPlayback(null)
    setActiveVideo(null)
    setLoadingPlayback(true)
    try {
      const res = await fetch(`/api/online-study/lessons/${lesson.id}/playback`)
      const data = await res.json()
      if (!res.ok || !data.success) {
        const msg = data?.error?.message || data?.error || "Không tải được video"
        throw new Error(typeof msg === "string" ? msg : "Playback failed")
      }
      const p = data.data as PlaybackPayload
      setPlayback(p)
      if (p.videos && p.videos.length > 0) {
        setActiveVideo(p.videos[0])
      }
    } catch (e) {
      console.error(e)
      toastError(
        e instanceof Error ? e.message : "Không mở được bài học. Thử lại sau."
      )
      setActiveLesson(null)
    } finally {
      setLoadingPlayback(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  const handleMarkCompleted = async (lessonId: string, completed = true) => {
    try {
      const res = await fetch("/api/online-study/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId, completed }),
      })
      if (res.ok) {
        fetchProgress()
        toastSuccess(completed ? "Đã đánh dấu hoàn thành" : "Đã bỏ hoàn thành")
      } else {
        toastError("Không lưu được tiến độ")
      }
    } catch (e) {
      console.error(e)
      toastError("Không lưu được tiến độ")
    }
  }

  const goUp = () => {
    if (!currentFolderId) return
    const cur = folders.find((f) => f.id === currentFolderId)
    setCurrentFolderId(cur?.parent_id ?? null)
  }

  const watermark = profile
    ? `${profile.full_name || "HV"} · ${(profile.email || "").split("@")[0] || ""}`
    : "StudyHub"

  if (isDevToolsOpen) {
    return (
      <div className="min-h-screen bg-[#0B0A13] flex flex-col items-center justify-center text-center p-6 select-none">
        <ShieldAlert className="h-10 w-10 text-red-400 mb-4" />
        <h1 className="text-xl font-bold text-[#F1EDF9]">Cảnh báo bảo mật</h1>
        <p className="text-sm text-[#8C87A2] max-w-md mt-3">
          Phát hiện DevTools. Đóng bảng điều khiển và tải lại trang để tiếp tục.
        </p>
        <Button onClick={() => window.location.reload()} className="mt-6 rounded-xl bg-[#C18CFF] text-[#0B0A13] font-bold">
          Tải lại trang
        </Button>
      </div>
    )
  }

  if (loadingAuth || (loadingData && hasAccess)) {
    return (
      <div className="min-h-screen bg-[#0B0A13] flex items-center justify-center">
        <Loading label="Đang tải học liệu…" />
      </div>
    )
  }

  if (!hasAccess) {
    return (
      <OnlineStudentShell>
        <OnlineStudentTopbar name={profile?.full_name} onLogout={handleLogout} />
        <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
          <ShieldAlert className="h-10 w-10 text-red-400 mb-3" />
          <h2 className="text-lg font-bold text-[#F1EDF9]">Chưa có quyền môn này</h2>
          <Link href="/online-student/dashboard" className="mt-4">
            <Button className="rounded-xl bg-[#C18CFF] text-[#0B0A13] font-bold">Về dashboard</Button>
          </Link>
        </div>
        <SupportFab />
      </OnlineStudentShell>
    )
  }

  // ========== LESSON PLAYER ==========
  if (activeLesson) {
    const docs = playback?.documents || []
    const vids = playback?.videos || []

    return (
      <OnlineStudentShell>
        <OnlineStudentTopbar name={profile?.full_name} onLogout={handleLogout} />
        <div className="mx-auto max-w-5xl w-full px-4 py-5 sm:px-6 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <Button
              variant="ghost"
              onClick={() => {
                setActiveLesson(null)
                setPlayback(null)
                setActiveVideo(null)
              }}
              className="rounded-xl border border-[#8C87A2]/25 text-[#8C87A2] hover:text-[#F1EDF9] text-xs"
            >
              <ArrowLeft className="h-4 w-4 mr-1" /> Về thư mục
            </Button>
            <span className="text-[10px] font-mono text-[#8C87A2]">
              {subjectInfo.icon} {subjectInfo.label}
            </span>
          </div>
          <div className="mb-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-200/90">
            Nội dung bản quyền StudyHub — cấm ghi hình, tải xuống, chia sẻ trái phép.
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#F1EDF9] mb-4">{activeLesson.title}</h1>

          {loadingPlayback ? (
            <div className="aspect-video rounded-xl border border-[#8C87A2]/20 bg-[#15131F] flex items-center justify-center">
              <Loading label="Đang tải video bảo mật…" />
            </div>
          ) : activeVideo ? (
            <div className="space-y-3">
              <ProtectedVideoPlayer
                url={activeVideo.url}
                watermarkText={watermark}
                onEnded={() => handleMarkCompleted(activeLesson.id)}
              />
              {activeVideo.title && (
                <p className="text-xs text-[#8C87A2]">Đang phát: {activeVideo.title}</p>
              )}
            </div>
          ) : (
            <div className="aspect-video rounded-xl border border-[#8C87A2]/20 bg-[#15131F] flex items-center justify-center text-[#8C87A2] text-sm">
              Bài này chưa có video
            </div>
          )}

          {vids.length > 1 && (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {vids.map((vid, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveVideo(vid)}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-xs font-semibold",
                    activeVideo?.url === vid.url
                      ? "border-[#C18CFF]/40 bg-[#C18CFF]/10 text-[#C18CFF]"
                      : "border-[#8C87A2]/20 bg-[#15131F] text-[#8C87A2]"
                  )}
                >
                  <PlayCircle className="h-4 w-4 shrink-0" />
                  <span className="truncate">{vid.title || `Video ${idx + 1}`}</span>
                </button>
              ))}
            </div>
          )}

          <div className="mt-5 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between rounded-xl border border-[#8C87A2]/15 bg-[#15131F] p-4">
            <p className="text-[11px] text-[#8C87A2]">Đánh dấu hoàn thành để theo dõi tiến độ.</p>
            <Button
              onClick={() =>
                handleMarkCompleted(activeLesson.id, !completedLessons.includes(activeLesson.id))
              }
              className={cn(
                "rounded-lg text-xs font-bold shrink-0",
                completedLessons.includes(activeLesson.id)
                  ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
                  : "bg-[#C18CFF] text-[#0B0A13]"
              )}
            >
              {completedLessons.includes(activeLesson.id) ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-1 inline" /> Đã hoàn thành
                </>
              ) : (
                "Đánh dấu hoàn thành"
              )}
            </Button>
          </div>

          {(playback?.description || activeLesson.description) && (
            <div className="mt-4 rounded-xl border border-[#8C87A2]/15 bg-[#15131F]/50 p-4">
              <p className="text-sm text-[#8C87A2] whitespace-pre-line">
                {playback?.description || activeLesson.description}
              </p>
            </div>
          )}

          <div className="mt-6">
            <h3 className="text-[10px] font-mono uppercase text-[#8C87A2] mb-3">Tài liệu</h3>
            {docs.length === 0 ? (
              <p className="text-xs text-[#8C87A2] italic">Không có tài liệu đính kèm.</p>
            ) : (
              <div className="space-y-2">
                {docs.map((doc, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-3 rounded-xl border border-[#8C87A2]/20 bg-[#0B0A13] p-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="h-5 w-5 text-[#C18CFF] shrink-0" />
                      <span className="text-sm font-semibold text-[#F1EDF9] truncate">
                        {doc.title || `Tài liệu ${idx + 1}`}
                      </span>
                    </div>
                    <a
                      href={`/api/online-study/lessons/${activeLesson.id}/document?index=${idx}&redirect=1`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button className="rounded-lg bg-[#C18CFF] text-[#0B0A13] text-xs font-bold">
                        <Download className="h-3.5 w-3.5 mr-1" /> Mở
                      </Button>
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-8 text-center">
            <a
              href={supportZaloUrlWithText(
                `Báo lỗi video — ${subjectInfo.label} — ${activeLesson.title}`
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs text-[#C18CFF] hover:underline"
            >
              <MessageCircle className="h-4 w-4" /> Báo lỗi qua Zalo
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
        <Footer />
        <SupportFab />
      </OnlineStudentShell>
    )
  }

  // ========== DRIVE EXPLORER (full page) ==========
  const empty = currentFolders.length === 0 && currentLessons.length === 0

  return (
    <OnlineStudentShell>
      <OnlineStudentTopbar name={profile?.full_name} onLogout={handleLogout} />

      <div className="mx-auto max-w-6xl w-full px-3 sm:px-6 py-5 flex-1 flex flex-col min-h-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/online-student/dashboard" className="shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl border border-[#8C87A2]/25 h-10 w-10 text-[#8C87A2]"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-[#F1EDF9] truncate flex items-center gap-2">
                <span>{subjectInfo.icon}</span> {subjectInfo.label}
              </h1>
              <p className="text-[11px] text-[#8C87A2] font-mono mt-0.5">
                Kho bài giảng · {folders.length} thư mục · {lessons.length} bài
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <div className="flex bg-[#15131F] border border-[#8C87A2]/20 rounded-xl p-1">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  viewMode === "grid" ? "bg-[#C18CFF]/15 text-[#C18CFF]" : "text-[#8C87A2]"
                )}
                title="Lưới"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  viewMode === "list" ? "bg-[#C18CFF]/15 text-[#C18CFF]" : "text-[#8C87A2]"
                )}
                title="Danh sách"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Toolbar: search + path (Drive style) */}
        <div className="rounded-2xl border border-[#8C87A2]/20 bg-[#15131F] p-3 sm:p-4 mb-4 space-y-3 shadow-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C87A2]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm trong thư mục hiện tại…"
              className="w-full rounded-xl border border-[#8C87A2]/20 bg-[#0B0A13] pl-10 pr-4 py-2.5 text-sm text-[#F1EDF9] placeholder-[#8C87A2] outline-none focus:ring-1 focus:ring-[#C18CFF]"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto text-sm scrollbar-none py-1">
            {currentFolderId && (
              <button
                type="button"
                onClick={goUp}
                className="mr-1 p-2 rounded-lg hover:bg-[#0B0A13] text-[#C18CFF] shrink-0"
                title="Lên một cấp"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setCurrentFolderId(null)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg shrink-0 font-semibold text-xs sm:text-sm",
                !currentFolderId
                  ? "bg-[#C18CFF]/15 text-[#C18CFF]"
                  : "text-[#8C87A2] hover:text-[#F1EDF9] hover:bg-[#0B0A13]"
              )}
            >
              <Home className="h-4 w-4" /> Gốc
            </button>
            {breadcrumbs.map((crumb, idx) => (
              <div key={crumb.id} className="flex items-center gap-1 shrink-0">
                <ChevronRight className="h-4 w-4 text-[#8C87A2]/50" />
                <button
                  type="button"
                  onClick={() => setCurrentFolderId(crumb.id)}
                  className={cn(
                    "px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold max-w-[160px] truncate",
                    idx === breadcrumbs.length - 1
                      ? "bg-[#C18CFF]/15 text-[#C18CFF]"
                      : "text-[#8C87A2] hover:text-[#F1EDF9] hover:bg-[#0B0A13]"
                  )}
                >
                  {crumb.name}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Full-page content area */}
        <div className="flex-1 min-h-[55vh] rounded-2xl border border-[#8C87A2]/15 bg-[#15131F]/40 p-4 sm:p-6">
          {empty ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <FolderOpenIcon className="h-14 w-14 text-[#8C87A2]/30 mb-3" />
              <p className="text-base font-bold text-[#F1EDF9]">Thư mục trống</p>
              <p className="text-xs text-[#8C87A2] mt-1 max-w-xs">
                {search
                  ? "Không có kết quả phù hợp."
                  : "Chưa có thư mục con hoặc bài giảng trong vị trí này."}
              </p>
              {currentFolderId && (
                <Button
                  onClick={goUp}
                  variant="outline"
                  className="mt-4 rounded-xl border-[#8C87A2]/30 text-[#F1EDF9] text-xs"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Lên thư mục cha
                </Button>
              )}
            </div>
          ) : viewMode === "grid" ? (
            <div className="space-y-8">
              {currentFolders.length > 0 && (
                <div>
                  <h3 className="text-[11px] font-mono uppercase tracking-wider text-[#8C87A2] mb-3">
                    Thư mục ({currentFolders.length})
                  </h3>
                  <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                    {currentFolders.map((folder) => (
                      <button
                        key={folder.id}
                        type="button"
                        onClick={() => {
                          setSearch("")
                          setCurrentFolderId(folder.id)
                        }}
                        className="group flex flex-col items-start gap-3 rounded-2xl border border-[#8C87A2]/15 bg-[#0B0A13]/50 p-4 min-h-[120px] text-left hover:border-[#C18CFF]/50 hover:bg-[#0B0A13] transition-all active:scale-[0.98]"
                      >
                        <FolderIcon className="h-10 w-10 text-[#C18CFF] group-hover:scale-105 transition-transform" />
                        <span className="text-sm font-bold text-[#F1EDF9] line-clamp-2 leading-snug w-full">
                          {folder.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {currentLessons.length > 0 && (
                <div>
                  <h3 className="text-[11px] font-mono uppercase tracking-wider text-[#8C87A2] mb-3">
                    Bài giảng ({currentLessons.length})
                  </h3>
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {currentLessons.map((lesson) => {
                      const done = completedLessons.includes(lesson.id)
                      const hasVideo =
                        lesson.has_video ||
                        (lesson.videos && lesson.videos.length > 0) ||
                        !!lesson.video_url
                      const hasDoc =
                        lesson.has_documents ||
                        (lesson.documents && lesson.documents.length > 0) ||
                        !!lesson.document_url
                      return (
                        <button
                          key={lesson.id}
                          type="button"
                          onClick={() => void openLesson(lesson)}
                          className="group flex flex-col gap-3 rounded-2xl border border-[#8C87A2]/15 bg-[#0B0A13]/40 p-5 text-left hover:border-[#C18CFF]/45 hover:bg-[#0B0A13] transition-all min-h-[130px] active:scale-[0.99]"
                        >
                          <div className="flex items-start justify-between w-full">
                            {done ? (
                              <CheckCircle2 className="h-9 w-9 text-emerald-400" />
                            ) : (
                              <PlayCircle className="h-9 w-9 text-[#8C87A2] group-hover:text-[#C18CFF] transition-colors" />
                            )}
                            <ChevronRight className="h-5 w-5 text-[#8C87A2] group-hover:text-[#C18CFF]" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-[#F1EDF9] line-clamp-2 leading-snug">
                              {lesson.title}
                            </p>
                            <div className="flex gap-2 mt-2 flex-wrap">
                              {hasVideo && (
                                <span className="text-[10px] font-bold uppercase text-[#C18CFF] bg-[#C18CFF]/10 px-2 py-0.5 rounded-md">
                                  Video
                                </span>
                              )}
                              {hasDoc && (
                                <span className="text-[10px] font-bold uppercase text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                                  Tài liệu
                                </span>
                              )}
                              {done && (
                                <span className="text-[10px] font-mono text-emerald-400/80">Đã học</span>
                              )}
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-[#8C87A2]/15 overflow-hidden divide-y divide-[#8C87A2]/10">
              {currentFolders.map((folder) => (
                <button
                  key={folder.id}
                  type="button"
                  onClick={() => {
                    setSearch("")
                    setCurrentFolderId(folder.id)
                  }}
                  className="w-full flex items-center gap-4 px-4 py-3.5 text-left hover:bg-[#0B0A13]/50 transition-colors"
                >
                  <FolderIcon className="h-6 w-6 text-[#C18CFF] shrink-0" />
                  <span className="flex-1 text-sm font-semibold text-[#F1EDF9] truncate">
                    {folder.name}
                  </span>
                  <span className="text-[10px] text-[#8C87A2] font-mono shrink-0">Thư mục</span>
                  <ChevronRight className="h-4 w-4 text-[#8C87A2]" />
                </button>
              ))}
              {currentLessons.map((lesson) => {
                const done = completedLessons.includes(lesson.id)
                return (
                  <button
                    key={lesson.id}
                    type="button"
                    onClick={() => void openLesson(lesson)}
                    className="w-full flex items-center gap-4 px-4 py-3.5 text-left hover:bg-[#0B0A13]/50 transition-colors"
                  >
                    {done ? (
                      <CheckCircle2 className="h-6 w-6 text-emerald-400 shrink-0" />
                    ) : (
                      <PlayCircle className="h-6 w-6 text-[#8C87A2] shrink-0" />
                    )}
                    <span className="flex-1 text-sm font-semibold text-[#F1EDF9] truncate">
                      {lesson.title}
                    </span>
                    <span className="text-[10px] text-[#8C87A2] font-mono shrink-0">Bài giảng</span>
                    <ChevronRight className="h-4 w-4 text-[#8C87A2]" />
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <Footer />
      <SupportFab />
    </OnlineStudentShell>
  )
}

export default function OnlineStudentStudyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0B0A13] flex items-center justify-center">
          <Loading label="Đang mở kho bài giảng…" />
        </div>
      }
    >
      <StudyPageInner />
    </Suspense>
  )
}
