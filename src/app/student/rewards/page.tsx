"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { RewardsShop } from "@/components/gamification/RewardsShop"
import { NotificationBell } from "@/components/NotificationBell"
import { UserMenu } from "@/components/UserMenu"
import { BottomNav } from "@/components/BottomNav"

export default function RewardsPage() {
    const router = useRouter()
    const supabase = createClient()
    const [fullName, setFullName] = useState("")
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchData() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push("/login")
                return
            }

            const { data: profile } = await supabase
                .from("profiles")
                .select("full_name")
                .eq("id", user.id)
                .single()

            if (profile) setFullName(profile.full_name || "")
            setLoading(false)
        }
        fetchData()
    }, [router, supabase])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push("/login")
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 dark:bg-slate-900 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-slate-900 flex flex-col">
            {/* Header */}
            <header className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <Link href="/student/dashboard" className="flex items-center gap-2">
                            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-md">E</div>
                            <span className="font-bold text-xl text-blue-600 hidden md:block">ExamHub</span>
                        </Link>
                    </div>
                    <nav className="hidden lg:flex items-center gap-1">
                        <Link href="/student/dashboard" className="p-3 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg">🏠</Link>
                        <Link href="/student/exams" className="p-3 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg">📝</Link>
                        <Link href="/arena" className="p-3 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg">🏆</Link>
                        <Link href="/student/rewards" className="p-3 text-blue-600 bg-blue-50 dark:bg-blue-900/30 rounded-lg">🎁</Link>
                    </nav>
                    <div className="flex items-center gap-3">
                        <NotificationBell />
                        <UserMenu userName={fullName} onLogout={handleLogout} role="student" />
                    </div>
                </div>
            </header>

            {/* Main */}
            <main className="flex-grow max-w-5xl mx-auto px-4 py-8 w-full">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
                    <Link href="/student/dashboard" className="hover:text-blue-600 dark:hover:text-blue-400">Trang chủ</Link>
                    <span>›</span>
                    <span className="font-medium text-gray-800">Cửa hàng phần thưởng</span>
                </div>

                {/* Header Card */}
                <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl shadow-lg p-6 mb-6 text-white">
                    <div className="flex items-center gap-4">
                        <div className="text-5xl">🎁</div>
                        <div>
                            <h1 className="text-2xl font-bold">Cửa hàng phần thưởng</h1>
                            <p className="text-yellow-100">Đổi XP lấy các phần thưởng hấp dẫn!</p>
                        </div>
                    </div>
                </div>

                {/* Rewards Shop */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <RewardsShop />
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-blue-600 text-white py-8 mt-auto">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <p className="text-sm text-blue-200">© 2026 ExamHub. All rights reserved.</p>
                </div>
            </footer>

            <BottomNav />
        </div>
    )
}
