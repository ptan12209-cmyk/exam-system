"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ThemeToggle } from "@/components/ui/ThemeToggle"
import { cn } from "@/lib/utils"
import { ArrowLeft, BookOpen, Calendar, Clock, Edit, GraduationCap, MessageCircle, Plus, Save, Settings, Trash2, User, Video, Youtube, X } from "lucide-react"
import { Loading } from "@/components/shared/Loading"

interface LiveConfig {
  id: string
  youtube_video_id: string | null
  youtube_chat_enabled: boolean
  is_live: boolean
  title: string | null
}

interface ScheduleItem {
  id: string
  day: string
  time: string
  topic: string
  host: string
  sort_order: number
}

export default function LiveRoomPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<{ name: string; email: string; role?: string } | null>(null)
  const [schedule, setSchedule] = useState<ScheduleItem[]>([])
  const [liveConfig, setLiveConfig] = useState<LiveConfig | null>(null)
  const [showEditor, setShowEditor] = useState(false)
  const [showLiveSettings, setShowLiveSettings] = useState(false)
  const [editItem, setEditItem] = useState<ScheduleItem | null>(null)
  const [formDay, setFormDay] = useState("")
  const [formTime, setFormTime] = useState("")
  const [formTopic, setFormTopic] = useState("")
  const [formHost, setFormHost] = useState("")
  const [youtubeUrl, setYoutubeUrl] = useState("")
  const [liveTitle, setLiveTitle] = useState("")
  const [chatEnabled, setChatEnabled] = useState(true)
  const [isLive, setIsLive] = useState(false)

  useEffect(() => {
    const init = async () => {
      await checkAuth()
      await fetchSchedule()
      await fetchLiveConfig()
      setLoading(false)
    }
    init()
  }, [supabase])

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data: profile } = await supabase.from("profiles").select("full_name, email, role").eq("id", session.user.id).single()
    setUser({ name: profile?.full_name || session.user.email?.split("@")[0] || "Học sinh", email: session.user.email || "", role: profile?.role })
  }

  const fetchSchedule = async () => {
    const { data } = await supabase.from("live_schedule").select("*").eq("is_active", true).order("sort_order")
    if (data) setSchedule(data)
  }

  const fetchLiveConfig = async () => {
    const { data } = await supabase.from("live_config").select("*").single()
    if (data) {
      setLiveConfig(data)
      setYoutubeUrl(data.youtube_video_id || "")
      setLiveTitle(data.title || "")
      setChatEnabled(data.youtube_chat_enabled)
      setIsLive(data.is_live)
    }
  }

  const extractYoutubeId = (value: string) => {
    if (!value) return null
    if (/^[a-zA-Z0-9_-]{11}$/.test(value)) return value
    const patterns = [/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/, /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/]
    for (const pattern of patterns) {
      const match = value.match(pattern)
      if (match) return match[1]
    }
    return null
  }

  const saveLiveSettings = async () => {
    const videoId = extractYoutubeId(youtubeUrl)
    const payload = { youtube_video_id: videoId, youtube_chat_enabled: chatEnabled, is_live: isLive, title: liveTitle }
    if (liveConfig) await supabase.from("live_config").update(payload).eq("id", liveConfig.id)
    else await supabase.from("live_config").insert(payload)
    await fetchLiveConfig()
    setShowLiveSettings(false)
  }

  const openEditor = (item?: ScheduleItem) => {
    if (item) {
      setEditItem(item)
      setFormDay(item.day)
      setFormTime(item.time)
      setFormTopic(item.topic)
      setFormHost(item.host || "")
    } else {
      setEditItem(null)
      setFormDay("")
      setFormTime("")
      setFormTopic("")
      setFormHost("")
    }
    setShowEditor(true)
  }

  const handleSave = async () => {
    if (!formDay || !formTime || !formTopic) return
    const payload = { day: formDay, time: formTime, topic: formTopic, host: formHost }
    if (editItem) await supabase.from("live_schedule").update(payload).eq("id", editItem.id)
    else await supabase.from("live_schedule").insert({ ...payload, sort_order: schedule.length + 1 })
    setShowEditor(false)
    await fetchSchedule()
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Xóa lịch này?")) return
    await supabase.from("live_schedule").delete().eq("id", id)
    await fetchSchedule()
  }

  const canEdit = user?.role === "teacher" || user?.email === "ptan12209@gmail.com"

  if (loading) return <Loading fullPage label="Đang kết nối luồng trực tiếp..." />

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))] selection:bg-[hsl(var(--foreground))] selection:text-[hsl(var(--background))]">
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-[hsl(var(--border))]/25 bg-[hsl(var(--background))]/70 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[hsl(var(--border))]/60">
              <Youtube className="h-4 w-4" />
            </div>
            <span className="text-lg font-semibold tracking-tight">Live Class</span>
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {canEdit && (
              <Button onClick={() => setShowLiveSettings(true)} variant="outline" className="rounded-full border-[hsl(var(--border))]/70 bg-transparent">
                <Settings className="mr-2 h-4 w-4" />Cài đặt Live
              </Button>
            )}
            {user ? (
              <div className="hidden sm:flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--muted))]/20">
                  <User className="h-4 w-4" />
                </div>
                <span>{user.name}</span>
              </div>
            ) : (
              <Link href="/login">
                <Button className="rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:bg-[hsl(var(--foreground))]/90">
                  Đăng nhập
                </Button>
              </Link>
            )}
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 pb-24 pt-6">
        <Link href="/student/dashboard" className="mb-6 inline-flex items-center gap-2 text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))]">
          <ArrowLeft className="h-4 w-4" />Quay lại Dashboard
        </Link>

        {liveConfig?.is_live && (
          <div className="mb-6 flex items-center gap-2 text-red-500">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
            </span>
            <span className="text-sm font-semibold uppercase tracking-wider">Đang phát trực tiếp</span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {liveConfig?.youtube_video_id ? (
              <>
                <h1 className="text-2xl font-bold tracking-tight">{liveConfig.title || "Buổi Live Chữa Đề"}</h1>
                <div className="relative aspect-video overflow-hidden rounded-[2rem] border border-[hsl(var(--border))]/60 bg-black">
                  <iframe 
                    src={`https://www.youtube.com/embed/${liveConfig.youtube_video_id}?autoplay=1&rel=0`} 
                    title="YouTube Live" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen 
                    className="absolute inset-0 h-full w-full" 
                  />
                </div>
                <a 
                  href={`https://youtube.com/watch?v=${liveConfig.youtube_video_id}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="inline-flex items-center gap-2 rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-[1.02]"
                >
                  <Youtube className="h-4 w-4" />Xem trên YouTube
                </a>
              </>
            ) : (
              <div className="liquid-glass flex flex-col items-center justify-center rounded-[2rem] py-20 text-center">
                <Video className="mb-6 h-16 w-16 text-[hsl(var(--muted-foreground))]/30" />
                <h2 className="mb-3 text-2xl font-bold tracking-tight">Chưa có buổi Live</h2>
                <p className="mx-auto mb-8 max-w-md text-[hsl(var(--muted-foreground))]">
                  Hiện tại chưa có buổi học trực tuyến nào. Hãy xem lịch học bên cạnh để biết thời gian sắp tới.
                </p>
                {canEdit && (
                  <Button 
                    onClick={() => setShowLiveSettings(true)} 
                    className="rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:bg-[hsl(var(--foreground))]/90"
                  >
                    <Settings className="mr-2 h-4 w-4" />Thiết lập Live Stream
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="space-y-6">
            {liveConfig?.youtube_video_id && liveConfig.youtube_chat_enabled && (
              <div className="overflow-hidden rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] shadow-sm">
                <div className="border-b border-[hsl(var(--border))]/50 p-4">
                  <h3 className="flex items-center gap-2 text-base font-semibold">
                    <MessageCircle className="h-4 w-4 text-red-500" />Chat Trực Tiếp
                  </h3>
                </div>
                <div className="aspect-[9/16] max-h-[500px]">
                  <iframe 
                    src={`https://www.youtube.com/live_chat?v=${liveConfig.youtube_video_id}&embed_domain=${typeof window !== "undefined" ? window.location.hostname : "localhost"}`} 
                    className="h-full w-full" 
                  />
                </div>
              </div>
            )}

            <div className="overflow-hidden rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] shadow-sm">
              <div className="flex items-center justify-between border-b border-[hsl(var(--border))]/50 p-4">
                <h3 className="flex items-center gap-2 text-base font-semibold">
                  <Calendar className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />Lịch Live Tuần Này
                </h3>
                {canEdit && (
                  <Button onClick={() => openEditor()} size="sm" className="h-8 rounded-full">
                    <Plus className="mr-1 h-3 w-3" />Thêm
                  </Button>
                )}
              </div>
              {schedule.length === 0 ? (
                <div className="py-12 text-center">
                  <Calendar className="mx-auto mb-2 h-8 w-8 text-[hsl(var(--muted-foreground))]/20" />
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">Chưa có lịch học mới</p>
                </div>
              ) : (
                <div className="divide-y divide-[hsl(var(--border))]/30">
                  {schedule.map((item) => (
                    <div key={item.id} className="group p-4 transition-colors hover:bg-[hsl(var(--muted))]/10">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">{item.topic}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[hsl(var(--muted-foreground))]">
                            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{item.day}</span>
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{item.time}</span>
                            {item.host && <span className="flex items-center gap-1"><User className="h-3 w-3" />{item.host}</span>}
                          </div>
                        </div>
                        {canEdit && (
                          <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <button onClick={() => openEditor(item)} className="rounded-full p-1.5 hover:bg-[hsl(var(--muted))]/20"><Edit className="h-3.5 w-3.5" /></button>
                            <button onClick={() => handleDelete(item.id)} className="rounded-full p-1.5 text-red-500 hover:bg-red-500/10"><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Link href="/resources">
                <div className="rounded-[1.5rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-5 text-center transition-transform hover:-translate-y-0.5">
                  <BookOpen className="mx-auto mb-2 h-6 w-6 text-[hsl(var(--muted-foreground))]" />
                  <p className="text-sm font-medium">Tài liệu</p>
                </div>
              </Link>
              <Link href="/student/exams">
                <div className="rounded-[1.5rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-5 text-center transition-transform hover:-translate-y-0.5">
                  <GraduationCap className="mx-auto mb-2 h-6 w-6 text-[hsl(var(--muted-foreground))]" />
                  <p className="text-sm font-medium">Luyện đề</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </main>

      {showLiveSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="liquid-glass w-full max-w-lg overflow-hidden rounded-[2.5rem] p-0 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[hsl(var(--border))]/50 p-6">
              <h2 className="flex items-center gap-2 text-lg font-semibold"><Youtube className="h-5 w-5 text-red-500" />Cài đặt YouTube Live</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowLiveSettings(false)} className="rounded-full"><X className="h-5 w-5" /></Button>
            </div>
            <div className="space-y-5 p-6">
              <div className="rounded-2xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--muted))]/10 p-5 text-sm">
                <p className="mb-2 font-semibold">📌 Hướng dẫn nhanh:</p>
                <ol className="list-inside list-decimal space-y-1 text-[hsl(var(--muted-foreground))]">
                  <li>Vào YouTube Studio → Tạo Live Stream</li>
                  <li>Copy link video hoặc ID video (11 ký tự)</li>
                  <li>Dán vào ô bên dưới</li>
                  <li>Bật "Đang phát trực tiếp" khi bắt đầu</li>
                </ol>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Tiêu đề buổi Live</Label>
                <Input value={liveTitle} onChange={(e) => setLiveTitle(e.target.value)} placeholder="VD: Chữa đề Toán THPT 2026 - Buổi 5" className="rounded-xl border-[hsl(var(--border))]/60 bg-transparent focus:ring-0" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Link hoặc ID Video YouTube</Label>
                <Input value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} placeholder="VD: https://youtube.com/watch?v=dQw4w9WgXcQ" className="rounded-xl border-[hsl(var(--border))]/60 bg-transparent focus:ring-0" />
              </div>
              <div className="flex items-center justify-between py-2">
                <div><Label className="text-sm font-medium">Hiển thị Chat</Label><p className="text-xs text-[hsl(var(--muted-foreground))]">Cho phép học sinh thảo luận</p></div>
                <button onClick={() => setChatEnabled(!chatEnabled)} className={cn("relative h-6 w-11 rounded-full transition-colors", chatEnabled ? "bg-emerald-500" : "bg-[hsl(var(--muted))]/30")}>
                  <span className={cn("absolute top-1 h-4 w-4 rounded-full bg-white transition-all", chatEnabled ? "left-6" : "left-1")} />
                </button>
              </div>
              <div className="flex items-center justify-between border-t border-[hsl(var(--border))]/40 pt-4">
                <div><Label className="text-sm font-medium">Đang phát trực tiếp</Label><p className="text-xs text-[hsl(var(--muted-foreground))]">Bật khi bạn bắt đầu stream</p></div>
                <button onClick={() => setIsLive(!isLive)} className={cn("relative h-6 w-11 rounded-full transition-colors", isLive ? "bg-red-500" : "bg-[hsl(var(--muted))]/30")}>
                  <span className={cn("absolute top-1 h-4 w-4 rounded-full bg-white transition-all", isLive ? "left-6" : "left-1")} />
                </button>
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setShowLiveSettings(false)} className="flex-1 rounded-full border-[hsl(var(--border))]/70">Hủy</Button>
                <Button onClick={saveLiveSettings} className="flex-1 rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:bg-[hsl(var(--foreground))]/90"><Save className="mr-2 h-4 w-4" />Lưu cấu hình</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="liquid-glass w-full max-w-md overflow-hidden rounded-[2.5rem] p-0 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[hsl(var(--border))]/50 p-6">
              <h2 className="text-lg font-semibold">{editItem ? "Chỉnh sửa lịch" : "Thêm lịch mới"}</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowEditor(false)} className="rounded-full"><X className="h-5 w-5" /></Button>
            </div>
            <div className="space-y-4 p-6">
              <div className="space-y-2"><Label className="text-sm font-medium">Ngày</Label><Input value={formDay} onChange={(e) => setFormDay(e.target.value)} placeholder="VD: Thứ 7" className="rounded-xl border-[hsl(var(--border))]/60 bg-transparent" /></div>
              <div className="space-y-2"><Label className="text-sm font-medium">Thời gian</Label><Input value={formTime} onChange={(e) => setFormTime(e.target.value)} placeholder="VD: 20:00 - 22:00" className="rounded-xl border-[hsl(var(--border))]/60 bg-transparent" /></div>
              <div className="space-y-2"><Label className="text-sm font-medium">Chủ đề</Label><Input value={formTopic} onChange={(e) => setFormTopic(e.target.value)} placeholder="VD: Chữa đề Toán THPT 2026" className="rounded-xl border-[hsl(var(--border))]/60 bg-transparent" /></div>
              <div className="space-y-2"><Label className="text-sm font-medium">Người hướng dẫn</Label><Input value={formHost} onChange={(e) => setFormHost(e.target.value)} placeholder="VD: Thầy Ái" className="rounded-xl border-[hsl(var(--border))]/60 bg-transparent" /></div>
              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowEditor(false)} className="flex-1 rounded-full border-[hsl(var(--border))]/70">Hủy</Button>
                <Button onClick={handleSave} disabled={!formDay || !formTime || !formTopic} className="flex-1 rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:bg-[hsl(var(--foreground))]/90"><Save className="mr-2 h-4 w-4" />Lưu lịch</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
