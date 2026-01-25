"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Video,
    Calendar,
    Clock,
    BookOpen,
    ArrowLeft,
    Plus,
    Edit,
    Trash2,
    ExternalLink,
    GraduationCap,
    User,
    X,
    Save
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const GOOGLE_MEET_LINK = "https://meet.google.com/jdd-gddy-een";

interface ScheduleItem {
    id: string;
    day: string;
    time: string;
    topic: string;
    host: string;
    sort_order: number;
}

export default function LiveRoomPage() {
    const [user, setUser] = useState<{ name: string; email: string; role?: string } | null>(null);
    const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
    const [showEditor, setShowEditor] = useState(false);
    const [editItem, setEditItem] = useState<ScheduleItem | null>(null);
    const [formDay, setFormDay] = useState("");
    const [formTime, setFormTime] = useState("");
    const [formTopic, setFormTopic] = useState("");
    const [formHost, setFormHost] = useState("");

    const supabase = useMemo(() => {
        if (typeof window === 'undefined') return null;
        return createClient();
    }, []);

    useEffect(() => {
        if (supabase) {
            checkAuth();
            fetchSchedule();
        }
    }, [supabase]);

    const checkAuth = async () => {
        if (!supabase) return;
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            const { data: profile } = await supabase
                .from("profiles")
                .select("full_name, email, role")
                .eq("id", session.user.id)
                .single();
            setUser({
                name: profile?.full_name || session.user.email?.split("@")[0] || "Học sinh",
                email: session.user.email || "",
                role: profile?.role,
            });
        }
    };

    const fetchSchedule = async () => {
        if (!supabase) return;
        const { data } = await supabase
            .from("live_schedule")
            .select("*")
            .eq("is_active", true)
            .order("sort_order");
        if (data) setSchedule(data);
    };

    const handleJoinMeet = () => {
        window.open(GOOGLE_MEET_LINK, "_blank");
    };

    const openEditor = (item?: ScheduleItem) => {
        if (item) {
            setEditItem(item);
            setFormDay(item.day);
            setFormTime(item.time);
            setFormTopic(item.topic);
            setFormHost(item.host || "");
        } else {
            setEditItem(null);
            setFormDay("");
            setFormTime("");
            setFormTopic("");
            setFormHost("");
        }
        setShowEditor(true);
    };

    const handleSave = async () => {
        if (!supabase) return;
        if (!formDay || !formTime || !formTopic) return;

        if (editItem) {
            await supabase
                .from("live_schedule")
                .update({ day: formDay, time: formTime, topic: formTopic, host: formHost })
                .eq("id", editItem.id);
        } else {
            await supabase
                .from("live_schedule")
                .insert({ day: formDay, time: formTime, topic: formTopic, host: formHost, sort_order: schedule.length + 1 });
        }

        setShowEditor(false);
        fetchSchedule();
    };

    const handleDelete = async (id: string) => {
        if (!supabase) return;
        if (confirm("Xóa lịch này?")) {
            await supabase.from("live_schedule").delete().eq("id", id);
            fetchSchedule();
        }
    };

    const ADMIN_EMAIL = "ptan12209@gmail.com";
    const canEdit = user?.email === ADMIN_EMAIL;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
            {/* Navigation */}
            <nav className="border-b border-gray-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16 items-center">
                        <div className="flex items-center gap-4">
                            <Link href="/">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                                        <GraduationCap className="w-5 h-5 text-white" />
                                    </div>
                                    <span className="text-xl font-bold text-gray-900 dark:text-white">LuyenDe 2026</span>
                                </div>
                            </Link>
                        </div>
                        <div className="flex items-center gap-3">
                            <ThemeToggle />
                            {user ? (
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                    <User className="w-4 h-4" />
                                    <span>{user.name}</span>
                                </div>
                            ) : (
                                <Link href="/login">
                                    <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                                        Đăng nhập
                                    </Button>
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            <div className="max-w-5xl mx-auto px-4 py-8">
                <Link href="/student/dashboard" className="inline-flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-6">
                    <ArrowLeft className="w-4 h-4" />
                    Quay lại Dashboard
                </Link>

                {/* Main Join Section */}
                <Card className="border-blue-200 dark:border-blue-900 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 mb-8 overflow-hidden shadow-lg">
                    <CardContent className="p-8 md:p-12 text-center relative">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-blue-200/50 dark:bg-blue-700/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                        <div className="relative z-10">
                            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-xl shadow-blue-500/30">
                                <Video className="w-10 h-10 text-white" />
                            </div>
                            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                                Buổi Live Chữa Đề
                            </h2>
                            <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-md mx-auto">
                                Tham gia buổi học trực tuyến cùng giáo viên và bạn bè qua Google Meet
                            </p>

                            <Button
                                onClick={handleJoinMeet}
                                size="lg"
                                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-lg px-10 py-6 h-auto shadow-xl shadow-green-500/30"
                            >
                                <ExternalLink className="w-5 h-5 mr-2" />
                                Vào Google Meet
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Schedule */}
                <Card className="border-gray-200 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-800 mb-8">
                    <CardHeader className="border-b border-gray-50 dark:border-slate-700 flex flex-row items-center justify-between">
                        <CardTitle className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-blue-600" />
                            Lịch Live Hàng Tuần
                        </CardTitle>
                        {canEdit && (
                            <Button
                                onClick={() => openEditor()}
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white"
                            >
                                <Plus className="w-4 h-4 mr-1" />
                                Thêm lịch
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent className="p-0">
                        {schedule.length === 0 ? (
                            <div className="p-12 text-center">
                                <Calendar className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto mb-4" />
                                <p className="text-gray-500 dark:text-gray-400">Chưa có lịch nào được đăng</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100 dark:divide-slate-700">
                                {schedule.map((item) => (
                                    <div
                                        key={item.id}
                                        className="flex items-center justify-between p-5 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/50 dark:to-indigo-900/50 rounded-xl flex items-center justify-center">
                                                <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                            </div>
                                            <div>
                                                <p className="text-gray-900 dark:text-white font-semibold">{item.topic}</p>
                                                <p className="text-gray-500 dark:text-gray-400 text-sm flex items-center gap-3">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="w-3 h-3" />
                                                        {item.day}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {item.time}
                                                    </span>
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <p className="text-blue-600 dark:text-blue-400 font-medium text-sm bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-full">{item.host}</p>
                                            {canEdit && (
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        onClick={() => openEditor(item)}
                                                        className="border-gray-200 dark:border-slate-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        onClick={() => handleDelete(item.id)}
                                                        className="border-gray-200 dark:border-slate-600 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Quick Links */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Link href="/resources">
                        <Card className="border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:shadow-lg hover:border-blue-200 dark:hover:border-blue-700 transition-all cursor-pointer h-full">
                            <CardContent className="p-6">
                                <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mb-4">
                                    <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                </div>
                                <h4 className="text-gray-900 dark:text-white font-semibold mb-1">Kho Tài Liệu</h4>
                                <p className="text-gray-500 dark:text-gray-400 text-sm">Xem đề thi & tài liệu</p>
                            </CardContent>
                        </Card>
                    </Link>

                    <Link href="/student/dashboard">
                        <Card className="border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:shadow-lg hover:border-emerald-200 dark:hover:border-emerald-700 transition-all cursor-pointer h-full">
                            <CardContent className="p-6">
                                <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
                                    <GraduationCap className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <h4 className="text-gray-900 dark:text-white font-semibold mb-1">Luyện Đề</h4>
                                <p className="text-gray-500 dark:text-gray-400 text-sm">Làm bài thi thử</p>
                            </CardContent>
                        </Card>
                    </Link>

                    <Link href="/student/profile">
                        <Card className="border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:shadow-lg hover:border-amber-200 dark:hover:border-amber-700 transition-all cursor-pointer h-full">
                            <CardContent className="p-6">
                                <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center mb-4">
                                    <User className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                                </div>
                                <h4 className="text-gray-900 dark:text-white font-semibold mb-1">Hồ Sơ</h4>
                                <p className="text-gray-500 dark:text-gray-400 text-sm">XP & Thành tích</p>
                            </CardContent>
                        </Card>
                    </Link>
                </div>

                {user && canEdit && (
                    <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
                        <span className="inline-flex items-center gap-2 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1.5 rounded-full">
                            <Edit className="w-3 h-3" />
                            Chế độ Admin: Có thể chỉnh sửa lịch
                        </span>
                    </div>
                )}
            </div>

            {/* Editor Modal */}
            {showEditor && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <Card className="w-full max-w-md border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl">
                        <CardHeader className="flex flex-row items-center justify-between border-b border-gray-100 dark:border-slate-700 pb-4">
                            <CardTitle className="text-gray-800 dark:text-white text-lg">
                                {editItem ? "Sửa lịch" : "Thêm lịch mới"}
                            </CardTitle>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setShowEditor(false)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                            >
                                <X className="w-5 h-5" />
                            </Button>
                        </CardHeader>
                        <CardContent className="pt-5 space-y-4">
                            <div className="space-y-2">
                                <Label className="text-gray-700 dark:text-gray-300 font-medium">Ngày</Label>
                                <Input
                                    value={formDay}
                                    onChange={(e) => setFormDay(e.target.value)}
                                    placeholder="VD: Thứ 7"
                                    className="bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 dark:text-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-gray-700 dark:text-gray-300 font-medium">Giờ</Label>
                                <Input
                                    value={formTime}
                                    onChange={(e) => setFormTime(e.target.value)}
                                    placeholder="VD: 20:00 - 22:00"
                                    className="bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 dark:text-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-gray-700 dark:text-gray-300 font-medium">Chủ đề</Label>
                                <Input
                                    value={formTopic}
                                    onChange={(e) => setFormTopic(e.target.value)}
                                    placeholder="VD: Chữa đề Toán THPT 2026"
                                    className="bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 dark:text-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-gray-700 dark:text-gray-300 font-medium">Người dạy</Label>
                                <Input
                                    value={formHost}
                                    onChange={(e) => setFormHost(e.target.value)}
                                    placeholder="VD: Thầy Ái"
                                    className="bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 dark:text-white"
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <Button
                                    variant="outline"
                                    onClick={() => setShowEditor(false)}
                                    className="flex-1 border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300"
                                >
                                    Hủy
                                </Button>
                                <Button
                                    onClick={handleSave}
                                    disabled={!formDay || !formTime || !formTopic}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                    <Save className="w-4 h-4 mr-2" />
                                    Lưu
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
