"use client"

import { useEffect, useState, useMemo, Suspense, useCallback } from "react"
import dynamic from "next/dynamic"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { OnlineStudentShell } from "@/components/online-student/OnlineStudentShell"
import { OnlineStudentTopbar } from "@/components/online-student/OnlineStudentTopbar"
import { Loading } from "@/components/shared/Loading"
import { getOnlineSubjectInfo } from "@/lib/subjects"
import { supportZaloUrlWithText } from "@/lib/support"
import {
  PlayCircle,
  FileText,
  ChevronRight,
  ChevronLeft,
  Download,
  ArrowLeft,
  ShieldAlert,
  Search,
  CheckCircle2,
  MessageCircle,
  ExternalLink,
  List,
  X,
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast"
import { CopyrightNotice } from "@/components/Footer"
import { cn } from "@/lib/utils"
import { cacheGet, cacheSet } from "@/lib/client-swr-cache"
import { EmptyState } from "@/components/online-student/EmptyState"
import {
  hasOnlineSubjectAccess,
  onlineStudyFetch,
} from "@/lib/online-study-client"

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

interface DbFolder {
  id: string
  name: string
  parent_id: string | null
  subject: string
  order_index: number
}

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
}

interface PlaybackPayload {
  lesson_id: string
  title: string
  description: string | null
  videos: Array<{ title: string; url: string }>
  documents: Array<{ title: string; url: string }>
}

type CourseSection = {
  id: string
  name: string
  lessons: CatalogLesson[]
}

function sortByOrder<T extends { order_index: number; name?: string; title?: string }>(
  list: T[],
  labelKey: "name" | "title"
): T[] {
  return [...list].sort((a, b) => {
    if (a.order_index !== b.order_index) return a.order_index - b.order_index
    const la = String((labelKey === "name" ? a.name : a.title) || "")
    const lb = String((labelKey === "name" ? b.name : b.title) || "")
    return la.localeCompare(lb, "vi", { numeric: true, sensitivity: "base" })
  })
}

