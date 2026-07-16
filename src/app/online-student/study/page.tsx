"use client"

import { useEffect, useState, useMemo, Suspense } from "react"
import dynamic from "next/dynamic"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { OnlineStudentShell } from "@/components/online-student/OnlineStudentShell"
import { OnlineStudentTopbar } from "@/components/online-student/OnlineStudentTopbar"
import { Loading } from "@/components/shared/Loading"

const ProtectedVideoPlayer = dynamic(
  () =>
    import("@/components/exam/ProtectedVideoPlayer").then((m) => m.ProtectedVideoPlayer),
  {
    ssr: false,
    loading: () => (
      <div className="aspect-video rounded-xl border border-[var(--os-border)] bg-[var(--os-card)] flex items-center justify-center">
        <Loading label="Đang tải trình phát…" />
      </div>
    ),
  }
)
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
import { CopyrightNotice } from "@/components/Footer"
import { cn } from "@/lib/utils"
import { cacheGet, cacheSet } from "@/lib/client-swr-cache"
import {
  getOnlineLessonMediaKind,
  getOnlineLessonTypeLabel,
  isDocumentLesson,
} from "@/lib/online-lesson-kind"
import { EmptyState } from "@/components/online-student/EmptyState"
import { ErrorState } from "@/components/online-student/ErrorState"
import {
  hasOnlineSubjectAccess,
  onlineStudyFetch,
} from "@/lib/online-study-client"

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
  source_kind?: string | null
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
  /** folder = current folder only; subject = entire subject tree */
  const [searchScope, setSearchScope] = useState<"folder" | "subject">("folder")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [activeLesson, setActiveLesson] = useState<CatalogLesson | null>(null)
  const [playback, setPlayback] = useState<PlaybackPayload | null>(null)
  const [loadingPlayback, setLoadingPlayback] = useState(false)
  const [activeVideo, setActiveVideo] = useState<{ title: string; url: string } | null>(null)

  // Soft keyboard deterrents only. Do NOT use outerWidth/innerWidth heuristics:
  // browser zoom, DPI scale, and OS chrome all trigger false "DevTools" locks.
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
        const res = await onlineStudyFetch("/api/online-study/my-subjects")
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
    return hasOnlineSubjectAccess(mySubjects, subjectKey)
  }, [loadingAuth, mySubjects, subjectKey])

  useEffect(() => {
    if (!loadingAuth && !hasAccess) router.replace("/online-student/dashboard")
  }, [loadingAuth, hasAccess, router])

  const fetchProgress = async () => {
    try {
      const res = await onlineStudyFetch("/api/online-study/progress")
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
      const cacheKey = `catalog:${subjectInfo.dbValue}`
      const cached = cacheGet<{ folders: DbFolder[]; lessons: CatalogLesson[] }>(
        cacheKey,
        45_000
      )
      if (cached) {
        setFolders(cached.folders)
        setLessons(cached.lessons)
        setLoadingData(false)
      }
      try {
        const [rf, rl] = await Promise.all([
          onlineStudyFetch(`/api/online-study/folders?subject=${subjectInfo.dbValue}`),
          onlineStudyFetch(`/api/online-study/lessons?subject=${subjectInfo.dbValue}`),
        ])
        // Device lock → guard will sign out; subject lock → dashboard
        if (rf.status === 409 || rl.status === 409) return
        if (rf.status === 403 || rl.status === 403) {
          const body = await rf
            .clone()
            .json()
            .catch(() => null)
          const code = body?.error?.code as string | undefined
          if (code === "DEVICE_REQUIRED" || code === "DEVICE_CONFLICT") return
          router.replace("/online-student/dashboard")
          return
        }
        const [df, dl] = await Promise.all([rf.json(), rl.json()])
        const folderList: DbFolder[] = rf.ok && df.success ? df.data || [] : []
        const lessonList: CatalogLesson[] = rl.ok && dl.success ? dl.data || [] : []
        setFolders(folderList)
        setLessons(lessonList)
        cacheSet(cacheKey, { folders: folderList, lessons: lessonList })
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
    // Full-subject search shows results in a separate panel; keep folder browse clean
    if (q && searchScope === "folder") {
      list = list.filter((f) => f.name.toLowerCase().includes(q))
    }
    return list.sort((a, b) => {
      if (a.order_index !== b.order_index) return a.order_index - b.order_index
      return String(a.name || "").localeCompare(String(b.name || ""), "vi", {
        numeric: true,
        sensitivity: "base",
      })
    })
  }, [folders, currentFolderId, search, searchScope])

  const currentLessons = useMemo(() => {
    let list = lessons.filter((l) => l.folder_id === currentFolderId)
    const q = search.trim().toLowerCase()
    if (q && searchScope === "folder") {
      list = list.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          (l.description || "").toLowerCase().includes(q)
      )
    }
    return list.sort((a, b) => {
      if (a.order_index !== b.order_index) return a.order_index - b.order_index
      return String(a.title || "").localeCompare(String(b.title || ""), "vi", {
        numeric: true,
        sensitivity: "base",
      })
    })
  }, [lessons, currentFolderId, search, searchScope])

  const subjectSearchResults = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q || searchScope !== "subject") {
      return { folders: [] as DbFolder[], lessons: [] as CatalogLesson[] }
    }
    const matchedFolders = folders
      .filter((f) => f.name.toLowerCase().includes(q))
      .slice(0, 40)
    const matchedLessons = lessons
      .filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          (l.description || "").toLowerCase().includes(q)
      )
      .slice(0, 60)
    return { folders: matchedFolders, lessons: matchedLessons }
  }, [search, searchScope, folders, lessons])

  const openLesson = async (lesson: CatalogLesson) => {
    setActiveLesson(lesson)
    setPlayback(null)
    setActiveVideo(null)
    setLoadingPlayback(true)
    try {
      const res = await onlineStudyFetch(`/api/online-study/lessons/${lesson.id}/playback`)
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
      const res = await onlineStudyFetch("/api/online-study/progress", {
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

  if (loadingAuth || (loadingData && hasAccess)) {
    return (
      <div className="min-h-screen bg-[var(--os-bg)] flex items-center justify-center">
        <Loading label="Đang tải học liệu…" />
      </div>
    )
  }

  if (!hasAccess) {
    return (
      <OnlineStudentShell supportMessage="Hỗ trợ StudyHub - chưa có quyền môn học">
        <OnlineStudentTopbar name={profile?.full_name} onLogout={handleLogout} />
        <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
          <ShieldAlert className="h-10 w-10 text-[var(--os-danger)] mb-3" />
          <h2 className="text-lg font-bold text-[var(--os-fg)]">Chưa có quyền môn này</h2>
          <p className="mt-2 max-w-sm text-sm text-[var(--os-muted)]">
            Mua khóa hoặc liên hệ hỗ trợ nếu em đã thanh toán.
          </p>
          <Link href="/online-student/dashboard" className="mt-4">
            <Button className="rounded-xl bg-[var(--os-accent)] text-[var(--os-accent-fg)] font-bold">Về dashboard</Button>
          </Link>
        </div>
      </OnlineStudentShell>
    )
  }

  // ========== LESSON PLAYER ==========
  if (activeLesson) {
    const docs = playback?.documents || []
    const vids = playback?.videos || []

    return (
      <OnlineStudentShell supportMessage={`Báo lỗi video — ${subjectInfo.label} — ${activeLesson.title}`}>
        <OnlineStudentTopbar name={profile?.full_name} onLogout={handleLogout} />
        <div className="mx-auto max-w-6xl w-full px-4 py-5 sm:px-6 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <Button
              variant="ghost"
              onClick={() => {
                setActiveLesson(null)
                setPlayback(null)
                setActiveVideo(null)
              }}
              className="rounded-xl border border-[var(--os-muted)]/25 text-[var(--os-muted)] hover:text-[var(--os-fg)] text-xs"
            >
              <ArrowLeft className="h-4 w-4 mr-1" /> Về thư mục
            </Button>
            <span className="text-[10px] font-mono text-[var(--os-muted)]">
              {subjectInfo.icon} {subjectInfo.label}
            </span>
          </div>
          <div className="mb-3 rounded-xl border border-[var(--os-warning)]/25 bg-[var(--os-warning)]/10 px-3 py-2">
            <CopyrightNotice className="text-[var(--os-fg)]/90" />
          </div>
          <h1 className="os-content-text text-xl sm:text-2xl font-bold text-[var(--os-fg)] mb-4 text-balance">
            {activeLesson.title}
          </h1>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
            <div className="min-w-0 space-y-4">
              {loadingPlayback ? (
                <div className="aspect-video rounded-xl border border-[var(--os-muted)]/20 bg-[var(--os-card)] flex items-center justify-center">
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
                    <p className="text-xs text-[var(--os-muted)]">Đang phát: {activeVideo.title}</p>
                  )}
                </div>
              ) : (
                <div className="aspect-video rounded-xl border border-[var(--os-muted)]/20 bg-[var(--os-card)] flex items-center justify-center text-[var(--os-muted)] text-sm">
                  Bài này chưa có video
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between rounded-xl border border-[var(--os-muted)]/15 bg-[var(--os-card)] p-4">
                <p className="text-[11px] text-[var(--os-muted)]">
                  Đánh dấu hoàn thành để theo dõi tiến độ.
                </p>
                <Button
                  onClick={() =>
                    handleMarkCompleted(activeLesson.id, !completedLessons.includes(activeLesson.id))
                  }
                  className={cn(
                    "rounded-lg text-xs font-bold shrink-0",
                    completedLessons.includes(activeLesson.id)
                      ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
                      : "bg-[var(--os-accent)] text-[var(--os-accent-fg)]"
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
                <div className="rounded-xl border border-[var(--os-muted)]/15 bg-[var(--os-card)]/50 p-4">
                  <p className="text-sm text-[var(--os-muted)] whitespace-pre-line">
                    {playback?.description || activeLesson.description}
                  </p>
                </div>
              )}

              <div className="text-center sm:text-left">
                <a
                  href={supportZaloUrlWithText(
                    `Báo lỗi video — ${subjectInfo.label} — ${activeLesson.title}`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-xs text-[var(--os-accent)] hover:underline"
                >
                  <MessageCircle className="h-4 w-4" /> Báo lỗi qua Zalo
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>

            {/* Sidebar: playlist + documents */}
            <aside className="space-y-4 lg:sticky lg:top-24">
              {vids.length > 0 && (
                <div className="rounded-2xl border border-[var(--os-border)] bg-[var(--os-card)] p-3">
                  <h3 className="text-[10px] font-mono uppercase text-[var(--os-muted)] mb-2 px-1">
                    Video ({vids.length})
                  </h3>
                  <div className="space-y-1.5 max-h-64 overflow-y-auto">
                    {vids.map((vid, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActiveVideo(vid)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-xs font-semibold",
                          activeVideo?.url === vid.url
                            ? "border-[var(--os-accent)]/40 bg-[var(--os-accent)]/10 text-[var(--os-accent)]"
                            : "border-[var(--os-muted)]/20 bg-[var(--os-bg)] text-[var(--os-muted)] hover:text-[var(--os-fg)]"
                        )}
                      >
                        <PlayCircle className="h-4 w-4 shrink-0" />
                        <span className="truncate">{vid.title || `Video ${idx + 1}`}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-[var(--os-border)] bg-[var(--os-card)] p-3">
                <h3 className="text-[10px] font-mono uppercase text-[var(--os-muted)] mb-2 px-1">
                  Tài liệu ({docs.length})
                </h3>
                {docs.length === 0 ? (
                  <p className="text-xs text-[var(--os-muted)] italic px-1 py-2">
                    Không có tài liệu đính kèm.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {docs.map((doc, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-2 rounded-xl border border-[var(--os-muted)]/20 bg-[var(--os-bg)] p-2.5"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-4 w-4 text-[var(--os-accent)] shrink-0" />
                          <span className="text-xs font-semibold text-[var(--os-fg)] truncate">
                            {doc.title || `Tài liệu ${idx + 1}`}
                          </span>
                        </div>
                        <a
                          href={`/api/online-study/lessons/${activeLesson.id}/document?index=${idx}&redirect=1`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button
                            size="sm"
                            className="rounded-lg bg-[var(--os-accent)] text-[var(--os-accent-fg)] text-[10px] font-bold h-8"
                          >
                            <Download className="h-3 w-3 mr-0.5" /> Mở
                          </Button>
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </aside>
          </div>
        </div>
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
                className="rounded-xl border border-[var(--os-muted)]/25 h-10 w-10 text-[var(--os-muted)]"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-[var(--os-fg)] truncate flex items-center gap-2">
                <span>{subjectInfo.icon}</span> {subjectInfo.label}
              </h1>
              <p className="text-[11px] text-[var(--os-muted)] font-mono mt-0.5">
                Kho bài giảng · {folders.length} thư mục · {lessons.length} bài
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <div className="flex bg-[var(--os-card)] border border-[var(--os-muted)]/20 rounded-xl p-1">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  viewMode === "grid" ? "bg-[var(--os-accent)]/15 text-[var(--os-accent)]" : "text-[var(--os-muted)]"
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
                  viewMode === "list" ? "bg-[var(--os-accent)]/15 text-[var(--os-accent)]" : "text-[var(--os-muted)]"
                )}
                title="Danh sách"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Toolbar: search + path (Drive style) */}
        <div className="rounded-2xl border border-[var(--os-muted)]/20 bg-[var(--os-card)] p-3 sm:p-4 mb-4 space-y-3 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--os-muted)]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  searchScope === "subject"
                    ? "Tìm trong cả môn…"
                    : "Tìm trong thư mục hiện tại…"
                }
                className="w-full rounded-xl border border-[var(--os-muted)]/20 bg-[var(--os-bg)] pl-10 pr-4 py-2.5 text-sm text-[var(--os-fg)] placeholder-[var(--os-muted)] outline-none focus:ring-1 focus:ring-[var(--os-accent)]"
              />
            </div>
            <div className="flex rounded-xl border border-[var(--os-border)] bg-[var(--os-bg)] p-1 shrink-0">
              <button
                type="button"
                onClick={() => setSearchScope("folder")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors",
                  searchScope === "folder"
                    ? "bg-[var(--os-accent)]/15 text-[var(--os-accent)]"
                    : "text-[var(--os-muted)]"
                )}
              >
                Thư mục
              </button>
              <button
                type="button"
                onClick={() => setSearchScope("subject")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors",
                  searchScope === "subject"
                    ? "bg-[var(--os-accent)]/15 text-[var(--os-accent)]"
                    : "text-[var(--os-muted)]"
                )}
              >
                Cả môn
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1 overflow-x-auto text-sm scrollbar-none py-1">
            {currentFolderId && (
              <button
                type="button"
                onClick={goUp}
                className="mr-1 p-2 rounded-lg hover:bg-[var(--os-bg)] text-[var(--os-accent)] shrink-0"
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
                  ? "bg-[var(--os-accent)]/15 text-[var(--os-accent)]"
                  : "text-[var(--os-muted)] hover:text-[var(--os-fg)] hover:bg-[var(--os-bg)]"
              )}
            >
              <Home className="h-4 w-4" /> Gốc
            </button>
            {breadcrumbs.map((crumb, idx) => (
              <div key={crumb.id} className="flex items-center gap-1 shrink-0">
                <ChevronRight className="h-4 w-4 text-[var(--os-muted)]/50" />
                <button
                  type="button"
                  onClick={() => setCurrentFolderId(crumb.id)}
                  className={cn(
                    "px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold max-w-[160px] truncate",
                    idx === breadcrumbs.length - 1
                      ? "bg-[var(--os-accent)]/15 text-[var(--os-accent)]"
                      : "text-[var(--os-muted)] hover:text-[var(--os-fg)] hover:bg-[var(--os-bg)]"
                  )}
                >
                  {crumb.name}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Full-page content area */}
        <div className="flex-1 min-h-[55vh] rounded-2xl border border-[var(--os-muted)]/15 bg-[var(--os-card)]/40 p-4 sm:p-6">
          {search.trim() && searchScope === "subject" ? (
            subjectSearchResults.folders.length === 0 &&
            subjectSearchResults.lessons.length === 0 ? (
              <EmptyState
                icon={<Search />}
                title="Không có kết quả trong môn"
                description="Thử từ khóa khác hoặc chuyển sang tìm trong thư mục."
                className="border-0 bg-transparent py-16"
              />
            ) : (
              <div className="space-y-8">
                {subjectSearchResults.folders.length > 0 && (
                  <div>
                    <h3 className="text-[11px] font-mono uppercase tracking-wider text-[var(--os-muted)] mb-3">
                      Thư mục ({subjectSearchResults.folders.length})
                    </h3>
                    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                      {subjectSearchResults.folders.map((folder) => (
                        <button
                          key={folder.id}
                          type="button"
                          onClick={() => {
                            setCurrentFolderId(folder.id)
                            setSearch("")
                            setSearchScope("folder")
                          }}
                          className="flex items-center gap-3 rounded-xl border border-[var(--os-border)] bg-[var(--os-bg)]/50 px-4 py-3 text-left hover:border-[var(--os-accent)]/40"
                        >
                          <FolderIcon className="h-5 w-5 text-[var(--os-accent)] shrink-0" />
                          <span className="text-sm font-semibold text-[var(--os-fg)] truncate">
                            <span className="os-content-text">{folder.name}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {subjectSearchResults.lessons.length > 0 && (
                  <div>
                    <h3 className="text-[11px] font-mono uppercase tracking-wider text-[var(--os-muted)] mb-3">
                      Nội dung ({subjectSearchResults.lessons.length})
                    </h3>
                    <div className="space-y-2">
                      {subjectSearchResults.lessons.map((lesson) => (
                        <button
                          key={lesson.id}
                          type="button"
                          onClick={() => {
                            setCurrentFolderId(lesson.folder_id)
                            void openLesson(lesson)
                          }}
                          className="flex w-full items-center gap-3 rounded-xl border border-[var(--os-border)] bg-[var(--os-bg)]/50 px-4 py-3 text-left hover:border-[var(--os-accent)]/40"
                        >
                          {isDocumentLesson(lesson) ? (
                            <FileText className="h-5 w-5 text-emerald-400 shrink-0" />
                          ) : (
                            <PlayCircle className="h-5 w-5 text-[var(--os-accent)] shrink-0" />
                          )}
                          <span className="text-sm font-semibold text-[var(--os-fg)] truncate">
                            {lesson.title}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          ) : empty ? (
            <EmptyState
              icon={<FolderOpenIcon />}
              title={search ? "Không có kết quả" : "Thư mục trống"}
              description={
                search
                  ? "Thử từ khóa khác hoặc tìm trong cả môn."
                  : "Chưa có thư mục con hoặc bài giảng trong vị trí này."
              }
              action={
                currentFolderId ? (
                  <Button
                    onClick={goUp}
                    variant="outline"
                    className="rounded-xl border-[var(--os-border)] text-[var(--os-fg)] text-xs min-h-11"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" /> Lên thư mục cha
                  </Button>
                ) : undefined
              }
              className="border-0 bg-transparent py-16"
            />
          ) : viewMode === "grid" ? (
            <div className="space-y-8">
              {currentFolders.length > 0 && (
                <div>
                  <h3 className="text-[11px] font-mono uppercase tracking-wider text-[var(--os-muted)] mb-3">
                    Thư mục ({currentFolders.length})
                  </h3>
                  <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                    {currentFolders.map((folder) => (
                      <button
                        key={folder.id}
                        type="button"
                        aria-label={`Mở thư mục ${folder.name}`}
                        onClick={() => {
                          setSearch("")
                          setCurrentFolderId(folder.id)
                        }}
                        className="group flex flex-col items-start gap-3 rounded-2xl border border-[var(--os-muted)]/15 bg-[var(--os-bg)]/50 p-4 min-h-[120px] text-left hover:border-[var(--os-accent)]/50 hover:bg-[var(--os-bg)] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[var(--os-accent)]/50"
                      >
                        <FolderIcon className="h-10 w-10 text-[var(--os-accent)] group-hover:scale-105 transition-transform" />
                        <span className="text-sm font-bold text-[var(--os-fg)] line-clamp-2 leading-snug w-full">
                          {folder.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {currentLessons.length > 0 && (
                <div>
                  <h3 className="text-[11px] font-mono uppercase tracking-wider text-[var(--os-muted)] mb-3">
                    Nội dung ({currentLessons.length})
                    <span className="font-normal normal-case ml-2 opacity-80">
                      · {currentLessons.filter((l) => getOnlineLessonMediaKind(l) !== "document").length} bài giảng
                      · {currentLessons.filter((l) => isDocumentLesson(l)).length} tài liệu
                    </span>
                  </h3>
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {currentLessons.map((lesson) => {
                      const done = completedLessons.includes(lesson.id)
                      const isDoc = isDocumentLesson(lesson)
                      const typeLabel = getOnlineLessonTypeLabel(lesson)
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
                          aria-label={`${done ? "Đã học · " : ""}Mở ${typeLabel} ${lesson.title}`}
                          onClick={() => void openLesson(lesson)}
                          className="group flex flex-col gap-3 rounded-2xl border border-[var(--os-muted)]/15 bg-[var(--os-bg)]/40 p-5 text-left hover:border-[var(--os-accent)]/45 hover:bg-[var(--os-bg)] transition-all min-h-[130px] active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-[var(--os-accent)]/50"
                        >
                          <div className="flex items-start justify-between w-full">
                            {done ? (
                              <CheckCircle2 className="h-9 w-9 text-emerald-400" />
                            ) : isDoc ? (
                              <FileText className="h-9 w-9 text-emerald-400/80 group-hover:text-emerald-400 transition-colors" />
                            ) : (
                              <PlayCircle className="h-9 w-9 text-[var(--os-muted)] group-hover:text-[var(--os-accent)] transition-colors" />
                            )}
                            <ChevronRight className="h-5 w-5 text-[var(--os-muted)] group-hover:text-[var(--os-accent)]" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-[var(--os-fg)] line-clamp-2 leading-snug">
                              {lesson.title}
                            </p>
                            <div className="flex gap-2 mt-2 flex-wrap">
                              <span
                                className={cn(
                                  "text-[10px] font-bold uppercase px-2 py-0.5 rounded-md",
                                  isDoc
                                    ? "text-emerald-400 bg-emerald-500/10"
                                    : "text-[var(--os-accent)] bg-[var(--os-accent)]/10"
                                )}
                              >
                                {typeLabel}
                              </span>
                              {hasVideo && (
                                <span className="text-[10px] font-bold uppercase text-[var(--os-accent)] bg-[var(--os-accent)]/10 px-2 py-0.5 rounded-md">
                                  Video
                                </span>
                              )}
                              {hasDoc && (
                                <span className="text-[10px] font-bold uppercase text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                                  PDF
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
            <div className="rounded-xl border border-[var(--os-muted)]/15 overflow-hidden divide-y divide-[var(--os-muted)]/10">
              {currentFolders.map((folder) => (
                <button
                  key={folder.id}
                  type="button"
                  onClick={() => {
                    setSearch("")
                    setCurrentFolderId(folder.id)
                  }}
                  className="w-full flex items-center gap-4 px-4 py-3.5 text-left hover:bg-[var(--os-bg)]/50 transition-colors"
                >
                  <FolderIcon className="h-6 w-6 text-[var(--os-accent)] shrink-0" />
                  <span className="flex-1 text-sm font-semibold text-[var(--os-fg)] truncate">
                    {folder.name}
                  </span>
                  <span className="text-[10px] text-[var(--os-muted)] font-mono shrink-0">Thư mục</span>
                  <ChevronRight className="h-4 w-4 text-[var(--os-muted)]" />
                </button>
              ))}
              {currentLessons.map((lesson) => {
                const done = completedLessons.includes(lesson.id)
                const isDoc = isDocumentLesson(lesson)
                const typeLabel = getOnlineLessonTypeLabel(lesson)
                return (
                  <button
                    key={lesson.id}
                    type="button"
                    onClick={() => void openLesson(lesson)}
                    className="w-full flex items-center gap-4 px-4 py-3.5 text-left hover:bg-[var(--os-bg)]/50 transition-colors"
                  >
                    {done ? (
                      <CheckCircle2 className="h-6 w-6 text-emerald-400 shrink-0" />
                    ) : isDoc ? (
                      <FileText className="h-6 w-6 text-emerald-400 shrink-0" />
                    ) : (
                      <PlayCircle className="h-6 w-6 text-[var(--os-muted)] shrink-0" />
                    )}
                    <span className="flex-1 text-sm font-semibold text-[var(--os-fg)] truncate">
                      {lesson.title}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] font-mono shrink-0",
                        isDoc ? "text-emerald-400" : "text-[var(--os-muted)]"
                      )}
                    >
                      {typeLabel}
                    </span>
                    <ChevronRight className="h-4 w-4 text-[var(--os-muted)]" />
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

    </OnlineStudentShell>
  )
}

export default function OnlineStudentStudyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--os-bg)] flex items-center justify-center">
          <Loading label="Đang mở kho bài giảng…" />
        </div>
      }
    >
      <StudyPageInner />
    </Suspense>
  )
}
