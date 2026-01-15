"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { GraduationCap, Loader2, User, BookOpen } from "lucide-react"
import { cn } from "@/lib/utils"

type Role = "student" | "teacher"

export default function RegisterPage() {
    const router = useRouter()
    const supabase = createClient()

    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [fullName, setFullName] = useState("")
    const [className, setClassName] = useState("")
    const [role, setRole] = useState<Role>("student")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        // Check teacher whitelist if registering as teacher
        if (role === "teacher") {
            const { data: whitelistCheck } = await supabase
                .from("teacher_whitelist")
                .select("id")
                .eq("email", email.toLowerCase().trim())
                .single()

            if (!whitelistCheck) {
                setError("Email này chưa được cấp quyền Giáo viên. Vui lòng liên hệ quản trị viên hoặc đăng ký với tư cách Học sinh.")
                setLoading(false)
                return
            }
        }

        // Sign up with Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
        })

        if (authError) {
            setError(authError.message)
            setLoading(false)
            return
        }

        if (!authData.user) {
            setError("Có lỗi xảy ra khi tạo tài khoản")
            setLoading(false)
            return
        }

        // Update profile (trigger may have created it, so use upsert)
        const { error: profileError } = await supabase
            .from("profiles")
            .upsert({
                id: authData.user.id,
                role: role,
                full_name: fullName,
                class: role === "student" ? className : null,
            }, { onConflict: 'id' })

        if (profileError) {
            setError(profileError.message)
            setLoading(false)
            return
        }

        // Redirect based on role
        if (role === "teacher") {
            router.push("/teacher/dashboard")
        } else {
            router.push("/student/dashboard")
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
            <Card className="w-full max-w-md border-slate-700 bg-slate-800/50 backdrop-blur-sm">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center">
                        <GraduationCap className="w-8 h-8 text-white" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-white">Tạo tài khoản mới</CardTitle>
                    <CardDescription className="text-slate-400">
                        Tham gia hệ thống thi trắc nghiệm
                    </CardDescription>
                </CardHeader>

                <form onSubmit={handleRegister}>
                    <CardContent className="space-y-4">
                        {error && (
                            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        {/* Role Selection */}
                        <div className="space-y-2">
                            <Label className="text-slate-300">Bạn là</Label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setRole("student")}
                                    className={cn(
                                        "p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2",
                                        role === "student"
                                            ? "border-blue-500 bg-blue-500/10 text-blue-400"
                                            : "border-slate-600 bg-slate-700/30 text-slate-400 hover:border-slate-500"
                                    )}
                                >
                                    <User className="w-6 h-6" />
                                    <span className="font-medium">Học sinh</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setRole("teacher")}
                                    className={cn(
                                        "p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2",
                                        role === "teacher"
                                            ? "border-purple-500 bg-purple-500/10 text-purple-400"
                                            : "border-slate-600 bg-slate-700/30 text-slate-400 hover:border-slate-500"
                                    )}
                                >
                                    <BookOpen className="w-6 h-6" />
                                    <span className="font-medium">Giáo viên</span>
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="fullName" className="text-slate-300">Họ và tên</Label>
                            <Input
                                id="fullName"
                                type="text"
                                placeholder="Nguyễn Văn A"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                required
                                className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500"
                            />
                        </div>

                        {role === "student" && (
                            <div className="space-y-2">
                                <Label htmlFor="className" className="text-slate-300">Lớp</Label>
                                <Input
                                    id="className"
                                    type="text"
                                    placeholder="12A1"
                                    value={className}
                                    onChange={(e) => setClassName(e.target.value)}
                                    className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500"
                                />
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-slate-300">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="your@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-slate-300">Mật khẩu</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                                className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500"
                            />
                            <p className="text-xs text-slate-500">Tối thiểu 6 ký tự</p>
                        </div>
                    </CardContent>

                    <CardFooter className="flex flex-col gap-4">
                        <Button
                            type="submit"
                            className={cn(
                                "w-full",
                                role === "student"
                                    ? "bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                                    : "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                            )}
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Đang đăng ký...
                                </>
                            ) : (
                                "Đăng ký"
                            )}
                        </Button>

                        <p className="text-sm text-slate-400 text-center">
                            Đã có tài khoản?{" "}
                            <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium">
                                Đăng nhập
                            </Link>
                        </p>
                    </CardFooter>
                </form>
            </Card>
        </div>
    )
}
