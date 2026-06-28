"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TeacherShell } from "@/components/teacher/TeacherShell"
import { NotificationBell } from "@/components/NotificationBell"
import { UserMenu } from "@/components/UserMenu"
import { 
  Eye, Activity, Calendar, UserPlus, Mail,
  AlertCircle, Loader2, CheckCircle, X,
} from "lucide-react"
import { Loading } from "@/components/shared/Loading"
import { cn } from "@/lib/utils"
import { AnimatedSelect } from "@/components/ui/animated-select"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"

// Decomposed sub-components
import { useMonitorData } from "./_hooks/useMonitorData"
import { OverviewTab } from "./_components/OverviewTab"
import { DiscordTab } from "./_components/DiscordTab"
import { TimetableTab } from "./_components/TimetableTab"

export default function TeacherMonitorPage() {
  const data = useMonitorData()
  const {
    teacherProfile, students, selectedStudent, setSelectedStudent,
    loading, studentTab, setStudentTab, afkWarning,
    session,
    // Link form
    linkingEmail, setLinkingEmail, linkingLoading, linkingError, linkingSuccess,
    setLinkingError, setLinkingSuccess,
    handleLinkStudent,
    // Confirm dialog
    confirmState, setConfirmState,
    // Discord data (for tab)
    processedDiscordLogs, discordLogs,
    supabase,
  } = data

  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false)

  // Auto close link modal on success
  useEffect(() => {
    if (linkingSuccess && isLinkModalOpen) {
      const timer = setTimeout(() => {
        setIsLinkModalOpen(false)
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [linkingSuccess, isLinkModalOpen])

  if (loading) return <Loading fullPage label="Đang kết nối Đài giám sát..." />

  return (
    <TeacherShell>
      {/* Header cho Mobile */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-[hsl(var(--border))]/25 bg-[hsl(var(--background))]/75 px-4 backdrop-blur-md lg:hidden safe-top">
        <div className="flex h-16 items-center justify-between">
          <Link href="/teacher/dashboard" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[hsl(var(--border))]/60">
              <Eye className="h-4 w-4" />
            </div>
            <span className="text-lg font-semibold tracking-tight">Observatory</span>
          </Link>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <UserMenu userName={teacherProfile?.full_name || ""} userClass="Giáo viên" role="teacher" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-24 pt-24 sm:px-6 lg:px-8 lg:py-10">
        
        {/* Banner Section */}
        <section className="mb-8 grid gap-6 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))]/60 px-3 py-1 text-[10px] sm:text-xs uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
              <Activity className="h-3.5 w-3.5 text-violet-500 animate-pulse" /> Giáo viên / Phụ huynh giám sát
            </p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-6xl">Đài Giám Sát Học Tập</h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-[hsl(var(--muted-foreground))] md:text-lg">
              Quan sát trạng thái học realtime của học sinh, giao việc trực tiếp vào Checklist và theo dõi kết quả làm bài tập trực tuyến.
            </p>
          </div>
          
          {/* Student Switcher */}
          <div className="rounded-xl sm:rounded-2xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-4 sm:p-6 shadow-sm flex flex-col justify-between">
            <div>
              <p className="text-xs uppercase font-bold tracking-wider text-[hsl(var(--muted-foreground))] mb-3">Học sinh đang quan sát</p>
              {students.length === 0 ? (
                <p className="text-sm italic text-[hsl(var(--muted-foreground))]">Chưa liên kết tài khoản nào</p>
              ) : (
                <div className="space-y-4">
                  {/* Học sinh theo lớp */}
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Học sinh theo lớp</Label>
                    <AnimatedSelect 
                      value={selectedStudent && selectedStudent.class !== 'TSTD' ? selectedStudent.id : ""} 
                      onValueChange={(value) => {
                        const st = students.find(s => s.id === value)
                        if (st) setSelectedStudent(st)
                      }}
                      options={students
                        .filter(s => s.class !== 'TSTD')
                        .map((student) => ({
                          value: student.id,
                          label: `👤 ${student.full_name || "Chưa rõ tên"} (${student.class || "Chưa chọn lớp"})`
                        }))}
                      placeholder="Chọn học sinh..."
                    />
                  </div>

                  {/* Thí sinh tự do (TSTD) */}
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Thí sinh tự do (TSTD)</Label>
                    <AnimatedSelect 
                      value={selectedStudent && selectedStudent.class === 'TSTD' ? selectedStudent.id : ""} 
                      onValueChange={(value) => {
                        const st = students.find(s => s.id === value)
                        if (st) setSelectedStudent(st)
                      }}
                      options={students
                        .filter(s => s.class === 'TSTD')
                        .map((student) => ({
                          value: student.id,
                          label: `🎓 ${student.full_name || "Chưa rõ tên"}`
                        }))}
                      placeholder="Chọn thí sinh tự do..."
                    />
                  </div>
                </div>
              )}
            </div>
            {students.length > 0 && (
              <Button 
                onClick={() => {
                  setLinkingError(null)
                  setLinkingSuccess(null)
                  setLinkingEmail("")
                  setIsLinkModalOpen(true)
                }} 
                variant="outline"
                className="mt-4 w-full rounded-xl border-dashed border-violet-500/50 text-violet-500 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/20 text-xs font-semibold"
              >
                <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Liên kết học sinh mới
              </Button>
            )}
          </div>
        </section>

        {/* Link Account Form (when no students linked) */}
        {students.length === 0 && (
          <section className="mb-8 rounded-[2.5rem] border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--card))]/50 p-8 text-center max-w-xl mx-auto shadow-sm">
            <UserPlus className="mx-auto mb-4 h-12 w-12 text-violet-500/80" strokeWidth={1.2} />
            <h2 className="text-xl font-bold mb-2">Chưa có tài khoản học sinh liên kết</h2>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6 max-w-md mx-auto">
              Nhập chính xác email tài khoản của học sinh để thiết lập luồng liên kết quan sát từ xa.
            </p>
            <form onSubmit={handleLinkStudent} className="space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-[hsl(var(--muted-foreground))]" />
                  <Input 
                    type="email" 
                    placeholder="email.cua.em@example.com" 
                    value={linkingEmail}
                    onChange={(e) => setLinkingEmail(e.target.value)}
                    className="pl-11 rounded-xl bg-transparent py-6"
                    required
                  />
                </div>
                <Button type="submit" disabled={linkingLoading} className="rounded-xl px-6 bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:bg-[hsl(var(--foreground))]/90">
                  {linkingLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Kết nối"}
                </Button>
              </div>
              {linkingError && <p className="text-xs font-semibold text-red-500 flex items-center justify-center gap-1.5 mt-2"><AlertCircle className="h-3.5 w-3.5" />{linkingError}</p>}
              {linkingSuccess && <p className="text-xs font-semibold text-emerald-500 flex items-center justify-center gap-1.5 mt-2"><CheckCircle className="h-3.5 w-3.5" />{linkingSuccess}</p>}
            </form>
          </section>
        )}

        {selectedStudent && (
          <div className="space-y-6">
            {/* Tabs Selector + Quick Switcher */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[hsl(var(--border))]/20 pb-3 mb-6">
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => setStudentTab("overview")} 
                  className={cn(
                    "px-4 py-2 text-sm font-semibold border-b-2 transition-all flex items-center gap-2", 
                    studentTab === "overview" ? "border-violet-500 text-violet-500" : "border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                  )}
                >
                  <Eye className="h-4 w-4" /> Tổng quan
                </button>
                <button 
                  onClick={() => setStudentTab("discord")} 
                  className={cn(
                    "px-4 py-2 text-sm font-semibold border-b-2 transition-all flex items-center gap-2", 
                    studentTab === "discord" ? "border-violet-500 text-violet-500" : "border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                  )}
                >
                  <Activity className="h-4 w-4" /> Giám sát Discord
                  {afkWarning && <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />}
                </button>
                <button 
                  onClick={() => setStudentTab("timetable")} 
                  className={cn(
                    "px-4 py-2 text-sm font-semibold border-b-2 transition-all flex items-center gap-2", 
                    studentTab === "timetable" ? "border-violet-500 text-violet-500" : "border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                  )}
                >
                  <Calendar className="h-4 w-4" /> Thời khóa biểu
                </button>
              </div>

              {/* Quick Switcher on Tab Header */}
              <div className="flex items-center gap-2 w-full md:w-auto">
                <span className="text-xs text-[hsl(var(--muted-foreground))] font-bold uppercase tracking-wider whitespace-nowrap">Chuyển nhanh:</span>
                <div className="w-full md:w-64">
                  <AnimatedSelect 
                    value={selectedStudent?.id || ""} 
                    onValueChange={(value) => {
                      const st = students.find(s => s.id === value)
                      if (st) setSelectedStudent(st)
                    }}
                    options={students.map((student) => ({
                      value: student.id,
                      label: student.class === 'TSTD'
                        ? `🎓 ${student.full_name || "Chưa rõ tên"} (Tự do)`
                        : `👤 ${student.full_name || "Chưa rõ tên"} (${student.class || "Chưa chọn lớp"})`
                    }))}
                    placeholder="Chọn học sinh..."
                  />
                </div>
              </div>
            </div>

            {/* Tab Content */}
            {studentTab === "overview" && <OverviewTab data={data} />}
            {studentTab === "discord" && (
              <DiscordTab 
                processedDiscordLogs={processedDiscordLogs} 
                discordLogs={discordLogs} 
                afkWarning={afkWarning}
                studentId={selectedStudent.id}
                session={session}
              />
            )}
            {studentTab === "timetable" && <TimetableTab data={data} />}
          </div>
        )}

      </main>

      {confirmState && (
        <ConfirmDialog
          isOpen={confirmState.isOpen}
          onClose={() => setConfirmState(prev => prev ? { ...prev, isOpen: false } : null)}
          onConfirm={confirmState.onConfirm}
          title={confirmState.title}
          description={confirmState.description}
          confirmText={confirmState.confirmText}
          variant={confirmState.variant}
        />
      )}

      {/* Link Student Modal */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-[hsl(var(--border))]/50 p-5">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-violet-500" />
                Liên kết học sinh mới
              </h2>
              <button 
                onClick={() => setIsLinkModalOpen(false)} 
                className="rounded-full p-2 hover:bg-[hsl(var(--muted))]/20"
              >
                <X className="h-5 w-5 text-[hsl(var(--muted-foreground))]" />
              </button>
            </div>

            <form onSubmit={async (e) => {
              await handleLinkStudent(e);
            }} className="p-5 space-y-4">
              <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
                Nhập chính xác địa chỉ email của học sinh để kết nối tài khoản. Học sinh phải đã đăng ký tài khoản trên hệ thống.
              </p>

              <div className="space-y-2">
                <Label htmlFor="link-email" className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Email học sinh</Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                  <Input 
                    id="link-email"
                    type="email" 
                    placeholder="học sinh@example.com" 
                    value={linkingEmail}
                    onChange={(e) => setLinkingEmail(e.target.value)}
                    className="pl-10 rounded-xl font-medium"
                    required
                  />
                </div>
              </div>

              {linkingError && (
                <p className="text-xs font-semibold text-red-500 flex items-center gap-1.5 bg-red-500/5 border border-red-500/25 rounded-xl p-3">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{linkingError}</span>
                </p>
              )}

              {linkingSuccess && (
                <p className="text-xs font-semibold text-emerald-500 flex items-center gap-1.5 bg-emerald-500/5 border border-emerald-500/25 rounded-xl p-3">
                  <CheckCircle className="h-4 w-4 shrink-0" />
                  <span>{linkingSuccess}</span>
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsLinkModalOpen(false)} 
                  className="flex-1 rounded-xl"
                >
                  Hủy
                </Button>
                <Button 
                  type="submit" 
                  disabled={linkingLoading} 
                  className="flex-1 rounded-xl bg-violet-600 text-white hover:bg-violet-700 font-semibold"
                >
                  {linkingLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Liên kết"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </TeacherShell>
  )
}
