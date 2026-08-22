import Link from "next/link"
import Image from "next/image"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { getUserStats } from "@/lib/gamification"
import { PWAInstallButton } from "@/components/PWAInstallButton"
import { StudentShell } from "@/components/student/StudentShell"
import { StudentTopbar } from "@/components/student/StudentTopbar"
import { StudentNavTabs } from "@/components/student/StudentNavTabs"
import { BookOpen, BarChart3, User, Edit, Smartphone } from "lucide-react"
import { cn } from "@/lib/utils"

const instrumentSerif = { className: "font-instrument-serif" }
const inter = { className: "font-inter" }

/**
 * Server Component — profile + stats render straight from the HTML payload.
 */
export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const [{ data: profileData }, statsResult] = await Promise.all([
    supabase.from("profiles").select("full_name, class, avatar_url, nickname, bio").eq("id", user.id).single(),
    getUserStats(user.id, supabase),
  ])

  const fullName = profileData?.full_name || ""
  const userClass = profileData?.class || ""
  const stats = statsResult.stats

  let avatarContent: React.ReactNode = "?"
  if (profileData?.avatar_url) {
    avatarContent = (
      <Image
        src={profileData.avatar_url}
        alt={fullName || "Avatar"}
        width={96}
        height={96}
        className="h-full w-full object-cover"
      />
    )
  } else if (fullName) {
    avatarContent = fullName.charAt(0).toUpperCase()
  }

  const quickLinks = [
    { href: "/student/exams", label: "Đề thi của tôi", icon: BookOpen },
    { href: "/student/analytics", label: "Thống kê kết quả", icon: BarChart3 },
  ]

  return (
    <StudentShell className={cn("bg-[var(--os-bg)] text-[var(--os-fg)]", inter.className)}>
      {/* Topbar */}
      <StudentTopbar
        name={fullName}
        userXp={stats.xp}
        level={stats.level}
        streak={stats.streak_days}
      />

      {/* NavTabs */}
      <StudentNavTabs />

      <main className="mx-auto max-w-7xl px-4 pb-28 pt-8 sm:px-6 lg:px-8">

        {/* Title Header Section */}
        <section className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--os-border)] bg-[var(--os-card)] px-4 py-2 text-xs uppercase tracking-[0.2em] text-[var(--os-muted)]">
              <User className="h-4 w-4 text-[var(--os-accent)]" /> Profile Card
            </div>
            <h1 className={cn("text-4xl sm:text-5xl lg:text-6xl text-[var(--os-fg)] font-normal leading-tight", instrumentSerif.className)}>
              Hồ sơ cá nhân
            </h1>
            <p className="mt-3 text-sm sm:text-base leading-relaxed text-[var(--os-muted)] max-w-2xl">
              Quản lý thông tin tài khoản và truy cập nhanh các bài tập, kết quả của bạn.
            </p>
          </div>
        </section>

        {/* Quick Links Grid */}
        <section className="mt-8 grid gap-4 grid-cols-1 sm:grid-cols-2">
          {quickLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-xl border border-[var(--os-border)] bg-[var(--os-card)] p-4 hover:border-[var(--os-accent)]/50 transition-colors group"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--os-border)] bg-[var(--os-bg)] text-[var(--os-muted)] group-hover:text-[var(--os-accent)] transition-colors">
                <item.icon className="h-4 w-4" />
              </div>
              <span className="text-xs font-bold text-[var(--os-fg)]">{item.label}</span>
            </Link>
          ))}
        </section>

        {/* Main Details Section */}
        <section className="mt-8 grid gap-6 lg:grid-cols-[1.35fr_0.65fr] lg:items-start">
          <div className="space-y-6">
            {/* Profile Detail Card */}
            <div className="rounded-2xl border border-[var(--os-border)] bg-[var(--os-card)] p-6 shadow-sm">
              <div className="flex flex-col gap-6 md:flex-row md:items-center">
                <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[var(--os-border)] bg-[var(--os-bg)] text-4xl font-bold text-[var(--os-accent)]">
                  {avatarContent}
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-[var(--os-fg)]">{fullName || "Học sinh"}</h2>
                  {userClass && <p className="mt-1 text-sm text-[var(--os-muted)] font-mono uppercase">Lớp {userClass}</p>}
                  {profileData?.nickname && <p className="mt-1 text-xs text-[var(--os-accent)] font-mono">@{profileData.nickname}</p>}
                  <p className="mt-3 text-xs text-[var(--os-muted)] leading-relaxed max-w-md">{profileData?.bio || "Chưa có giới thiệu bản thân."}</p>
                </div>
                <Link href="/student/profile/edit" className="shrink-0 w-full md:w-auto">
                  <Button className="rounded-xl border border-[var(--os-border)] text-[var(--os-muted)] hover:text-[var(--os-fg)] hover:border-[var(--os-accent)] hover:bg-[var(--os-accent)]/15 bg-transparent py-5 px-5 text-xs font-semibold w-full md:w-auto">
                    <Edit className="mr-2 h-4 w-4" /> Chỉnh sửa hồ sơ
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          <aside className="space-y-6">
            {/* PWA App installation */}
            <div className="rounded-2xl border border-[var(--os-border)] bg-[var(--os-card)] p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--os-border)] bg-[var(--os-bg)] text-[var(--os-accent)]">
                  <Smartphone className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--os-fg)]">Cài đặt ứng dụng</h3>
                  <p className="text-[10px] text-[var(--os-muted)] font-mono">TRUY CẬP NHANH HƠN</p>
                </div>
              </div>
              <PWAInstallButton />
            </div>
          </aside>
        </section>
      </main>
    </StudentShell>
  )
}
