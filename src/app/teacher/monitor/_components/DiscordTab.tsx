"use client"

import { useState, useEffect, useCallback } from "react"
import { AlertCircle, Bell, Send, Flame, X, RefreshCw } from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid 
} from "recharts"
import type { DiscordLog, StudySession } from "../_types"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface DiscordTabProps {
  processedDiscordLogs: Array<Record<string, string | number>>
  discordLogs: DiscordLog[]
  afkWarning: boolean
  studentId?: string
  session?: StudySession | null
}

const DAYS_LABEL = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"]
const SLOTS_LABEL = ["Sáng (6-12h)", "Chiều (12-18h)", "Tối (18-24h)", "Đêm (0-6h)"]

// Tạo gradient màu dựa trên giá trị phút
function getHeatColor(minutes: number): string {
  if (minutes === 0) return "bg-[hsl(var(--muted))]/20"
  if (minutes < 30) return "bg-emerald-500/25"
  if (minutes < 60) return "bg-emerald-500/40"
  if (minutes < 120) return "bg-emerald-500/60"
  return "bg-emerald-500/85"
}

export function DiscordTab({ processedDiscordLogs, discordLogs, afkWarning, studentId, session }: DiscordTabProps) {
  // Heatmap state
  const [heatmap, setHeatmap] = useState<Record<string, number>>({})
  const [streak, setStreak] = useState(0)
  const [heatmapLoading, setHeatmapLoading] = useState(false)

  // Alert modal state
  const [showAlertModal, setShowAlertModal] = useState(false)
  const [alertMessage, setAlertMessage] = useState("")
  const [alertSending, setAlertSending] = useState(false)
  const [alertResult, setAlertResult] = useState<{ success: boolean; message: string } | null>(null)

  // Bot control state
  interface BotStatus {
    online: boolean
    bot_user?: string
    uptime?: number
    ping?: number
    voice_channel_name?: string
  }

  const [botStatus, setBotStatus] = useState<BotStatus | null>(null)
  const [botLoading, setBotLoading] = useState(false)
  const [moveLoading, setMoveLoading] = useState(false)

  // Fetch bot status
  const fetchBotStatus = useCallback(async () => {
    setBotLoading(true)
    try {
      const res = await fetch("/api/study-sessions/bot-control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: "status" })
      })
      if (res.ok) {
        const data = await res.json()
        setBotStatus(data)
      } else {
        setBotStatus({ online: false })
      }
    } catch (err) {
      setBotStatus({ online: false })
    } finally {
      setBotLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBotStatus()
  }, [fetchBotStatus])

  // Move user to AFK room
  const handleMoveToAFK = async () => {
    if (!studentId || moveLoading) return
    setMoveLoading(true)
    try {
      const res = await fetch("/api/study-sessions/bot-control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: "move_to_afk", student_id: studentId })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        alert("Đã chuyển học sinh sang phòng AFK thành công!")
        fetchBotStatus()
      } else {
        alert(data.error || "Không thể chuyển học sinh sang phòng AFK")
      }
    } catch (err) {
      alert("Lỗi kết nối khi gửi yêu cầu chuyển phòng")
    } finally {
      setMoveLoading(false)
    }
  }

  // Discord Logs Pagination
  const [logsPage, setLogsPage] = useState(1)
  const logsPerPage = 5

  const totalLogsPages = Math.max(1, Math.ceil(discordLogs.length / logsPerPage))
  const activeLogsPage = Math.min(logsPage, totalLogsPages)
  const paginatedLogs = discordLogs.slice((activeLogsPage - 1) * logsPerPage, activeLogsPage * logsPerPage)

  // Fetch heatmap data
  const fetchHeatmap = useCallback(async () => {
    if (!studentId) return
    setHeatmapLoading(true)
    try {
      const res = await fetch(`/api/study-sessions/discord-heatmap?student_id=${studentId}`)
      if (res.ok) {
        const data = await res.json()
        setHeatmap(data.heatmap || {})
        setStreak(data.streak || 0)
      }
    } catch (err) {
      console.error("Heatmap fetch error:", err)
    } finally {
      setHeatmapLoading(false)
    }
  }, [studentId])

  useEffect(() => { fetchHeatmap() }, [fetchHeatmap])

  // Gửi nhắc nhở qua Discord DM
  const handleSendAlert = async () => {
    if (!alertMessage.trim() || !studentId) return
    setAlertSending(true)
    setAlertResult(null)
    try {
      const res = await fetch("/api/study-sessions/send-alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: studentId, message: alertMessage.trim() })
      })
      const data = await res.json()
      if (res.ok) {
        setAlertResult({ success: true, message: "Đã gửi nhắc nhở thành công!" })
        setAlertMessage("")
      } else {
        setAlertResult({ success: false, message: data.error || "Không thể gửi nhắc nhở" })
      }
    } catch (err) {
      setAlertResult({ success: false, message: "Lỗi kết nối" })
    } finally {
      setAlertSending(false)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Streak + Alert Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Streak Card */}
        <div className="rounded-[1.5rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-5 shadow-md flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/10 border border-orange-500/20">
            <Flame className="h-7 w-7 text-orange-500" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))] font-bold">Chuỗi ngày học</p>
            <p className="text-3xl font-bold text-orange-500">{streak} <span className="text-sm font-normal text-[hsl(var(--muted-foreground))]">ngày liên tiếp</span></p>
          </div>
        </div>

        {/* Real-time Interaction Card */}
        <div className="rounded-[1.5rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-5 shadow-md flex flex-col justify-center gap-3">
          <p className="text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))] font-bold">Giám sát Real-time</p>
          <div className="flex flex-wrap gap-2">
            {session && session.status !== "offline" && session.status.startsWith("discord") ? (
              <>
                {session.discord_sharing_screen ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 px-3 py-1 text-xs font-semibold text-emerald-400">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    🖥️ Đang share màn hình
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 border border-red-500/25 px-3 py-1 text-xs font-semibold text-red-400 animate-pulse">
                    <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                    ⚠️ Chưa share màn hình
                  </span>
                )}

                {session.discord_camera_on ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 px-3 py-1 text-xs font-semibold text-emerald-400">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    📷 Đang bật camera
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-500/10 border border-slate-500/25 px-3 py-1 text-xs font-semibold text-slate-400">
                    <span className="h-2 w-2 rounded-full bg-slate-500" />
                    📷 Tắt camera
                  </span>
                )}
              </>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-500/10 border border-slate-500/25 px-3 py-1 text-xs font-semibold text-slate-400">
                <span className="h-2 w-2 rounded-full bg-slate-500" />
                Học sinh đang ngoại tuyến
              </span>
            )}
          </div>
        </div>

        {/* Send Alert Card */}
        <div className="rounded-[1.5rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-5 shadow-md flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))] font-bold">Nhắc nhở qua Discord</p>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Gửi tin nhắn trực tiếp đến học sinh</p>
          </div>
          <button
            onClick={() => { setShowAlertModal(true); setAlertResult(null) }}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-500 hover:bg-violet-500/20 transition-colors"
          >
            <Bell className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Heatmap & Bot Control Row */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_0.7fr] gap-6">
        {/* Heatmap Grid */}
        <div className="rounded-[1.5rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-6 shadow-md">
          <h3 className="font-bold text-lg mb-1">Biểu Đồ Nhiệt Hoạt Động</h3>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">Thời gian học qua Discord trong 30 ngày gần nhất (theo ngày trong tuần và khung giờ)</p>
          {heatmapLoading ? (
            <div className="py-8 text-center text-[hsl(var(--muted-foreground))]">Đang tải biểu đồ nhiệt...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="pb-2 text-xs text-[hsl(var(--muted-foreground))] text-left w-28"></th>
                    {DAYS_LABEL.map(day => (
                      <th key={day} className="pb-2 text-xs text-[hsl(var(--muted-foreground))] text-center font-semibold">{day}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SLOTS_LABEL.map((slotLabel, slotIdx) => (
                    <tr key={slotIdx}>
                      <td className="py-1 pr-3 text-xs text-[hsl(var(--muted-foreground))] whitespace-nowrap">{slotLabel}</td>
                      {DAYS_LABEL.map((_, dayIdx) => {
                        const key = `${dayIdx}-${slotIdx}`
                        const minutes = heatmap[key] || 0
                        return (
                          <td key={key} className="p-1">
                            <div
                              className={`h-10 w-full rounded-lg ${getHeatColor(minutes)} flex items-center justify-center transition-colors cursor-default`}
                              title={`${DAYS_LABEL[dayIdx]} ${slotLabel}: ${minutes} phút`}
                            >
                              {minutes > 0 && (
                                <span className="text-[10px] font-bold text-emerald-200">{minutes}p</span>
                              )}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Legend */}
              <div className="flex items-center gap-3 mt-3 text-[10px] text-[hsl(var(--muted-foreground))]">
                <span>Ít</span>
                <div className="h-3 w-5 rounded bg-[hsl(var(--muted))]/20" />
                <div className="h-3 w-5 rounded bg-emerald-500/25" />
                <div className="h-3 w-5 rounded bg-emerald-500/40" />
                <div className="h-3 w-5 rounded bg-emerald-500/60" />
                <div className="h-3 w-5 rounded bg-emerald-500/85" />
                <span>Nhiều</span>
              </div>
            </div>
          )}
        </div>

        {/* Discord Bot Control Panel */}
        <div className="rounded-[1.5rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-6 shadow-md flex flex-col justify-between min-h-[300px] relative overflow-hidden">
          <div className="absolute -right-16 -top-16 h-36 w-36 rounded-full bg-violet-500/5 blur-3xl pointer-events-none" />
          
          <div>
            <div className="flex items-center justify-between border-b border-[hsl(var(--border))]/20 pb-3 mb-4">
              <div>
                <h3 className="font-bold text-base flex items-center gap-1.5">
                  🛡️ Điều khiển Bot
                </h3>
                <p className="text-[10px] text-[hsl(var(--muted-foreground))]">Trạng thái kết nối trực tiếp của Bot trên Server</p>
              </div>
              <button
                onClick={fetchBotStatus}
                disabled={botLoading}
                className="p-1.5 hover:bg-[hsl(var(--muted))]/30 rounded-lg text-[hsl(var(--muted-foreground))] transition-all"
                title="Làm mới trạng thái"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", botLoading && "animate-spin")} />
              </button>
            </div>

            {botStatus ? (
              <div className="space-y-4">
                {/* Connection Status Badge */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[hsl(var(--muted-foreground))]">Trạng thái Bot:</span>
                  {botStatus.online ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
                      🟢 Trực tuyến
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 border border-red-500/25 px-2.5 py-0.5 text-xs font-semibold text-red-400">
                      🔴 Ngoại tuyến
                    </span>
                  )}
                </div>

                {botStatus.online && (
                  <div className="space-y-3.5 text-xs">
                    {/* Bot User info */}
                    <div className="flex justify-between border-b border-[hsl(var(--border))]/10 pb-2">
                      <span className="text-[hsl(var(--muted-foreground))]">Tên Bot:</span>
                      <span className="font-medium">{botStatus.bot_user}</span>
                    </div>
                    {/* Ping Latency */}
                    <div className="flex justify-between border-b border-[hsl(var(--border))]/10 pb-2">
                      <span className="text-[hsl(var(--muted-foreground))]">Độ trễ (Ping):</span>
                      <span className="font-semibold text-emerald-400">{botStatus.ping} ms</span>
                    </div>
                    {/* Voice Channel */}
                    <div className="flex justify-between border-b border-[hsl(var(--border))]/10 pb-2">
                      <span className="text-[hsl(var(--muted-foreground))]">Phòng học Live:</span>
                      <span className="font-semibold text-violet-400 truncate max-w-[150px]">{botStatus.voice_channel_name}</span>
                    </div>
                    {/* Uptime */}
                    <div className="flex justify-between">
                      <span className="text-[hsl(var(--muted-foreground))]">Uptime:</span>
                      <span className="font-medium">
                        {botStatus.uptime ? `${Math.round(botStatus.uptime / 1000 / 60)} phút` : "Chưa rõ"}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-[hsl(var(--muted-foreground))]/50 italic">
                Đang kiểm tra kết nối với Bot...
              </div>
            )}
          </div>

          {/* Teacher Bot Control Actions */}
          <div className="mt-6 pt-4 border-t border-[hsl(var(--border))]/20">
            {session && session.status !== "offline" && session.status.startsWith("discord") ? (
              <div className="space-y-2">
                <p className="text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))]">Thao tác nhanh cho học sinh này</p>
                <button
                  onClick={handleMoveToAFK}
                  disabled={moveLoading || botStatus?.online === false}
                  className="w-full rounded-xl py-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 hover:bg-amber-500/20 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5 text-xs font-semibold"
                >
                  {moveLoading ? (
                    <span className="h-3.5 w-3.5 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
                  ) : (
                    <>🔇 Di chuyển sang phòng AFK</>
                  )}
                </button>
              </div>
            ) : (
              <div className="text-[10px] text-center text-[hsl(var(--muted-foreground))] italic py-2">
                Học sinh đang offline, các thao tác điều khiển bot đã bị khóa.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Discord History Dashboard */}
      <div className="rounded-[1.5rem] sm:rounded-[2.5rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-6 shadow-md">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[hsl(var(--border))]/20 pb-4 mb-6 gap-4">
          <div>
            <h3 className="font-bold text-lg flex items-center gap-2">
              Lịch Sử Hoạt Đạo Discord
              {afkWarning && (
                <span className="rounded-full bg-red-500/10 border border-red-500/25 px-2.5 py-0.5 text-[10px] font-bold text-red-500 animate-pulse flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> Cảnh báo: Treo máy {`>`} 50%
                </span>
              )}
            </h3>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Biểu đồ thống kê thời gian học voice & AFK trong 7 ngày gần nhất</p>
          </div>
        </div>

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={processedDiscordLogs}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} unit=" phút" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "hsl(var(--card))", 
                  borderColor: "rgba(255,255,255,0.1)",
                  borderRadius: "12px",
                  color: "hsl(var(--foreground))"
                }} 
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Học tập (phút)" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
              <Bar dataKey="AFK / Treo máy (phút)" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Log Table */}
      <div className="rounded-[1.5rem] sm:rounded-[2.5rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-6 shadow-md">
        <h3 className="font-bold text-lg mb-4">Chi Tiết Các Phiên Học</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[hsl(var(--border))]/20 text-[hsl(var(--muted-foreground))] font-semibold">
                <th className="pb-3">Ngày</th>
                <th className="pb-3">Vào phòng</th>
                <th className="pb-3">Rời phòng</th>
                <th className="pb-3">Thời gian học</th>
                <th className="pb-3">Treo máy (AFK)</th>
                <th className="pb-3">Screen Share</th>
                <th className="pb-3">Camera</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(var(--border))]/10">
              {paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[hsl(var(--muted-foreground))]/60 italic">
                    Chưa ghi nhận phiên học nào trên Discord.
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => {
                  const activeMins = Math.floor(log.total_active_seconds / 60)
                  const activeSecs = log.total_active_seconds % 60
                  const afkMins = Math.floor(log.total_afk_seconds / 60)
                  const afkSecs = log.total_afk_seconds % 60

                  // Calculate screen share details
                  const shareSecs = log.total_sharing_screen_seconds || 0
                  const shareMins = Math.floor(shareSecs / 60)
                  const shareSecRemaining = shareSecs % 60
                  const sharePercent = log.total_active_seconds > 0 
                    ? Math.min(100, Math.round((shareSecs / log.total_active_seconds) * 100)) 
                    : 0

                  // Calculate camera details
                  const camSecs = log.total_camera_seconds || 0
                  const camMins = Math.floor(camSecs / 60)
                  const camSecRemaining = camSecs % 60
                  const camPercent = log.total_active_seconds > 0 
                    ? Math.min(100, Math.round((camSecs / log.total_active_seconds) * 100)) 
                    : 0
                  
                  return (
                    <tr key={log.id} className="hover:bg-[hsl(var(--muted))]/5 transition-colors">
                      <td className="py-3 font-medium">
                        {new Date(log.session_date).toLocaleDateString("vi-VN", { weekday: 'long', year: 'numeric', month: 'numeric', day: 'numeric' })}
                      </td>
                      <td className="py-3 text-[hsl(var(--muted-foreground))]">
                        {new Date(log.joined_at).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td className="py-3 text-[hsl(var(--muted-foreground))]">
                        {log.left_at 
                          ? new Date(log.left_at).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                          : <span className="text-emerald-500 font-semibold animate-pulse">Đang kết nối 🟢</span>
                        }
                      </td>
                      <td className="py-3 text-emerald-500 font-semibold">
                        {activeMins > 0 ? `${activeMins}p ` : ""}{activeSecs}s
                      </td>
                      <td className="py-3 text-amber-500">
                        {afkMins > 0 ? `${afkMins}p ` : ""}{afkSecs}s
                      </td>
                      <td className="py-3 text-violet-400 font-medium">
                        {shareMins > 0 ? `${shareMins}p ` : ""}{shareSecRemaining}s
                        <span className="text-[10px] ml-1.5 px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400">
                          {sharePercent}%
                        </span>
                      </td>
                      <td className="py-3 text-blue-400 font-medium">
                        {camMins > 0 ? `${camMins}p ` : ""}{camSecRemaining}s
                        <span className="text-[10px] ml-1.5 px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">
                          {camPercent}%
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {totalLogsPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-[hsl(var(--border))]/10">
            <span className="text-xs text-[hsl(var(--muted-foreground))]">
              Trang {activeLogsPage} / {totalLogsPages}
            </span>
            <div className="flex gap-1.5">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setLogsPage(prev => Math.max(1, prev - 1))}
                disabled={activeLogsPage === 1}
                className="h-8 rounded-lg px-3 text-xs"
              >
                Trước
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setLogsPage(prev => Math.min(totalLogsPages, prev + 1))}
                disabled={activeLogsPage === totalLogsPages}
                className="h-8 rounded-lg px-3 text-xs"
              >
                Sau
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Alert Modal */}
      {showAlertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-6 shadow-2xl mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Bell className="h-5 w-5 text-violet-500" /> Nhắc nhở học tập
              </h3>
              <button onClick={() => setShowAlertModal(false)} className="p-1 rounded-lg hover:bg-[hsl(var(--muted))]/20 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
              Nhập nội dung nhắc nhở. Tin nhắn sẽ được gửi trực tiếp đến Discord của học sinh.
            </p>
            <textarea
              value={alertMessage}
              onChange={(e) => setAlertMessage(e.target.value)}
              placeholder="Ví dụ: Bật mic lên tương tác đi em ơi!"
              rows={3}
              className="w-full rounded-xl border border-[hsl(var(--border))]/60 bg-transparent p-3 text-sm placeholder:text-[hsl(var(--muted-foreground))]/50 focus:outline-none focus:ring-2 focus:ring-violet-500/30 resize-none"
            />
            {alertResult && (
              <p className={`text-xs mt-2 font-semibold flex items-center gap-1 ${alertResult.success ? "text-emerald-500" : "text-red-500"}`}>
                {alertResult.success ? "✓" : "✗"} {alertResult.message}
              </p>
            )}
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowAlertModal(false)}
                className="px-4 py-2 text-sm rounded-xl border border-[hsl(var(--border))]/60 hover:bg-[hsl(var(--muted))]/10 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleSendAlert}
                disabled={alertSending || !alertMessage.trim()}
                className="px-4 py-2 text-sm rounded-xl bg-violet-500 text-white hover:bg-violet-600 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {alertSending ? (
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Gửi nhắc nhở
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
