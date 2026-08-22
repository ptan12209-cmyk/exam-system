import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { fetchStudentCompetency } from "@/lib/competency/server"
import { getSubjectInfo } from "@/lib/subjects"
import { TeacherShell } from "@/components/teacher/TeacherShell"
import { TeacherBottomNav } from "@/components/BottomNav"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ArrowLeft, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { CompetencyAiNarrative } from "./CompetencyAiNarrative"

const inter = { className: "font-inter" }
const mono = { className: "font-jetbrains-mono" }

const MASTERY_BADGE: Record<string, { label: string; className: string }> = {
  strong: { label: "Vững", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
  moderate: { label: "Tạm ổn", className: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
  weak: { label: "Yếu", className: "bg-rose-500/10 text-rose-600 border-rose-500/30" },
  insufficient: { label: "Chưa đủ dữ liệu", className: "bg-[hsl(var(--muted))]/30 text-[hsl(var(--muted-foreground))] border-[hsl(var(--border))]" },
}

/**
 * Server Component — Hồ sơ năng lực học sinh, tổng hợp MỌI lượt làm bài
 * trên các đề thuộc quyền giáo viên. Đáp án chỉ dùng server-side để tính
 * tổng số câu theo dạng; không bao giờ xuống browser.
 */
export default async function StudentCompetencyPage({
  params,
}: {
  params: Promise<{ studentId: string }>
}) {
  const { studentId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const data = await fetchStudentCompetency(supabase, user.id, studentId)
  if (!data) redirect("/teacher/students")

  const { profile, result } = data
  const trendIcon =
    result.trend.direction === "improving" ? <TrendingUp className="h-4 w-4 text-emerald-500" />
    : result.trend.direction === "declining" ? <TrendingDown className="h-4 w-4 text-rose-500" />
    : <Minus className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />

  const trendLabel =
    result.trend.direction === "improving" ? `Tiến bộ +${result.trend.delta}`
    : result.trend.direction === "declining" ? `Giảm ${Math.abs(result.trend.delta)}`
    : result.trend.direction === "stable" ? "Ổn định"
    : "Chưa đủ dữ liệu"

  const skills = [
    { key: "mc", label: "Trắc nghiệm", s: result.bySkillType.mc },
    { key: "tf", label: "Đúng / Sai", s: result.bySkillType.tf },
    { key: "sa", label: "Trả lời ngắn", s: result.bySkillType.sa },
  ]

  return (
    <TeacherShell className={cn("bg-[var(--os-bg)] text-[var(--os-fg)]", inter.className)}>
      <main className="mx-auto max-w-5xl px-4 pb-24 pt-8 sm:px-6 lg:px-8 lg:py-10">
        <div className="mb-8 flex items-center gap-4">
          <Link href="/teacher/students">
            <Button variant="outline" size="icon" className="rounded-full border-[hsl(var(--border))]/70 bg-transparent">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">Hồ sơ năng lực</p>
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{profile.full_name || "Học sinh"}</h1>
            <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
              {profile.class || (profile.grade ? `Khối ${profile.grade}` : "Chưa xếp lớp")}
            </p>
          </div>
        </div>

        {/* KPI row */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-4">
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Số lượt làm bài</p>
            <p className="mt-2 text-3xl font-semibold">{result.totals.attempts}</p>
          </div>
          <div className="rounded-2xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-4">
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Điểm trung bình</p>
            <p className="mt-2 text-3xl font-semibold">{result.totals.average}</p>
          </div>
          <div className="rounded-2xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-4">
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Điểm cao nhất</p>
            <p className="mt-2 text-3xl font-semibold text-emerald-600">{result.totals.best}</p>
          </div>
          <div className="rounded-2xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-4">
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Xu hướng</p>
            <p className="mt-2 flex items-center gap-1.5 text-lg font-semibold">
              {trendIcon} {trendLabel}
            </p>
          </div>
        </section>

        {/* Per-subject mastery */}
        <section className="mt-8 overflow-hidden rounded-2xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))]">
          <div className="border-b border-[hsl(var(--border))]/50 p-5">
            <h2 className="text-lg font-semibold">Mức độ theo môn</h2>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              Tổng hợp từ {result.totals.attempts} lượt làm bài
              {result.totals.lastAttemptAt ? ` · lần gần nhất ${new Date(result.totals.lastAttemptAt).toLocaleDateString("vi-VN")}` : ""}
            </p>
          </div>
          {result.bySubject.length === 0 ? (
            <div className="p-10 text-center text-sm text-[hsl(var(--muted-foreground))]">
              Học sinh chưa làm bài nào trên hệ thống.
            </div>
          ) : (
            <div className="divide-y divide-[hsl(var(--border))]/30">
              {result.bySubject.map((s) => {
                const badge = MASTERY_BADGE[s.mastery]
                const info = getSubjectInfo(s.subject)
                return (
                  <div key={s.subject} className="flex items-center justify-between gap-4 p-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="text-2xl">{info.icon}</span>
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{info.label}</p>
                        <p className="text-xs text-[hsl(var(--muted-foreground))] font-mono">
                          {s.attempts} lượt · mới nhất {s.latest}
                          {s.delta !== 0 && (
                            <span className={cn("ml-1 font-bold", s.delta > 0 ? "text-emerald-600" : "text-rose-500")}>
                              ({s.delta > 0 ? "+" : ""}{s.delta})
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-right">
                      <div>
                        <p className="text-xl font-bold">{s.average}</p>
                        <p className="text-[10px] uppercase text-[hsl(var(--muted-foreground))] font-mono">TB · cao {s.best}</p>
                      </div>
                      <span className={cn("rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase", badge.className)}>
                        {badge.label}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Skill-type accuracy */}
        {result.totals.attempts > 0 && (
          <section className="mt-8 rounded-2xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-5">
            <h2 className="text-lg font-semibold">Chính xác theo dạng câu</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {skills.map(({ key, label, s }) => (
                <div key={key}>
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span>{label}</span>
                    <span className={cn("font-mono", s.percent >= 65 ? "text-emerald-600" : s.percent >= 50 ? "text-amber-600" : "text-rose-500")}>
                      {s.total > 0 ? `${s.percent}%` : "—"}
                    </span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[hsl(var(--muted))]/40">
                    <div
                      className={cn("h-full rounded-full",
                        s.percent >= 65 ? "bg-emerald-500" : s.percent >= 50 ? "bg-amber-500" : "bg-rose-500")}
                      style={{ width: `${s.total > 0 ? s.percent : 0}%` }}
                    />
                  </div>
                  <p className={cn("mt-1 text-[10px] text-[hsl(var(--muted-foreground))] font-mono")}>{s.correct}/{s.total} câu</p>
                </div>
              ))}
            </div>
            {result.notes.length > 0 && (
              <ul className="mt-5 space-y-1.5 border-t border-[hsl(var(--border))]/40 pt-4 text-sm text-[hsl(var(--muted-foreground))]">
                {result.notes.map((n, i) => <li key={i}>• {n}</li>)}
              </ul>
            )}
          </section>
        )}

        {/* AI narrative */}
        {result.totals.attempts > 0 && (
          <CompetencyAiNarrative studentId={studentId} />
        )}

        <div className="mt-10 flex justify-center">
          <Link href="/teacher/students">
            <Button variant="outline" className="rounded-full border-[hsl(var(--border))]/70 px-8 py-6 text-xs font-semibold uppercase tracking-widest">
              <ArrowLeft className="mr-3 h-4 w-4" /> Danh sách học sinh
            </Button>
          </Link>
        </div>
      </main>
      <TeacherBottomNav />
    </TeacherShell>
  )
}
