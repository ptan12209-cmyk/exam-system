"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/ui/ThemeToggle"

interface NavbarProps {
    showAuth?: boolean
}

export function Navbar({ showAuth = true }: NavbarProps) {
    return (
        <nav className="glass-nav sticky top-0 z-50 safe-top">
            <div className="mx-auto max-w-7xl px-6 py-4 md:px-10">
                <div className="flex h-16 items-center justify-between">
                    <Link href="/" className="flex items-center gap-3 group">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[hsl(var(--foreground))]/60 transition-transform duration-200 group-hover:scale-[1.02]">
                            <div className="h-4 w-4 rounded-full border border-[hsl(var(--foreground))]/60" />
                        </div>
                        <span className="text-xl font-bold tracking-tight text-[hsl(var(--foreground))]">
                            ExamHub
                        </span>
                    </Link>
                    <div className="flex items-center gap-2 sm:gap-3">
                        <ThemeToggle />
                        {showAuth && (
                            <>
                                <Link href="/login">
                                    <Button variant="ghost" className="hidden sm:inline-flex font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
                                        Đăng nhập
                                    </Button>
                                </Link>
                                <Link href="/register">
                                    <Button className="font-semibold">
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
