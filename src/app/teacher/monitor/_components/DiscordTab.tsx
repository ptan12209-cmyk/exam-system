"use client"

import { AlertCircle } from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid 
} from "recharts"
import type { DiscordLog } from "../_types"

interface DiscordTabProps {
  processedDiscordLogs: Array<Record<string, string | number>>
  discordLogs: DiscordLog[]
  afkWarning: boolean
}

export function DiscordTab({ processedDiscordLogs, discordLogs, afkWarning }: DiscordTabProps) {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
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
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(var(--border))]/10">
              {discordLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[hsl(var(--muted-foreground))]/60 italic">
                    Chưa ghi nhận phiên học nào trên Discord.
                  </td>
                </tr>
              ) : (
                discordLogs.map((log) => {
                  const activeMins = Math.floor(log.total_active_seconds / 60)
                  const activeSecs = log.total_active_seconds % 60
                  const afkMins = Math.floor(log.total_afk_seconds / 60)
                  const afkSecs = log.total_afk_seconds % 60
                  
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
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
