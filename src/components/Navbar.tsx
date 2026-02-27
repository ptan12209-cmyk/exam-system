"use client"

import Link from "next/link"
import { GraduationCap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/ui/ThemeToggle"

interface NavbarProps {
    showAuth?: boolean
}

export function Navbar({ showAuth = true }: NavbarProps) {
    return (
        <nav className="glass-nav sticky top-0 z-50 safe-top">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 items-center">
                    <Link href="/" className="flex items-center gap-3 group">
                        <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 dark:shadow-indigo-500/10 group-hover:shadow-indigo-500/30 transition-shadow duration-300">
                            <GraduationCap className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-bold text-foreground">
                            Exam<span className="text-gradient">Hub</span>
                        </span>
                    </Link>
                    <div className="flex items-center gap-2 sm:gap-3">
                        <ThemeToggle />
                        {showAuth && (
                            <>
                                <Link href="/login">
                                    <Button variant="ghost" className="text-muted-foreground hover:text-foreground hidden sm:inline-flex font-medium">
                                        Đăng nhập
                                    </Button>
                                </Link>
                                <Link href="/register">
                                    <Button className="gradient-primary hover:opacity-90 text-white border-0 shadow-lg shadow-indigo-500/25 dark:shadow-indigo-500/15 hover:shadow-indigo-500/35 transition-all duration-300 text-sm sm:text-base font-semibold">
                                        Bắt đầu miễn phí
                                    </Button>
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    )
}