/** Build 1–2 level course outline from folder tree. */
function buildCourseSections(folders: DbFolder[], lessons: CatalogLesson[]): CourseSection[] {
  const roots = sortByOrder(
    folders.filter((f) => f.parent_id === null),
    "name"
  )

  const collectLessonIdsInSubtree = (folderId: string): string[] => {
    const ids: string[] = []
    const stack = [folderId]
    while (stack.length) {
      const id = stack.pop()!
      for (const l of lessons) {
        if (l.folder_id === id) ids.push(l.id)
      }
      for (const f of folders) {
        if (f.parent_id === id) stack.push(f.id)
      }
    }
    return ids
  }

  if (roots.length === 0) {
    const rootLessons = sortByOrder(
      lessons.filter((l) => !l.folder_id || !folders.some((f) => f.id === l.folder_id)),
      "title"
    )
    const orphan = sortByOrder(lessons, "title")
    const list = rootLessons.length ? rootLessons : orphan
    return list.length
      ? [{ id: "_all", name: "Tất cả bài học", lessons: list }]
      : []
  }

  const sections: CourseSection[] = roots.map((root) => {
    const idSet = new Set(collectLessonIdsInSubtree(root.id))
    const sectionLessons = sortByOrder(
      lessons.filter((l) => idSet.has(l.id)),
      "title"
    )
    return { id: root.id, name: root.name, lessons: sectionLessons }
  })

  // Lessons not under any root
  const covered = new Set(sections.flatMap((s) => s.lessons.map((l) => l.id)))
  const rest = sortByOrder(
    lessons.filter((l) => !covered.has(l.id)),
    "title"
  )
  if (rest.length) {
    sections.push({ id: "_other", name: "Khác", lessons: rest })
  }

  return sections.filter((s) => s.lessons.length > 0)
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
  const [search, setSearch] = useState("")
  const [activeLesson, setActiveLesson] = useState<CatalogLesson | null>(null)
  const [playback, setPlayback] = useState<PlaybackPayload | null>(null)
  const [loadingPlayback, setLoadingPlayback] = useState(false)
  const [activeVideo, setActiveVideo] = useState<{ title: string; url: string } | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showTour, setShowTour] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (typeof window === "undefined") return
    localStorage.setItem("drive_last_subject", subjectKey)
    if (!localStorage.getItem("study_tour_v1")) setShowTour(true)
    const lid = localStorage.getItem(`drive_lesson_id_${subjectKey}`)
    if (lid) {
      ;(window as unknown as { __pendingLessonId?: string }).__pendingLessonId = lid
    }
  }, [subjectKey])

  useEffect(() => {
    if (typeof window === "undefined") return
    if (activeLesson) localStorage.setItem(`drive_lesson_id_${subjectKey}`, activeLesson.id)
  }, [activeLesson, subjectKey])

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

  const openLesson = useCallback(
    async (lesson: CatalogLesson) => {
      setActiveLesson(lesson)
      setPlayback(null)
      setActiveVideo(null)
      setLoadingPlayback(true)
      setSidebarOpen(false)
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
    },
    [toastError]
  )

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
          if (found) void openLesson(found)
          delete (window as unknown as { __pendingLessonId?: string }).__pendingLessonId
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoadingData(false)
      }
    })()
  }, [loadingAuth, hasAccess, subjectInfo.dbValue, router, openLesson])

  const sections = useMemo(
    () => buildCourseSections(folders, lessons),
    [folders, lessons]
  )

  const flatLessons = useMemo(
    () => sections.flatMap((s) => s.lessons),
    [sections]
  )

  // Auto-open first incomplete lesson when nothing active
  useEffect(() => {
    if (loadingData || activeLesson || flatLessons.length === 0) return
    const pending = (window as unknown as { __pendingLessonId?: string }).__pendingLessonId
    if (pending) return
    const firstOpen =
      flatLessons.find((l) => !completedLessons.includes(l.id)) || flatLessons[0]
    if (firstOpen) void openLesson(firstOpen)
  }, [loadingData, activeLesson, flatLessons, completedLessons, openLesson])

  useEffect(() => {
    if (sections.length === 0) return
    setExpandedSections((prev) => {
      const next = { ...prev }
      for (const s of sections) {
        if (next[s.id] === undefined) next[s.id] = true
      }
      return next
    })
  }, [sections])

  const filteredSections = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return sections
    return sections
      .map((s) => ({
        ...s,
        lessons: s.lessons.filter(
          (l) =>
            l.title.toLowerCase().includes(q) ||
            (l.description || "").toLowerCase().includes(q) ||
            s.name.toLowerCase().includes(q)
        ),
      }))
      .filter((s) => s.lessons.length > 0)
  }, [sections, search])

  const activeIndex = useMemo(() => {
    if (!activeLesson) return -1
    return flatLessons.findIndex((l) => l.id === activeLesson.id)
  }, [flatLessons, activeLesson])

  const prevLesson = activeIndex > 0 ? flatLessons[activeIndex - 1] : null
  const nextLesson =
    activeIndex >= 0 && activeIndex < flatLessons.length - 1
      ? flatLessons[activeIndex + 1]
      : null

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
        if (completed && nextLesson) {
          // soft suggest next — don't auto-jump
        }
      } else {
        toastError("Không lưu được tiến độ")
      }
    } catch (e) {
      console.error(e)
      toastError("Không lưu được tiến độ")
    }
  }

  const watermark = profile
    ? `${profile.full_name || "HV"} · ${(profile.email || "").split("@")[0] || ""}`
    : "StudyHub"

  const dismissTour = () => {
    localStorage.setItem("study_tour_v1", "1")
    setShowTour(false)
  }

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
            <Button className="rounded-xl bg-[var(--os-accent)] text-[var(--os-accent-fg)] font-bold">
              Về dashboard
            </Button>
          </Link>
        </div>
      </OnlineStudentShell>
    )
  }

  if (flatLessons.length === 0) {
    return (
      <OnlineStudentShell>
        <OnlineStudentTopbar name={profile?.full_name} onLogout={handleLogout} />
        <div className="mx-auto max-w-lg px-4 py-16">
          <EmptyState
            title="Chưa có bài học"
            description="Môn này chưa có nội dung. Quay lại sau nhé."
          />
          <div className="mt-4 text-center">
            <Link href="/online-student/dashboard">
              <Button variant="outline" className="rounded-xl">
                Về dashboard
              </Button>
            </Link>
          </div>
        </div>
      </OnlineStudentShell>
    )
  }

  const docs = playback?.documents || []
  const vids = playback?.videos || []
  const doneCount = flatLessons.filter((l) => completedLessons.includes(l.id)).length
  const progressPct = flatLessons.length
    ? Math.round((doneCount / flatLessons.length) * 100)
    : 0

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="border-b border-[var(--os-border)] p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-[var(--os-fg)] truncate">
            {subjectInfo.icon} {subjectInfo.label}
          </p>
          <button
            type="button"
            className="lg:hidden p-1.5 rounded-lg text-[var(--os-muted)]"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-[10px] text-[var(--os-muted)]">
          {doneCount}/{flatLessons.length} bài · {progressPct}%
        </p>
        <div className="h-1.5 rounded-full bg-[var(--os-muted)]/20 overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--os-accent)] transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--os-muted)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm bài…"
            className="w-full rounded-lg border border-[var(--os-border)] bg-[var(--os-bg)] py-2 pl-8 pr-2 text-xs outline-none focus:ring-1 focus:ring-[var(--os-accent)]"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredSections.map((section) => (
          <div key={section.id}>
            <button
              type="button"
              onClick={() =>
                setExpandedSections((p) => ({ ...p, [section.id]: !p[section.id] }))
              }
              className="flex w-full items-center gap-1 rounded-lg px-2 py-1.5 text-left text-[11px] font-bold uppercase tracking-wide text-[var(--os-muted)] hover:bg-[var(--os-bg)]"
            >
              <ChevronRight
                className={cn(
                  "h-3.5 w-3.5 transition-transform",
                  expandedSections[section.id] && "rotate-90"
                )}
              />
              <span className="truncate">{section.name}</span>
              <span className="ml-auto tabular-nums">{section.lessons.length}</span>
            </button>
            {expandedSections[section.id] !== false && (
              <ul className="space-y-0.5 pb-2">
                {section.lessons.map((lesson) => {
                  const done = completedLessons.includes(lesson.id)
                  const active = activeLesson?.id === lesson.id
                  return (
                    <li key={lesson.id}>
                      <button
                        type="button"
                        onClick={() => void openLesson(lesson)}
                        className={cn(
                          "flex w-full items-start gap-2 rounded-xl px-2.5 py-2 text-left text-xs transition-colors",
                          active
                            ? "bg-[var(--os-accent)]/15 text-[var(--os-accent)] font-semibold"
                            : "text-[var(--os-fg)] hover:bg-[var(--os-bg)]"
                        )}
                      >
                        {done ? (
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                        ) : (
                          <PlayCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-60" />
                        )}
                        <span className="line-clamp-2">{lesson.title}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <OnlineStudentShell
      supportMessage={`Báo lỗi video — ${subjectInfo.label}${activeLesson ? ` — ${activeLesson.title}` : ""}`}
    >
      <OnlineStudentTopbar name={profile?.full_name} onLogout={handleLogout} />

      {showTour && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--os-border)] bg-[var(--os-card)] p-5 shadow-xl">
            <h2 className="text-lg font-bold">Cách học nhanh</h2>
            <ol className="mt-3 space-y-2 text-sm text-[var(--os-muted)] list-decimal list-inside">
              <li>Chọn chương / bài ở danh sách bên trái (hoặc nút Danh sách trên điện thoại).</li>
              <li>Xem video ở giữa — có nhiều phần thì chọn phía dưới player.</li>
              <li>Bấm Bài sau / đánh dấu hoàn thành để theo dõi tiến độ.</li>
            </ol>
            <Button onClick={dismissTour} className="mt-5 w-full rounded-xl">
              Hiểu rồi, bắt đầu học
            </Button>
          </div>
        </div>
      )}

      <div className="mx-auto flex w-full max-w-7xl flex-1 min-h-0">
        {/* Desktop sidebar */}
        <aside className="hidden w-72 shrink-0 border-r border-[var(--os-border)] lg:block sticky top-0 h-[calc(100dvh-4rem)]">
          {sidebar}
        </aside>

        {/* Mobile drawer */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-black/50"
              aria-label="Đóng"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="absolute inset-y-0 left-0 w-[min(100%,20rem)] bg-[var(--os-card)] shadow-xl">
              {sidebar}
            </div>
          </div>
        )}

        <div className="min-w-0 flex-1 px-3 py-4 sm:px-6 sm:py-5">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Link href="/online-student/dashboard">
              <Button
                variant="ghost"
                size="sm"
                className="rounded-xl border border-[var(--os-muted)]/25 text-xs"
              >
                <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Dashboard
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-xl border border-[var(--os-muted)]/25 text-xs lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <List className="h-3.5 w-3.5 mr-1" /> Danh sách bài
            </Button>
          </div>

          <div className="mb-3 rounded-xl border border-[var(--os-warning)]/25 bg-[var(--os-warning)]/10 px-3 py-2">
            <CopyrightNotice className="text-[var(--os-fg)]/90" />
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-[var(--os-fg)] mb-4 text-balance">
            {activeLesson?.title || "Chọn bài học"}
          </h1>

          <div className="space-y-4">
            {loadingPlayback ? (
              <div className="aspect-video rounded-xl border border-[var(--os-muted)]/20 bg-[var(--os-card)] flex items-center justify-center">
                <Loading label="Đang tải video bảo mật…" />
              </div>
            ) : activeVideo ? (
              <div className="space-y-3">
                <ProtectedVideoPlayer
                  url={activeVideo.url}
                  watermarkText={watermark}
                  onEnded={() =>
                    activeLesson && handleMarkCompleted(activeLesson.id)
                  }
                />
                {vids.length > 1 && (
                  <div className="flex flex-wrap gap-2">
                    {vids.map((vid, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActiveVideo(vid)}
                        className={cn(
                          "rounded-lg border px-3 py-1.5 text-xs font-semibold",
                          activeVideo.url === vid.url
                            ? "border-[var(--os-accent)] bg-[var(--os-accent)]/10 text-[var(--os-accent)]"
                            : "border-[var(--os-border)] text-[var(--os-muted)]"
                        )}
                      >
                        {vid.title || `Phần ${idx + 1}`}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="aspect-video rounded-xl border border-[var(--os-muted)]/20 bg-[var(--os-card)] flex items-center justify-center text-[var(--os-muted)] text-sm">
                Bài này chưa có video
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!prevLesson}
                  className="rounded-xl text-xs"
                  onClick={() => prevLesson && void openLesson(prevLesson)}
                >
                  <ChevronLeft className="h-4 w-4 mr-0.5" /> Bài trước
                </Button>
                <Button
                  size="sm"
                  disabled={!nextLesson}
                  className="rounded-xl text-xs bg-[var(--os-accent)] text-[var(--os-accent-fg)]"
                  onClick={() => nextLesson && void openLesson(nextLesson)}
                >
                  Bài sau <ChevronRight className="h-4 w-4 ml-0.5" />
                </Button>
              </div>
              {activeLesson && (
                <Button
                  size="sm"
                  onClick={() =>
                    handleMarkCompleted(
                      activeLesson.id,
                      !completedLessons.includes(activeLesson.id)
                    )
                  }
                  className={cn(
                    "rounded-xl text-xs font-bold",
                    completedLessons.includes(activeLesson.id)
                      ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
                      : "bg-[var(--os-card)] border border-[var(--os-border)]"
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
              )}
            </div>

            {(playback?.description || activeLesson?.description) && (
              <div className="rounded-xl border border-[var(--os-muted)]/15 bg-[var(--os-card)]/50 p-4">
                <p className="text-sm text-[var(--os-muted)] whitespace-pre-line">
                  {playback?.description || activeLesson?.description}
                </p>
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
                        <span className="text-xs font-semibold truncate">
                          {doc.title || `Tài liệu ${idx + 1}`}
                        </span>
                      </div>
                      {activeLesson && (
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
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {activeLesson && (
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
            )}
          </div>
        </div>
      </div>
    </OnlineStudentShell>
  )
}

export default function StudyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[var(--os-bg)]">
          <Loading label="Đang tải…" />
        </div>
      }
    >
      <StudyPageInner />
    </Suspense>
  )
}
