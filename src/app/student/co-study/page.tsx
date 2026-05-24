"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { StudentShell } from "@/components/student/StudentShell"
import { StudentHeader } from "@/components/student/StudentHeader"
import { 
  Users, Play, Pause, RotateCcw, Volume2, VolumeX, Sparkles, 
  Trophy, Lock, Plus, DoorOpen, Award, ArrowRight, ShieldCheck, Flame
} from "lucide-react"
import { Loading } from "@/components/shared/Loading"
import { cn } from "@/lib/utils"

interface CoStudyRoom {
  id: string
  name: string
  description: string | null
  creator_id: string
  subject: string | null
  is_private: boolean
  passcode: string | null
  created_at: string
}

interface RoomMember {
  student_id: string
  profiles: {
    full_name: string | null
    avatar_url: string | null
  }
}

interface StudySession {
  student_id: string
  status: "focusing" | "resting" | "offline"
  last_status_change: string
  total_focus_seconds_today: number
  profiles?: {
    full_name: string | null
    avatar_url: string | null
  }
}

// Audio track configuration
const AMBIENT_TRACKS = [
  { id: "lofi", label: "Lofi Beats 🎵", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
  { id: "rain", label: "Mưa rơi 🌧️", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" },
  { id: "cafe", label: "Quán Cafe ☕", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3" },
  { id: "waves", label: "Sóng biển 🌊", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3" }
]

export default function CoStudyRoomsPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  
  const [rooms, setRooms] = useState<CoStudyRoom[]>([])
  const [activeRoom, setActiveRoom] = useState<CoStudyRoom | null>(null)
  const [members, setMembers] = useState<RoomMember[]>([])
  const [sessions, setSessions] = useState<StudySession[]>([])
  
  // Loading & Error states
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Create Room Form states
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [roomName, setRoomName] = useState("")
  const [roomDesc, setRoomDesc] = useState("")
  const [roomSubject, setRoomSubject] = useState("")
  const [isPrivate, setIsPrivate] = useState(false)
  const [passcode, setPasscode] = useState("")

  // Passcode entry modal
  const [showPasscodeModal, setShowPasscodeModal] = useState(false)
  const [selectedPrivateRoom, setSelectedPrivateRoom] = useState<CoStudyRoom | null>(null)
  const [enteredPasscode, setEnteredPasscode] = useState("")

  // Pomodoro state
  const [timeRemaining, setTimeRemaining] = useState(25 * 60) // 25 minutes
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [timerMode, setTimerMode] = useState<"focus" | "break">("focus")
  const [focusDuration, setFocusDuration] = useState(25) // minutes
  const [breakDuration, setBreakDuration] = useState(5) // minutes
  
  // Today's session focused seconds accumulated locally
  const [localTodaySeconds, setLocalTodaySeconds] = useState(0)

  // Audio state
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // User profile
  const [userId, setUserId] = useState<string | null>(null)
  const [profile, setProfile] = useState<any>(null)

  // Fetch student profile & active rooms
  useEffect(() => {
    let mounted = true
    
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/login"); return }
      if (mounted) setUserId(user.id)

      const { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).single()
      if (mounted && prof) setProfile(prof)

      const { data: roomsList } = await supabase.from("co_study_rooms").select("*").order("created_at", { ascending: false })
      if (mounted && roomsList) setRooms(roomsList)
      
      if (mounted) setLoading(false)
    }

    init()
    return () => { mounted = false }
  }, [router, supabase])

  // Periodic study sessions pooling & realtime sync
  useEffect(() => {
    if (!activeRoom || !userId) return

    let mounted = true

    const fetchRoomSessions = async () => {
      // Get all active room members
      const { data: mbrs } = await supabase
        .from("co_study_room_members")
        .select(`
          student_id,
          profiles (full_name, avatar_url)
        `)
        .eq("room_id", activeRoom.id)
      
      if (!mounted) return
      if (mbrs) setMembers(mbrs as any)

      // Get sessions of these members
      const studentIds = mbrs?.map((m: any) => m.student_id) || []
      if (studentIds.length === 0) return

      const { data: sess } = await supabase
        .from("study_sessions")
        .select(`
          student_id,
          status,
          last_status_change,
          total_focus_seconds_today,
          profiles (full_name, avatar_url)
        `)
        .in("student_id", studentIds)

      if (mounted && sess) {
        setSessions(sess as any)
        
        // Find local user's accumulated focus time
        const mySess = sess.find((s: any) => s.student_id === userId)
        if (mySess) {
          setLocalTodaySeconds(mySess.total_focus_seconds_today)
        }
      }
    }

    fetchRoomSessions()

    // Realtime changes listener for presence grid
    const channel = supabase
      .channel(`presence_room_${activeRoom.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "study_sessions" }, () => {
        fetchRoomSessions()
      })
      .subscribe()

    // Active session poller
    const poller = setInterval(fetchRoomSessions, 6000)

    return () => {
      mounted = false
      channel.unsubscribe()
      clearInterval(poller)
    }
  }, [activeRoom, userId, supabase])

  // Pomodoro countdown ticker
  useEffect(() => {
    if (!isTimerRunning) return

    const timer = setInterval(async () => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          // Switch modes
          const nextMode = timerMode === "focus" ? "break" : "focus"
          setTimerMode(nextMode)
          setIsTimerRunning(false)
          
          // Trigger browser notification/alert
          alert(nextMode === "break" ? "🎯 Hết giờ tập trung! Đã đến lúc nghỉ ngơi 5 phút." : "📝 Hết giờ nghỉ giải lao! Bắt đầu ca tập trung tiếp theo.")
          
          // Switch timer duration
          if (nextMode === "focus") {
            handleStatusChange("resting")
            return focusDuration * 60
          } else {
            handleStatusChange("focusing")
            return breakDuration * 60
          }
        }
        return prev - 1
      })

      // If focusing, accumulate local focused seconds every second
      if (timerMode === "focus") {
        setLocalTodaySeconds(prev => prev + 1)
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [isTimerRunning, timerMode, focusDuration, breakDuration])

  // Periodically push focused time accumulation to Supabase
  useEffect(() => {
    if (!isTimerRunning || timerMode !== "focus" || !userId || !activeRoom) return

    const syncTimer = setInterval(async () => {
      await supabase.from("study_sessions").upsert({
        student_id: userId,
        room_id: activeRoom.id,
        status: "focusing",
        total_focus_seconds_today: localTodaySeconds,
        last_status_change: new Date().toISOString()
      })
    }, 10000) // sync database every 10 seconds

    return () => clearInterval(syncTimer)
  }, [isTimerRunning, timerMode, localTodaySeconds, userId, activeRoom, supabase])

  // Create Room
  const handleCreateRoom = async () => {
    if (!roomName.trim() || !userId) return
    setLoading(true)
    setError(null)
    try {
      const payload = {
        name: roomName.trim(),
        description: roomDesc.trim() || null,
        creator_id: userId,
        subject: roomSubject.trim() || null,
        is_private: isPrivate,
        passcode: isPrivate ? passcode : null
      }

      const { data: newRoom, error: createError } = await supabase
        .from("co_study_rooms")
        .insert(payload)
        .select()
        .single()

      if (createError) throw createError

      // Automatically join room
      if (newRoom) {
        await handleJoinRoom(newRoom)
      }

      setRoomName("")
      setRoomDesc("")
      setRoomSubject("")
      setIsPrivate(false)
      setPasscode("")
      setShowCreateForm(false)
      
      // Refresh list
      const { data: roomsList } = await supabase.from("co_study_rooms").select("*").order("created_at", { ascending: false })
      if (roomsList) setRooms(roomsList)
    } catch (e: any) {
      setError("Lỗi khi tạo phòng: " + e.message)
    } finally {
      setLoading(false)
    }
  }

  // Join Room
  const handleJoinRoom = async (room: CoStudyRoom) => {
    if (!userId) return
    
    // Check if passcode required
    if (room.is_private && room.creator_id !== userId && !showPasscodeModal) {
      setSelectedPrivateRoom(room)
      setShowPasscodeModal(true)
      return
    }

    if (room.is_private && room.creator_id !== userId && enteredPasscode !== room.passcode) {
      setError("Mã phòng học nhóm không chính xác")
      return
    }

    setJoining(true)
    setError(null)
    try {
      // 1. Add student to member list (upsert)
      await supabase.from("co_study_room_members").upsert({
        room_id: room.id,
        student_id: userId
      })

      // 2. Initialize or join study session
      const { data: existingSession } = await supabase
        .from("study_sessions")
        .select("*")
        .eq("student_id", userId)
        .single()

      const focusToday = existingSession?.total_focus_seconds_today || 0
      setLocalTodaySeconds(focusToday)

      await supabase.from("study_sessions").upsert({
        student_id: userId,
        room_id: room.id,
        status: "resting", // start as resting/idle
        total_focus_seconds_today: focusToday,
        last_status_change: new Date().toISOString()
      })

      setActiveRoom(room)
      setTimeRemaining(focusDuration * 60)
      setIsTimerRunning(false)
      setTimerMode("focus")
      setShowPasscodeModal(false)
      setSelectedPrivateRoom(null)
      setEnteredPasscode("")
    } catch (e: any) {
      setError("Lỗi gia nhập phòng: " + e.message)
    } finally {
      setJoining(false)
    }
  }

  // Leave Room
  const handleLeaveRoom = async () => {
    if (!activeRoom || !userId) return
    setIsTimerRunning(false)
    
    // Stop audio
    if (audioRef.current) {
      audioRef.current.pause()
      setPlayingAudioId(null)
    }

    try {
      // 1. Remove from room members
      await supabase
        .from("co_study_room_members")
        .delete()
        .eq("room_id", activeRoom.id)
        .eq("student_id", userId)

      // 2. Set study session offline
      await supabase.from("study_sessions").upsert({
        student_id: userId,
        room_id: null,
        status: "offline",
        total_focus_seconds_today: localTodaySeconds,
        last_status_change: new Date().toISOString()
      })

      setActiveRoom(null)
      setMembers([])
      setSessions([])
    } catch (e) {
      console.error(e)
    }
  }

  // Handle study status toggle
  const handleStatusChange = async (nextStatus: "focusing" | "resting") => {
    if (!userId || !activeRoom) return
    await supabase.from("study_sessions").upsert({
      student_id: userId,
      room_id: activeRoom.id,
      status: nextStatus,
      total_focus_seconds_today: localTodaySeconds,
      last_status_change: new Date().toISOString()
    })
  }

  // Timer controls
  const toggleTimer = async () => {
    const nextState = !isTimerRunning
    setIsTimerRunning(nextState)

    if (nextState) {
      // Start focusing/break
      await handleStatusChange(timerMode === "focus" ? "focusing" : "resting")
    } else {
      // Pause
      await handleStatusChange("resting")
    }
  }

  const resetTimer = async () => {
    setIsTimerRunning(false)
    setTimeRemaining(focusDuration * 60)
    setTimerMode("focus")
    await handleStatusChange("resting")
  }

  // Ambient audio control
  const toggleAudio = (track: typeof AMBIENT_TRACKS[number]) => {
    if (playingAudioId === track.id) {
      if (audioRef.current) {
        audioRef.current.pause()
      }
      setPlayingAudioId(null)
    } else {
      if (audioRef.current) {
        audioRef.current.pause()
      }
      audioRef.current = new Audio(track.url)
      audioRef.current.loop = true
      audioRef.current.play().catch(err => console.error("Audio playback error:", err))
      setPlayingAudioId(track.id)
    }
  }

  // YPT Ticking format helper (Seconds to hh:mm:ss)
  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    const s = secs % 60
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  };

  // Pomodoro standard countdown format (mm:ss)
  const formatMinutesSeconds = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  }

  // Dynamic ranking for Weekly Leaderboard (mocking based on active room members focus time today)
  const leaderboardMembers = useMemo(() => {
    return [...sessions]
      .sort((a, b) => b.total_focus_seconds_today - a.total_focus_seconds_today)
  }, [sessions])

  if (loading) return <Loading fullPage label="Đang kết nối phòng học..." />

  return (
    <StudentShell>
      <StudentHeader name="Checklist" onLogout={async () => { await supabase.auth.signOut(); router.push("/login") }} />
      <main className="mx-auto max-w-7xl px-4 pt-6 pb-24 sm:px-6 lg:px-8 lg:py-10">
        
        {/* Banner Section */}
        <div className="mb-8 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))]/70 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] backdrop-blur-md">
              <Users className="h-4 w-4 text-emerald-500 animate-pulse" /> Live Co-study Spaces (YPT Style)
            </div>
            <h1 className="max-w-3xl text-5xl font-bold tracking-[-2px] md:text-7xl lg:text-8xl">
              {activeRoom ? activeRoom.name : "Phòng Tự Học"}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-[hsl(var(--muted-foreground))]">
              {activeRoom 
                ? activeRoom.description || "Hãy bật Pomodoro, chọn âm thanh nền và cùng tập trung học tập với nhóm bạn bè trực tuyến."
                : "Phòng học trực tuyến thời gian thực tích hợp bộ đếm giờ Pomodoro tăng tập trung và đồng hồ đếm tổng thời gian học tập hôm nay như app YPT."
              }
            </p>
          </div>
          <div className="flex gap-3">
            {activeRoom ? (
              <Button onClick={handleLeaveRoom} variant="outline" className="rounded-full border-red-500/30 text-red-500 hover:bg-red-50 py-5 shadow-sm">
                <DoorOpen className="mr-2 h-4 w-4" /> Rời phòng học
              </Button>
            ) : (
              <Button onClick={() => setShowCreateForm(!showCreateForm)} className="rounded-full shadow-lg">
                <Plus className="mr-2 h-4 w-4" /> Tạo phòng học mới
              </Button>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm text-red-600 shadow-sm flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-red-600 animate-ping"></span>
            {error}
          </div>
        )}

        {/* ========================================== */}
        {/* ROOM CREATION FORM */}
        {/* ========================================== */}
        {showCreateForm && !activeRoom && (
          <section className="mb-8 space-y-4 rounded-[2.5rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-6 shadow-md animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-[hsl(var(--border))]/40 pb-3">
              <h3 className="font-semibold text-lg">Thiết lập phòng tự học</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowCreateForm(false)} className="rounded-full">Đóng</Button>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs uppercase font-bold text-[hsl(var(--muted-foreground))]">Tên phòng học</Label>
                <Input placeholder="Phòng học (VD: Nhóm ôn thi Đại Học Vật Lý)..." value={roomName} onChange={(e) => setRoomName(e.target.value)} className="rounded-xl border-[hsl(var(--border))]/60 bg-transparent text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs uppercase font-bold text-[hsl(var(--muted-foreground))]">Môn học tập trung</Label>
                <Input placeholder="Môn học (VD: Toán, Lý, Tiếng Anh)..." value={roomSubject} onChange={(e) => setRoomSubject(e.target.value)} className="rounded-xl border-[hsl(var(--border))]/60 bg-transparent text-sm" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs uppercase font-bold text-[hsl(var(--muted-foreground))]">Mô tả phòng</Label>
              <Input placeholder="Nhập mô tả ngắn gọn về tiêu chí của phòng học nhóm..." value={roomDesc} onChange={(e) => setRoomDesc(e.target.value)} className="rounded-xl border-[hsl(var(--border))]/60 bg-transparent text-sm" />
            </div>

            <div className="flex items-center gap-4 py-2 border-t border-b border-[hsl(var(--border))]/20">
              <label className="flex items-center gap-2 text-xs font-semibold text-[hsl(var(--muted-foreground))] cursor-pointer">
                <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} className="rounded border-[hsl(var(--border))]/60" />
                <span>Đặt phòng chế độ RIÊNG TƯ (Yêu cầu mật khẩu)</span>
              </label>
              {isPrivate && (
                <Input 
                  placeholder="Nhập mã pin phòng..." 
                  value={passcode} 
                  onChange={(e) => setPasscode(e.target.value)} 
                  className="w-48 rounded-xl border-[hsl(var(--border))]/60 bg-transparent text-xs py-1" 
                />
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button onClick={handleCreateRoom} disabled={!roomName.trim()} className="flex-1 rounded-full py-5">
                Xác nhận tạo phòng
              </Button>
              <Button variant="outline" onClick={() => setShowCreateForm(false)} className="rounded-full border-[hsl(var(--border))]/70 bg-transparent py-5">
                Hủy bỏ
              </Button>
            </div>
          </section>
        )}

        {/* ========================================== */}
        {/* ROOM LIST VIEW (UNJOINED VIEW) */}
        {/* ========================================== */}
        {!activeRoom && (
          <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {rooms.length === 0 ? (
              <div className="col-span-full rounded-[2.5rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] py-20 text-center shadow-sm">
                <Users className="mx-auto mb-3 h-16 w-16 text-[hsl(var(--muted-foreground))]/20" />
                <p className="font-semibold text-lg">Chưa có phòng học nào hoạt động</p>
                <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Hãy là người tiên phong lập ra phòng tự học nhóm đầu tiên!</p>
                <Button onClick={() => setShowCreateForm(true)} className="mt-4 rounded-full">
                  Tạo phòng mới
                </Button>
              </div>
            ) : (
              rooms.map((room) => (
                <div key={room.id} className="rounded-[2.5rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div>
                    <div className="flex items-center justify-between border-b border-[hsl(var(--border))]/20 pb-2 mb-3">
                      <span className="rounded-full bg-emerald-500/5 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span> Live Active
                      </span>
                      {room.is_private && <Lock className="h-3.5 w-3.5 text-amber-500" />}
                    </div>
                    
                    <h3 className="font-bold text-lg leading-tight line-clamp-1">{room.name}</h3>
                    <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))] line-clamp-2 min-h-[2.5rem]">
                      {room.description || "Phòng học tập trung nâng cao cùng nhóm bạn bè trực tuyến."}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-1.5 text-[10px]">
                      {room.subject && (
                        <span className="rounded-full bg-indigo-500/5 border border-indigo-500/20 px-2 py-0.5 text-indigo-500 font-semibold">
                          {room.subject}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-[hsl(var(--border))]/20 flex items-center justify-between">
                    <span className="text-[10px] text-[hsl(var(--muted-foreground))] font-medium">Bật Pomodoro & Nhạc nền</span>
                    <Button 
                      onClick={() => handleJoinRoom(room)} 
                      disabled={joining} 
                      className="rounded-full text-xs px-4"
                    >
                      Vào phòng <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </section>
        )}

        {/* ========================================== */}
        {/* PASSCODE MODAL ENTRY */}
        {/* ========================================== */}
        {showPasscodeModal && selectedPrivateRoom && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-6 text-center animate-in fade-in zoom-in-95 duration-200">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
                <Lock className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold">Yêu cầu mã phòng học</h3>
              <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Phòng học "{selectedPrivateRoom.name}" ở chế độ riêng tư.</p>
              
              <Input 
                type="password"
                placeholder="Nhập mật mã passcode..." 
                value={enteredPasscode} 
                onChange={(e) => setEnteredPasscode(e.target.value)} 
                className="mt-4 rounded-xl text-center text-sm tracking-widest font-mono"
              />

              <div className="mt-6 grid grid-cols-2 gap-3">
                <Button variant="outline" onClick={() => { setShowPasscodeModal(false); setSelectedPrivateRoom(null); setEnteredPasscode("") }} className="rounded-full border-[hsl(var(--border))]/70 bg-transparent text-xs py-5">Hủy</Button>
                <Button onClick={() => handleJoinRoom(selectedPrivateRoom)} className="rounded-full text-xs py-5">Vào phòng</Button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* INDIVIDUAL CO-STUDY ROOM BOARD VIEW */}
        {/* ========================================== */}
        {activeRoom && (
          <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
            
            {/* Left side: Pomodoro Board */}
            <div className="space-y-6">
              
              {/* Pomodoro Timer Card */}
              <div className="rounded-[2.5rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-8 shadow-sm text-center relative overflow-hidden flex flex-col items-center justify-center">
                
                {/* Mode indicators */}
                <div className="mb-4 flex items-center justify-center gap-2">
                  <span className={cn(
                    "rounded-full px-3.5 py-1 text-xs font-bold uppercase tracking-widest",
                    timerMode === "focus" 
                      ? "bg-red-500/10 text-red-500 border border-red-500/20" 
                      : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                  )}>
                    {timerMode === "focus" ? "🎯 Ca Tập Trung" : "☕ Giờ Giải Lao"}
                  </span>
                  {isTimerRunning && (
                    <span className="flex h-2 w-2 rounded-full bg-red-600 animate-ping"></span>
                  )}
                </div>

                {/* Circular timer & Time Remaining */}
                <div className="relative flex items-center justify-center h-48 w-48 mb-6 mt-2">
                  <svg className="absolute top-0 left-0 w-full h-full transform -rotate-90">
                    <circle 
                      cx="96" cy="96" r="84" 
                      className="stroke-[hsl(var(--muted))]/10 fill-transparent" 
                      strokeWidth="8"
                    />
                    <circle 
                      cx="96" cy="96" r="84" 
                      className={cn(
                        "fill-transparent stroke-[12] transition-all duration-1000",
                        timerMode === "focus" ? "stroke-red-500" : "stroke-emerald-500"
                      )} 
                      strokeWidth="8"
                      strokeDasharray="527"
                      strokeDashoffset={527 - (527 * timeRemaining) / ((timerMode === "focus" ? focusDuration : breakDuration) * 60)}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="z-10 text-center">
                    <span className="text-4xl font-extrabold font-mono tracking-tight text-[hsl(var(--foreground))]">
                      {formatMinutesSeconds(timeRemaining)}
                    </span>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))] mt-1 font-bold">Pomodoro</p>
                  </div>
                </div>

                {/* Control Action Buttons */}
                <div className="flex gap-4 mb-4">
                  <Button 
                    onClick={toggleTimer} 
                    className={cn(
                      "rounded-full h-12 w-32 shadow-md text-xs font-bold font-mono tracking-wider",
                      isTimerRunning ? "bg-amber-600 hover:bg-amber-700 text-white" : "bg-[hsl(var(--foreground))] text-[hsl(var(--background))]"
                    )}
                  >
                    {isTimerRunning ? <Pause className="mr-1.5 h-4 w-4" /> : <Play className="mr-1.5 h-4 w-4" />}
                    {isTimerRunning ? "Tạm dừng" : "Bắt đầu"}
                  </Button>
                  <Button 
                    onClick={resetTimer} 
                    variant="outline"
                    className="rounded-full h-12 w-32 border-[hsl(var(--border))]/70 bg-transparent text-xs font-bold font-mono tracking-wider"
                  >
                    <RotateCcw className="mr-1.5 h-4 w-4" /> Đặt lại
                  </Button>
                </div>

                {/* Local Custom Focus Durations */}
                <div className="mt-4 flex gap-4 text-xs font-semibold text-[hsl(var(--muted-foreground))]">
                  <label className="flex items-center gap-1.5">
                    <span>Tập trung:</span>
                    <select 
                      value={focusDuration} 
                      onChange={(e) => {
                        const val = Number(e.target.value)
                        setFocusDuration(val)
                        if (!isTimerRunning && timerMode === "focus") setTimeRemaining(val * 60)
                      }}
                      className="rounded-lg border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] text-[hsl(var(--foreground))] px-2 py-0.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[hsl(var(--foreground))]/10 transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23888888%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')] bg-[right_8px_center] bg-[length:10px] pr-6 bg-no-repeat"
                    >
                      <option value={15} className="bg-[hsl(var(--card))]">15 phút</option>
                      <option value={25} className="bg-[hsl(var(--card))]">25 phút</option>
                      <option value={45} className="bg-[hsl(var(--card))]">45 phút</option>
                      <option value={60} className="bg-[hsl(var(--card))]">60 phút</option>
                    </select>
                  </label>
                  <label className="flex items-center gap-1.5">
                    <span>Giải lao:</span>
                    <select 
                      value={breakDuration} 
                      onChange={(e) => {
                        const val = Number(e.target.value)
                        setBreakDuration(val)
                        if (!isTimerRunning && timerMode === "break") setTimeRemaining(val * 60)
                      }}
                      className="rounded-lg border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] text-[hsl(var(--foreground))] px-2 py-0.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[hsl(var(--foreground))]/10 transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23888888%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')] bg-[right_8px_center] bg-[length:10px] pr-6 bg-no-repeat"
                    >
                      <option value={5} className="bg-[hsl(var(--card))]">5 phút</option>
                      <option value={10} className="bg-[hsl(var(--card))]">10 phút</option>
                      <option value={15} className="bg-[hsl(var(--card))]">15 phút</option>
                    </select>
                  </label>
                </div>
              </div>

              {/* Ambient Sound Mixer Panel */}
              <div className="rounded-[2.5rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-6 shadow-sm">
                <h3 className="text-base font-semibold tracking-tight mb-4 flex items-center gap-2">
                  <Volume2 className="h-5 w-5 text-indigo-500" /> Nhạc & Âm Thanh Nền Tăng Tập Trung
                </h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {AMBIENT_TRACKS.map((track) => (
                    <button
                      key={track.id}
                      onClick={() => toggleAudio(track)}
                      className={cn(
                        "flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition-all active:scale-95",
                        playingAudioId === track.id
                          ? "border-indigo-500 bg-indigo-500/10 shadow-sm text-indigo-500 font-bold"
                          : "border-[hsl(var(--border))]/60 bg-transparent opacity-75 hover:opacity-100"
                      )}
                    >
                      {playingAudioId === track.id ? <Volume2 className="h-5 w-5 animate-bounce" /> : <VolumeX className="h-5 w-5 text-[hsl(var(--muted-foreground))]" />}
                      <span className="text-[10px] tracking-wider uppercase font-semibold">{track.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Arena Quick Links */}
              <div className="rounded-[2.5rem] border border-amber-500/20 bg-amber-500/5 p-6 shadow-sm flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div className="flex gap-4 items-center">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
                    <Trophy className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-bold">Đấu Trường Arena Đồng Hành</p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">Giải đề thi thử thách cùng cả phòng ngay sau ca Pomodoro!</p>
                  </div>
                </div>
                <Button 
                  onClick={() => router.push("/student/exams")} 
                  className="rounded-full bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs"
                >
                  Tham gia Arena <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </div>

            </div>

            {/* Right side: Member Presence Grid & Leaderboard */}
            <div className="space-y-6">
              
              {/* Live Presence List */}
              <div className="rounded-[2.5rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between border-b border-[hsl(var(--border))]/20 pb-2">
                  <h3 className="font-bold flex items-center gap-2 text-sm uppercase tracking-wider">
                    <Users className="h-4 w-4 text-emerald-500" /> Bạn Học Hôm Nay ({members.length})
                  </h3>
                  <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[9px] font-bold text-emerald-600 uppercase tracking-widest">
                    Realtime ON
                  </span>
                </div>

                <div className="space-y-4 max-h-[35vh] overflow-y-auto pr-1">
                  {sessions.length === 0 ? (
                    <div className="py-12 text-center text-xs text-[hsl(var(--muted-foreground))]/40">Đang chờ bạn học tham gia...</div>
                  ) : (
                    sessions.map((sess) => {
                      const isMe = sess.student_id === userId
                      const name = sess.profiles?.full_name || (isMe ? profile?.full_name : "Bạn học")
                      const avatar = sess.profiles?.avatar_url || "/default-avatar.png"

                      return (
                        <div key={sess.student_id} className="flex items-center justify-between p-3 rounded-2xl border border-[hsl(var(--border))]/40 bg-[hsl(var(--card))]/75">
                          <div className="flex items-center gap-3">
                            <img 
                              src={avatar} 
                              onError={(e) => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/bottts/svg?seed=${name}` }}
                              className="h-8 w-8 rounded-full bg-[hsl(var(--muted))]/30 object-cover" 
                              alt="Avatar" 
                            />
                            <div>
                              <p className="text-xs font-bold leading-tight">
                                {name} {isMe && <span className="text-[9px] text-indigo-500 font-semibold">(Tôi)</span>}
                              </p>
                              <div className="mt-1 flex items-center gap-1.5 text-[9px] text-[hsl(var(--muted-foreground))]">
                                {sess.status === "focusing" ? (
                                  <span className="flex items-center gap-1 text-red-500 font-semibold">
                                    <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping"></span> 📝 Tập trung
                                  </span>
                                ) : (
                                  <span className="text-emerald-500 font-semibold">☕ Giải lao</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <p className="text-xs font-bold font-mono tracking-tight text-[hsl(var(--foreground))]">
                              {formatTime(sess.total_focus_seconds_today)}
                            </p>
                            <p className="text-[9px] text-[hsl(var(--muted-foreground))] font-semibold">Hôm nay</p>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Leaderboard weekly */}
              <div className="rounded-[2.5rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-2 border-b border-[hsl(var(--border))]/20 pb-2">
                  <Award className="h-4 w-4 text-amber-500" />
                  <h3 className="font-bold text-sm uppercase tracking-wider">Bảng Xếp Hạng Phòng Học</h3>
                </div>

                <div className="space-y-2 max-h-[30vh] overflow-y-auto">
                  {leaderboardMembers.length === 0 ? (
                    <div className="py-8 text-center text-xs text-[hsl(var(--muted-foreground))]/40">Chưa có bảng xếp hạng hôm nay</div>
                  ) : (
                    leaderboardMembers.map((sess, rankIdx) => {
                      const isMe = sess.student_id === userId
                      const name = sess.profiles?.full_name || (isMe ? profile?.full_name : "Bạn học")
                      const isTop3 = rankIdx < 3

                      return (
                        <div key={sess.student_id} className="flex items-center justify-between py-2 border-b border-[hsl(var(--border))]/20 last:border-0">
                          <div className="flex items-center gap-3">
                            <span className={cn(
                              "w-5 text-center text-xs font-extrabold",
                              isTop3 ? "text-amber-500" : "text-[hsl(var(--muted-foreground))]"
                            )}>
                              #{rankIdx + 1}
                            </span>
                            <span className="text-xs font-semibold">{name}</span>
                          </div>
                          <span className="text-xs font-bold font-mono tracking-tight text-[hsl(var(--muted-foreground))]">
                            {formatTime(sess.total_focus_seconds_today)}
                          </span>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

            </div>

          </section>
        )}

      </main>
    </StudentShell>
  )
}
