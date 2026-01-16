"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Force dynamic rendering to avoid build-time Supabase client creation
export const dynamic = 'force-dynamic';

// Configuration - Change this to your actual Meet link
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

    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        checkAuth();
        fetchSchedule();
    }, []);

    const checkAuth = async () => {
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
        if (confirm("Xóa lịch này?")) {
            await supabase.from("live_schedule").delete().eq("id", id);
            fetchSchedule();
        }
    };

    // Chỉ email admin mới có thể sửa lịch
    const ADMIN_EMAIL = "ptan12209@gmail.com";
    const canEdit = user?.email === ADMIN_EMAIL;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            {/* Header */}
            <div className="bg-black/30 backdrop-blur-sm border-b border-white/10">
                <div className="max-w-5xl mx-auto px-4 py-6">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.back()}
                            className="text-white/60 hover:text-white"
                        >
                            ← Quay lại
                        </button>
                        <div>
                            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                                📺 Phòng Học Trực Tuyến
                            </h1>
                            <p className="text-white/60 mt-1">
                                Tham gia buổi chữa đề cùng nhóm
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 py-8">
                {/* Main Join Section */}
                <div className="bg-gradient-to-br from-purple-600/30 to-pink-600/30 backdrop-blur-md rounded-3xl p-8 mb-8 text-center border border-white/10">
                    <div className="text-6xl mb-4">🎥</div>
                    <h2 className="text-2xl font-bold text-white mb-2">
                        Buổi Live Chữa Đề
                    </h2>
                    <p className="text-white/70 mb-6">
                        Click nút bên dưới để vào phòng học trực tuyến
                    </p>

                    <button
                        onClick={handleJoinMeet}
                        className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-xl rounded-2xl hover:shadow-lg hover:shadow-green-500/30 transition-all transform hover:scale-105"
                    >
                        🔗 VÀO GOOGLE MEET
                    </button>

                    <p className="text-white/50 text-sm mt-4">
                        Mở Google Meet trong tab mới
                    </p>
                </div>

                {/* Schedule */}
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-8">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            📅 Lịch Live Hàng Tuần
                        </h3>
                        {canEdit && (
                            <button
                                onClick={() => openEditor()}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                            >
                                ➕ Thêm lịch
                            </button>
                        )}
                    </div>

                    {schedule.length === 0 ? (
                        <p className="text-white/50 text-center py-8">Chưa có lịch nào</p>
                    ) : (
                        <div className="space-y-4">
                            {schedule.map((item) => (
                                <div
                                    key={item.id}
                                    className="flex items-center justify-between bg-white/5 rounded-xl p-4"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                                            <span className="text-2xl">📚</span>
                                        </div>
                                        <div>
                                            <p className="text-white font-semibold">{item.topic}</p>
                                            <p className="text-white/60 text-sm">
                                                {item.day} • {item.time}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <p className="text-purple-400 font-medium">{item.host}</p>
                                        {canEdit && (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => openEditor(item)}
                                                    className="px-2 py-1 bg-blue-600 text-white rounded text-sm"
                                                >
                                                    ✏️
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(item.id)}
                                                    className="px-2 py-1 bg-red-600 text-white rounded text-sm"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Quick Links */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                        onClick={() => router.push("/resources")}
                        className="bg-white/10 backdrop-blur-md rounded-xl p-6 text-left hover:bg-white/20 transition-all"
                    >
                        <div className="text-3xl mb-2">📚</div>
                        <h4 className="text-white font-semibold">Kho Tài Liệu</h4>
                        <p className="text-white/60 text-sm">Xem đề thi & tài liệu</p>
                    </button>

                    <button
                        onClick={() => router.push("/student/dashboard")}
                        className="bg-white/10 backdrop-blur-md rounded-xl p-6 text-left hover:bg-white/20 transition-all"
                    >
                        <div className="text-3xl mb-2">📝</div>
                        <h4 className="text-white font-semibold">Luyện Đề</h4>
                        <p className="text-white/60 text-sm">Làm bài thi thử</p>
                    </button>

                    <button
                        onClick={() => router.push("/student/profile")}
                        className="bg-white/10 backdrop-blur-md rounded-xl p-6 text-left hover:bg-white/20 transition-all"
                    >
                        <div className="text-3xl mb-2">🏆</div>
                        <h4 className="text-white font-semibold">Thành Tích</h4>
                        <p className="text-white/60 text-sm">XP & Badges của bạn</p>
                    </button>
                </div>

                {/* User Info */}
                {user && (
                    <div className="mt-8 text-center text-white/50 text-sm">
                        Đang đăng nhập: <span className="text-white">{user.name}</span> ({user.email})
                        {canEdit && <span className="ml-2 text-green-400">✏️ Có thể sửa lịch</span>}
                    </div>
                )}
            </div>

            {/* Editor Modal */}
            {showEditor && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md">
                        <h3 className="text-xl font-bold text-white mb-4">
                            {editItem ? "✏️ Sửa lịch" : "➕ Thêm lịch mới"}
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="text-white/70 text-sm">Ngày</label>
                                <input
                                    type="text"
                                    value={formDay}
                                    onChange={(e) => setFormDay(e.target.value)}
                                    placeholder="VD: Thứ 7"
                                    className="w-full mt-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                                />
                            </div>
                            <div>
                                <label className="text-white/70 text-sm">Giờ</label>
                                <input
                                    type="text"
                                    value={formTime}
                                    onChange={(e) => setFormTime(e.target.value)}
                                    placeholder="VD: 20:00 - 22:00"
                                    className="w-full mt-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                                />
                            </div>
                            <div>
                                <label className="text-white/70 text-sm">Chủ đề</label>
                                <input
                                    type="text"
                                    value={formTopic}
                                    onChange={(e) => setFormTopic(e.target.value)}
                                    placeholder="VD: Chữa đề Toán THPT 2026"
                                    className="w-full mt-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                                />
                            </div>
                            <div>
                                <label className="text-white/70 text-sm">Người dạy</label>
                                <input
                                    type="text"
                                    value={formHost}
                                    onChange={(e) => setFormHost(e.target.value)}
                                    placeholder="VD: Thầy Ái"
                                    className="w-full mt-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowEditor(false)}
                                className="flex-1 py-2 bg-gray-600 text-white rounded-lg"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={!formDay || !formTime || !formTopic}
                                className="flex-1 py-2 bg-green-600 text-white rounded-lg disabled:opacity-50"
                            >
                                💾 Lưu
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
