"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Video, Calendar, Clock, BookOpen, ArrowLeft, Plus, Edit, Trash2,
    GraduationCap, User, X, Save, Youtube, Settings, MessageCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

interface LiveConfig { id: string; youtube_video_id: string | null; youtube_chat_enabled: boolean; is_live: boolean; title: string | null; }
interface ScheduleItem { id: string; day: string; time: string; topic: string; host: string; sort_order: number; }

export default function LiveRoomPage() {
    const [user, setUser] = useState<{ name: string; email: string; role?: string } | null>(null);
    const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
    const [liveConfig, setLiveConfig] = useState<LiveConfig | null>(null);
    const [showEditor, setShowEditor] = useState(false);
    const [showLiveSettings, setShowLiveSettings] = useState(false);
    const [editItem, setEditItem] = useState<ScheduleItem | null>(null);
    const [formDay, setFormDay] = useState(""); const [formTime, setFormTime] = useState("");
    const [formTopic, setFormTopic] = useState(""); const [formHost, setFormHost] = useState("");
    const [youtubeUrl, setYoutubeUrl] = useState(""); const [liveTitle, setLiveTitle] = useState("");
    const [chatEnabled, setChatEnabled] = useState(true); const [isLive, setIsLive] = useState(false);

    const supabase = useMemo(() => { if (typeof window === 'undefined') return null; return createClient(); }, []);

    useEffect(() => { if (supabase) { checkAuth(); fetchSchedule(); fetchLiveConfig(); } }, [supabase]);

    const checkAuth = async () => {
        if (!supabase) return;
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            const { data: profile } = await supabase.from("profiles").select("full_name, email, role").eq("id", session.user.id).single();
            setUser({ name: profile?.full_name || session.user.email?.split("@")[0] || "Học sinh", email: session.user.email || "", role: profile?.role });
        }
    };

    const fetchSchedule = async () => { if (!supabase) return; const { data } = await supabase.from("live_schedule").select("*").eq("is_active", true).order("sort_order"); if (data) setSchedule(data); };
    const fetchLiveConfig = async () => {
        if (!supabase) return; const { data } = await supabase.from("live_config").select("*").single();
        if (data) { setLiveConfig(data); setYoutubeUrl(data.youtube_video_id || ""); setLiveTitle(data.title || ""); setChatEnabled(data.youtube_chat_enabled); setIsLive(data.is_live); }
    };

    const extractYoutubeId = (url: string): string | null => {
        if (!url) return null; if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;
        const patterns = [/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/, /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/];
        for (const pattern of patterns) { const match = url.match(pattern); if (match) return match[1]; } return null;
    };

    const saveLiveSettings = async () => {
        if (!supabase) return; const videoId = extractYoutubeId(youtubeUrl);
        const configData = { youtube_video_id: videoId, youtube_chat_enabled: chatEnabled, is_live: isLive, title: liveTitle };
        if (liveConfig) await supabase.from("live_config").update(configData).eq("id", liveConfig.id);
        else await supabase.from("live_config").insert(configData);
        fetchLiveConfig(); setShowLiveSettings(false);
    };

    const openEditor = (item?: ScheduleItem) => {
        if (item) { setEditItem(item); setFormDay(item.day); setFormTime(item.time); setFormTopic(item.topic); setFormHost(item.host || ""); }
        else { setEditItem(null); setFormDay(""); setFormTime(""); setFormTopic(""); setFormHost(""); }
        setShowEditor(true);
    };

    const handleSave = async () => {
        if (!supabase || !formDay || !formTime || !formTopic) return;
        if (editItem) await supabase.from("live_schedule").update({ day: formDay, time: formTime, topic: formTopic, host: formHost }).eq("id", editItem.id);
        else await supabase.from("live_schedule").insert({ day: formDay, time: formTime, topic: formTopic, host: formHost, sort_order: schedule.length + 1 });
        setShowEditor(false); fetchSchedule();
    };

    const handleDelete = async (id: string) => { if (!supabase) return; if (confirm("Xóa lịch này?")) { await supabase.from("live_schedule").delete().eq("id", id); fetchSchedule(); } };
    const ADMIN_EMAIL = "ptan12209@gmail.com";
    const canEdit = user?.email === ADMIN_EMAIL || user?.role === "teacher";

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950/30 to-slate-950">
            <nav className="glass-nav sticky top-0 z-50 border-b border-white/10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16 items-center">
                        <Link href="/"><div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/20"><Youtube className="w-5 h-5 text-white" /></div>
                            <span className="text-xl font-bold text-white">Live Class</span>
                        </div></Link>
                        <div className="flex items-center gap-3">
                            <ThemeToggle />
                            {canEdit && <Button onClick={() => setShowLiveSettings(true)} variant="outline" className="border-white/20 text-white hover:bg-white/10"><Settings className="w-4 h-4 mr-2" />Cài đặt Live</Button>}
                            {user ? (<div className="flex items-center gap-2 text-sm text-gray-300"><User className="w-4 h-4" /><span>{user.name}</span></div>)
                                : (<Link href="/login"><Button className="gradient-primary text-white border-0 shadow-lg shadow-indigo-500/20">Đăng nhập</Button></Link>)}
                        </div>
                    </div>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto px-4 py-8">
                <Link href="/student/dashboard" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"><ArrowLeft className="w-4 h-4" />Quay lại Dashboard</Link>

                {liveConfig?.is_live && (
                    <div className="flex items-center gap-2 mb-6">
                        <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span></span>
                        <span className="text-red-400 font-semibold uppercase tracking-wider text-sm">Đang phát trực tiếp</span>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-4">
                        {liveConfig?.youtube_video_id ? (
                            <>
                                <h1 className="text-2xl font-bold text-white">{liveConfig.title || "Buổi Live Chữa Đề"}</h1>
                                <div className="relative aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl shadow-indigo-500/10 ring-1 ring-white/10">
                                    <iframe src={`https://www.youtube.com/embed/${liveConfig.youtube_video_id}?autoplay=1&rel=0`} title="YouTube Live" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="absolute inset-0 w-full h-full" />
                                </div>
                                <div className="flex flex-wrap gap-3">
                                    <a href={`https://youtube.com/watch?v=${liveConfig.youtube_video_id}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors shadow-lg shadow-red-500/20"><Youtube className="w-4 h-4" />Xem trên YouTube</a>
                                </div>
                            </>
                        ) : (
                            <div className="glass-card rounded-2xl border-white/10 bg-white/5">
                                <div className="py-20 text-center">
                                    <div className="w-20 h-20 bg-gradient-to-br from-gray-700 to-gray-800 rounded-2xl mx-auto mb-6 flex items-center justify-center"><Video className="w-10 h-10 text-gray-400" /></div>
                                    <h2 className="text-2xl font-bold text-white mb-3">Chưa có buổi Live</h2>
                                    <p className="text-gray-400 mb-6 max-w-md mx-auto">Hiện tại chưa có buổi học trực tuyến nào. Hãy xem lịch học bên cạnh để biết thời gian sắp tới.</p>
                                    {canEdit && <Button onClick={() => setShowLiveSettings(true)} className="bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/20"><Settings className="w-4 h-4 mr-2" />Thiết lập Live Stream</Button>}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-6">
                        {liveConfig?.youtube_video_id && liveConfig?.youtube_chat_enabled && (
                            <div className="glass-card rounded-2xl border-white/10 bg-white/5 overflow-hidden">
                                <div className="p-4 border-b border-white/10"><h3 className="text-white flex items-center gap-2 text-base font-bold"><MessageCircle className="w-4 h-4 text-red-400" />Chat Trực Tiếp</h3></div>
                                <div className="aspect-[9/16] max-h-[500px]"><iframe src={`https://www.youtube.com/live_chat?v=${liveConfig.youtube_video_id}&embed_domain=${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}`} className="w-full h-full" /></div>
                            </div>
                        )}

                        <div className="glass-card rounded-2xl border-white/10 bg-white/5 overflow-hidden">
                            <div className="p-4 border-b border-white/10 flex items-center justify-between">
                                <h3 className="text-white flex items-center gap-2 text-base font-bold"><Calendar className="w-4 h-4 text-indigo-400" />Lịch Live Tuần Này</h3>
                                {canEdit && <Button onClick={() => openEditor()} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white h-8"><Plus className="w-3 h-3 mr-1" />Thêm</Button>}
                            </div>
                            {schedule.length === 0 ? (
                                <div className="py-8 text-center"><Calendar className="w-8 h-8 text-gray-600 mx-auto mb-2" /><p className="text-gray-400 text-sm">Chưa có lịch</p></div>
                            ) : (
                                <div className="divide-y divide-white/5">
                                    {schedule.map((item) => (
                                        <div key={item.id} className="p-4 hover:bg-white/5 transition-colors group">
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <p className="text-white font-medium text-sm">{item.topic}</p>
                                                    <p className="text-gray-400 text-xs mt-1 flex items-center gap-2">
                                                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{item.day}</span>
                                                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{item.time}</span>
                                                    </p>
                                                    {item.host && <p className="text-indigo-400 text-xs mt-1">{item.host}</p>}
                                                </div>
                                                {canEdit && (
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => openEditor(item)} className="p-1.5 text-gray-400 hover:text-indigo-400 transition-colors"><Edit className="w-3.5 h-3.5" /></button>
                                                        <button onClick={() => handleDelete(item.id)} className="p-1.5 text-gray-400 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <Link href="/resources">
                                <div className="glass-card rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer p-4 text-center"><BookOpen className="w-6 h-6 text-indigo-400 mx-auto mb-2" /><p className="text-white text-sm font-medium">Tài liệu</p></div>
                            </Link>
                            <Link href="/student/exams">
                                <div className="glass-card rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer p-4 text-center"><GraduationCap className="w-6 h-6 text-emerald-400 mx-auto mb-2" /><p className="text-white text-sm font-medium">Luyện đề</p></div>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {showLiveSettings && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="w-full max-w-lg glass-card rounded-2xl border-white/10 bg-slate-900/95 shadow-2xl overflow-hidden">
                        <div className="flex items-center justify-between p-5 border-b border-white/10">
                            <h2 className="text-white text-lg font-bold flex items-center gap-2"><Youtube className="w-5 h-5 text-red-500" />Cài đặt YouTube Live</h2>
                            <Button variant="ghost" size="icon" onClick={() => setShowLiveSettings(false)} className="text-gray-400 hover:text-white hover:bg-white/10"><X className="w-5 h-5" /></Button>
                        </div>
                        <div className="p-5 space-y-5">
                            <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4">
                                <h4 className="text-indigo-400 font-medium mb-2 text-sm">📌 Hướng dẫn nhanh:</h4>
                                <ol className="text-gray-300 text-sm space-y-1 list-decimal list-inside"><li>Vào YouTube Studio → Tạo Live Stream</li><li>Copy link video (VD: youtube.com/watch?v=ABC123)</li><li>Dán vào ô bên dưới</li><li>Bật &quot;Đang phát trực tiếp&quot; khi bắt đầu</li></ol>
                            </div>
                            <div className="space-y-2"><Label className="text-gray-300 font-medium">Tiêu đề buổi Live</Label><Input value={liveTitle} onChange={(e) => setLiveTitle(e.target.value)} placeholder="VD: Chữa đề Toán THPT 2026 - Buổi 5" className="bg-white/5 border-white/10 text-white placeholder-gray-500 rounded-xl" /></div>
                            <div className="space-y-2"><Label className="text-gray-300 font-medium">Link hoặc ID Video YouTube</Label><Input value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} placeholder="VD: https://youtube.com/watch?v=dQw4w9WgXcQ" className="bg-white/5 border-white/10 text-white placeholder-gray-500 rounded-xl" /><p className="text-gray-500 text-xs">Hỗ trợ: youtube.com/watch?v=..., youtu.be/..., youtube.com/live/...</p></div>
                            <div className="flex items-center justify-between py-2"><div><Label className="text-gray-300 font-medium">Hiển thị Chat</Label><p className="text-gray-500 text-xs">Cho phép học sinh chat trực tiếp</p></div>
                                <button onClick={() => setChatEnabled(!chatEnabled)} className={cn("w-12 h-6 rounded-full transition-colors relative", chatEnabled ? "bg-emerald-600" : "bg-gray-600")}><span className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all", chatEnabled ? "right-1" : "left-1")} /></button>
                            </div>
                            <div className="flex items-center justify-between py-2 border-t border-white/10 pt-4"><div><Label className="text-gray-300 font-medium flex items-center gap-2"><span className="relative flex h-2 w-2"><span className={cn("absolute inline-flex h-full w-full rounded-full opacity-75", isLive ? "animate-ping bg-red-400" : "bg-gray-400")}></span><span className={cn("relative inline-flex rounded-full h-2 w-2", isLive ? "bg-red-500" : "bg-gray-500")}></span></span>Đang phát trực tiếp</Label><p className="text-gray-500 text-xs">Bật khi bạn bắt đầu stream</p></div>
                                <button onClick={() => setIsLive(!isLive)} className={cn("w-12 h-6 rounded-full transition-colors relative", isLive ? "bg-red-600" : "bg-gray-600")}><span className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all", isLive ? "right-1" : "left-1")} /></button>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <Button variant="outline" onClick={() => setShowLiveSettings(false)} className="flex-1 border-white/20 text-gray-300 hover:bg-white/10">Hủy</Button>
                                <Button onClick={saveLiveSettings} className="flex-1 bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/20"><Save className="w-4 h-4 mr-2" />Lưu cài đặt</Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showEditor && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="w-full max-w-md glass-card rounded-2xl border-white/10 bg-slate-900/95 shadow-2xl overflow-hidden">
                        <div className="flex items-center justify-between p-5 border-b border-white/10">
                            <h2 className="text-white text-lg font-bold">{editItem ? "Sửa lịch" : "Thêm lịch mới"}</h2>
                            <Button variant="ghost" size="icon" onClick={() => setShowEditor(false)} className="text-gray-400 hover:text-white hover:bg-white/10"><X className="w-5 h-5" /></Button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="space-y-2"><Label className="text-gray-300 font-medium">Ngày</Label><Input value={formDay} onChange={(e) => setFormDay(e.target.value)} placeholder="VD: Thứ 7" className="bg-white/5 border-white/10 text-white rounded-xl" /></div>
                            <div className="space-y-2"><Label className="text-gray-300 font-medium">Giờ</Label><Input value={formTime} onChange={(e) => setFormTime(e.target.value)} placeholder="VD: 20:00 - 22:00" className="bg-white/5 border-white/10 text-white rounded-xl" /></div>
                            <div className="space-y-2"><Label className="text-gray-300 font-medium">Chủ đề</Label><Input value={formTopic} onChange={(e) => setFormTopic(e.target.value)} placeholder="VD: Chữa đề Toán THPT 2026" className="bg-white/5 border-white/10 text-white rounded-xl" /></div>
                            <div className="space-y-2"><Label className="text-gray-300 font-medium">Người dạy</Label><Input value={formHost} onChange={(e) => setFormHost(e.target.value)} placeholder="VD: Thầy Ái" className="bg-white/5 border-white/10 text-white rounded-xl" /></div>
                            <div className="flex gap-3 pt-4">
                                <Button variant="outline" onClick={() => setShowEditor(false)} className="flex-1 border-white/20 text-gray-300 hover:bg-white/10">Hủy</Button>
                                <Button onClick={handleSave} disabled={!formDay || !formTime || !formTopic} className="flex-1 gradient-primary text-white border-0 shadow-lg shadow-indigo-500/20"><Save className="w-4 h-4 mr-2" />Lưu</Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
