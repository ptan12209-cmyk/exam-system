import { useState } from "react";

const SPRINTS = [
  {
    id: 1,
    title: "Foundation",
    subtitle: "DB + Account Linking",
    days: "2 ngày",
    color: "#7C3AED",
    bgLight: "#EDE9FE",
    border: "#A78BFA",
    icon: "🔗",
    goal: "Xây nền tảng liên kết Discord ID ↔ ExamHub account. Không có sprint này, mọi tính năng sau đều không thể hoạt động.",
    tasks: [
      {
        group: "🗄️ Database Migration",
        items: [
          {
            name: "Thêm cột discord_id vào bảng profiles",
            detail: "ALTER TABLE + index",
            code: `-- migration-discord-integration.sql
ALTER TABLE profiles 
  ADD COLUMN discord_id VARCHAR(20) UNIQUE,
  ADD COLUMN discord_username VARCHAR(100),
  ADD COLUMN discord_linked_at TIMESTAMPTZ;

CREATE INDEX idx_profiles_discord_id 
  ON profiles(discord_id);

-- Bảng lưu token xác thực tạm thời (expire 10 phút)
CREATE TABLE discord_link_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token VARCHAR(8) UNIQUE NOT NULL,
  discord_id VARCHAR(20) NOT NULL,
  discord_username VARCHAR(100),
  expires_at TIMESTAMPTZ NOT NULL 
    DEFAULT (NOW() + INTERVAL '10 minutes'),
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tự xóa token cũ mỗi giờ (pg_cron hoặc trigger)
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS void AS $$
  DELETE FROM discord_link_tokens 
  WHERE expires_at < NOW() OR used = TRUE;
$$ LANGUAGE SQL;`,
            lang: "sql"
          },
          {
            name: "Thêm bảng voice_sessions để log thời gian học",
            detail: "Dùng cho Sprint 2 XP sync",
            code: `-- Bảng ghi nhận phiên học trên Discord Voice
CREATE TABLE discord_voice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discord_id VARCHAR(20) NOT NULL,
  profile_id UUID REFERENCES profiles(id),
  channel_id VARCHAR(20) NOT NULL,
  channel_name VARCHAR(100),
  joined_at TIMESTAMPTZ NOT NULL,
  left_at TIMESTAMPTZ,
  duration_minutes INTEGER,  -- tính khi rời kênh
  xp_awarded INTEGER DEFAULT 0,
  afk_violations INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_voice_sessions_discord 
  ON discord_voice_sessions(discord_id, status);`,
            lang: "sql"
          }
        ]
      },
      {
        group: "🤖 Bot: Slash Command /lienket",
        items: [
          {
            name: "Cấu trúc thư mục bot",
            detail: "Tổ chức project bot",
            code: `discord-bot/
├── main.py                 # Entry point
├── config.py               # Env vars
├── requirements.txt
├── cogs/
│   ├── __init__.py
│   ├── account_linker.py   # Sprint 1: /lienket
│   ├── voice_tracker.py    # Sprint 2: XP sync
│   ├── notifications.py    # Sprint 3: Realtime
│   ├── arena_bridge.py     # Sprint 4: Arena
│   ├── teacher_commands.py # Sprint 4: GV tools
│   └── role_sync.py        # Sprint 5: Roles
├── services/
│   ├── supabase_client.py  # Supabase REST wrapper
│   ├── examhub_api.py      # Next.js API wrapper
│   └── xp_calculator.py   # Sprint 2
└── utils/
    ├── embeds.py           # Discord Embed builder
    └── token_generator.py  # Tạo token 8 ký tự`,
            lang: "bash"
          },
          {
            name: "Lệnh /lienket — flow xác thực 2 bước",
            detail: "Bot tạo token → user nhập trên web → web xác nhận",
            code: `# cogs/account_linker.py
import discord
from discord import app_commands
from discord.ext import commands
from services.supabase_client import SupabaseClient
from utils.token_generator import generate_token
import os

class AccountLinker(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.sb = SupabaseClient()

    @app_commands.command(
        name="lienket",
        description="Liên kết tài khoản Discord với ExamHub"
    )
    async def lienket(self, interaction: discord.Interaction):
        discord_id = str(interaction.user.id)
        
        # Kiểm tra đã link chưa
        existing = await self.sb.get_profile_by_discord(discord_id)
        if existing:
            embed = discord.Embed(
                title="✅ Đã liên kết rồi!",
                description=f"Tài khoản của bạn đã được liên kết với **{existing['full_name']}**",
                color=0x10B981
            )
            return await interaction.response.send_message(embed=embed, ephemeral=True)

        # Tạo token 8 ký tự
        token = generate_token()
        
        # Lưu token vào Supabase (expire 10 phút)
        await self.sb.create_link_token({
            "token": token,
            "discord_id": discord_id,
            "discord_username": str(interaction.user)
        })
        
        web_url = os.getenv("EXAMHUB_URL")
        embed = discord.Embed(
            title="🔗 Liên Kết Tài Khoản ExamHub",
            color=0x7C3AED
        )
        embed.add_field(
            name="Mã xác thực của bạn",
            value=f"```{token}```",
            inline=False
        )
        embed.add_field(
            name="Bước tiếp theo",
            value=f"1. Vào [ExamHub]({web_url}/settings/discord)\n"
                  f"2. Nhập mã **{token}**\n"
                  f"3. Nhấn **Xác nhận liên kết**",
            inline=False
        )
        embed.set_footer(text="⚠️ Mã hết hạn sau 10 phút")
        
        await interaction.response.send_message(embed=embed, ephemeral=True)

async def setup(bot):
    await bot.add_cog(AccountLinker(bot))`,
            lang: "python"
          },
          {
            name: "Next.js API: POST /api/discord/link-account",
            detail: "Web nhận token → xác thực → lưu discord_id",
            code: `// src/app/api/discord/link-account/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = createClient()
  const { token } = await req.json()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Tìm token hợp lệ
  const { data: linkToken } = await supabase
    .from('discord_link_tokens')
    .select('*')
    .eq('token', token.toUpperCase())
    .eq('used', false)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (!linkToken) {
    return NextResponse.json({ error: 'Token không hợp lệ hoặc đã hết hạn' }, { status: 400 })
  }

  // Cập nhật profile với discord_id
  const { error } = await supabase
    .from('profiles')
    .update({
      discord_id: linkToken.discord_id,
      discord_username: linkToken.discord_username,
      discord_linked_at: new Date().toISOString()
    })
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Đánh dấu token đã dùng
  await supabase
    .from('discord_link_tokens')
    .update({ used: true })
    .eq('id', linkToken.id)

  return NextResponse.json({ success: true, discord_id: linkToken.discord_id })
}`,
            lang: "typescript"
          }
        ]
      },
      {
        group: "✅ Acceptance Criteria",
        items: [
          {
            name: "Checklist Sprint 1",
            detail: "",
            code: `✅ Migration chạy thành công, cột discord_id tồn tại
✅ /lienket trả về embed + token trong DM (ephemeral)
✅ Token expire sau đúng 10 phút
✅ Web /settings/discord hiển thị form nhập token
✅ Sau khi nhập token hợp lệ → profiles.discord_id được cập nhật
✅ /lienket lần 2 → thông báo "đã liên kết rồi"
✅ Token đã dùng không thể dùng lại`,
            lang: "bash"
          }
        ]
      }
    ]
  },
  {
    id: 2,
    title: "XP Engine",
    subtitle: "Voice Time → XP + Check-in",
    days: "3 ngày",
    color: "#059669",
    bgLight: "#D1FAE5",
    border: "#34D399",
    icon: "⭐",
    goal: "Biến thời gian học thật trên Discord Voice thành XP trên ExamHub. Học sinh càng học nhiều → rank càng cao → vừa chống AFK vừa tạo động lực thực sự.",
    tasks: [
      {
        group: "⏱️ Voice Time Tracker",
        items: [
          {
            name: "Module theo dõi voice session real-time",
            detail: "Track join/leave + tính XP",
            code: `# cogs/voice_tracker.py
import discord
from discord.ext import commands, tasks
from datetime import datetime, timezone
from services.supabase_client import SupabaseClient
from services.xp_calculator import XPCalculator
import asyncio

# Config
XP_PER_MINUTE = 2          # 1 phút học = 2 XP
SYNC_INTERVAL_MINUTES = 5  # Sync XP lên web mỗi 5 phút
AFK_THRESHOLD_MINUTES = 30 # Sút AFK sau 30 phút mute
STUDY_CHANNEL_PREFIX = "📚" # Kênh học phải có prefix này

class VoiceTracker(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.sb = SupabaseClient()
        self.xp_calc = XPCalculator()
        # {discord_id: {"joined": datetime, "mute_since": datetime|None}}
        self.active_sessions: dict = {}
        self.sync_xp_loop.start()

    def is_study_channel(self, channel: discord.VoiceChannel) -> bool:
        return channel.name.startswith(STUDY_CHANNEL_PREFIX)

    @commands.Cog.listener()
    async def on_voice_state_update(self, member, before, after):
        discord_id = str(member.id)

        # === JOINED study channel ===
        if after.channel and self.is_study_channel(after.channel):
            if discord_id not in self.active_sessions:
                self.active_sessions[discord_id] = {
                    "joined": datetime.now(timezone.utc),
                    "channel": after.channel.name,
                    "channel_id": str(after.channel.id),
                    "mute_since": datetime.now(timezone.utc) if after.self_mute else None,
                    "afk_violations": 0,
                    "xp_banked": 0,
                }
                # Log session start vào DB
                await self.sb.start_voice_session(discord_id, after.channel)

        # === LEFT study channel ===
        elif before.channel and self.is_study_channel(before.channel):
            if discord_id in self.active_sessions:
                session = self.active_sessions.pop(discord_id)
                await self._finalize_session(member, session)

        # === MIC STATE CHANGED (trong study channel) ===
        if (after.channel and self.is_study_channel(after.channel)
                and discord_id in self.active_sessions):
            session = self.active_sessions[discord_id]
            if after.self_mute and session["mute_since"] is None:
                session["mute_since"] = datetime.now(timezone.utc)
            elif not after.self_mute:
                session["mute_since"] = None

    async def _finalize_session(self, member, session):
        """Tính toán và award XP khi session kết thúc"""
        duration = (datetime.now(timezone.utc) - session["joined"]).seconds // 60
        xp = self.xp_calc.calculate(duration, session["afk_violations"])
        
        # Cộng XP tích lũy trong session
        xp += session.get("xp_banked", 0)
        
        if xp > 0:
            profile = await self.sb.get_profile_by_discord(str(member.id))
            if profile:
                await self.sb.add_xp(profile["id"], xp)
        
        # Cập nhật session record trong DB
        await self.sb.end_voice_session(str(member.id), duration, xp)

    @tasks.loop(minutes=SYNC_INTERVAL_MINUTES)
    async def sync_xp_loop(self):
        """Mỗi 5 phút: tính XP tạm → cộng vào web, chặn AFK"""
        now = datetime.now(timezone.utc)
        to_remove = []
        
        for discord_id, session in self.active_sessions.items():
            mute_since = session.get("mute_since")
            if mute_since:
                mute_duration = (now - mute_since).seconds // 60
                # Cảnh báo lần 1 (10 phút)
                if mute_duration == 10:
                    await self._warn_mute(discord_id, "lần 1", remaining=20)
                # Cảnh báo lần 2 (20 phút)  
                elif mute_duration == 20:
                    await self._warn_mute(discord_id, "lần 2", remaining=10)
                # Sút AFK (30 phút)
                elif mute_duration >= 30:
                    await self._move_to_afk(discord_id, session)
                    session["afk_violations"] += 1
                    continue
            
            # Tính XP tạm (5 phút = 10 XP nếu không bị mute)
            if not mute_since:
                interim_xp = XP_PER_MINUTE * SYNC_INTERVAL_MINUTES
                session["xp_banked"] = session.get("xp_banked", 0) + interim_xp
                
                # Sync lên web mỗi 5 phút
                profile = await self.sb.get_profile_by_discord(discord_id)
                if profile:
                    await self.sb.add_xp(profile["id"], interim_xp)
                    session["xp_banked"] = 0  # Reset sau khi sync`,
            lang: "python"
          },
          {
            name: "XP Calculator Service",
            detail: "Công thức tính XP có penalty AFK",
            code: `# services/xp_calculator.py
class XPCalculator:
    XP_PER_MINUTE = 2
    AFK_PENALTY = 0.5  # Mỗi lần vi phạm giảm 50% XP
    MAX_SESSION_MINUTES = 180  # Tối đa 3 tiếng/session
    BONUS_THRESHOLDS = {
        60: 10,   # Học 1 tiếng: +10 XP bonus
        90: 20,   # Học 1.5 tiếng: +20 XP bonus  
        120: 40,  # Học 2 tiếng: +40 XP bonus
    }

    def calculate(self, duration_minutes: int, afk_violations: int) -> int:
        # Cap session time
        effective_minutes = min(duration_minutes, self.MAX_SESSION_MINUTES)
        
        # Base XP
        base_xp = effective_minutes * self.XP_PER_MINUTE
        
        # AFK penalty (compound)
        penalty_multiplier = (1 - self.AFK_PENALTY) ** afk_violations
        penalized_xp = int(base_xp * penalty_multiplier)
        
        # Bonus XP cho session dài
        bonus = 0
        for threshold, bonus_xp in self.BONUS_THRESHOLDS.items():
            if effective_minutes >= threshold:
                bonus = bonus_xp  # Lấy bonus cao nhất đạt được
        
        total = penalized_xp + bonus
        return max(0, total)

    def preview(self, duration_minutes: int, afk_violations: int) -> dict:
        """Trả về breakdown để hiển thị trong Discord embed"""
        xp = self.calculate(duration_minutes, afk_violations)
        return {
            "total_xp": xp,
            "duration": duration_minutes,
            "afk_violations": afk_violations,
            "penalty_applied": afk_violations > 0
        }`,
            lang: "python"
          }
        ]
      },
      {
        group: "📅 Daily Check-in Bridge",
        items: [
          {
            name: "Lệnh /diemdanh — trigger web check-in",
            detail: "Gọi ExamHub API từ Discord",
            code: `# Trong cogs/voice_tracker.py hoặc file riêng
@app_commands.command(
    name="diemdanh",
    description="Điểm danh hàng ngày để nhận bonus XP"
)
async def diemdanh(self, interaction: discord.Interaction):
    await interaction.response.defer(ephemeral=True)
    
    discord_id = str(interaction.user.id)
    profile = await self.sb.get_profile_by_discord(discord_id)
    
    if not profile:
        return await interaction.followup.send(
            "❌ Bạn chưa liên kết tài khoản! Dùng **/lienket** trước nhé.",
            ephemeral=True
        )
    
    # Gọi Next.js API /api/daily-checkin
    api = ExamHubAPI()
    result = await api.daily_checkin(profile["id"])
    
    if result.get("already_checked"):
        embed = discord.Embed(
            title="✅ Đã điểm danh rồi!",
            description=f"Bạn đã điểm danh hôm nay.\nStreak hiện tại: 🔥 **{result['streak']} ngày**",
            color=0xF59E0B
        )
    else:
        embed = discord.Embed(
            title="🎉 Điểm danh thành công!",
            color=0x10B981
        )
        embed.add_field(name="XP nhận được", value=f"**+{result['xp_earned']} XP**")
        embed.add_field(name="Streak", value=f"🔥 **{result['streak']} ngày**")
        embed.add_field(
            name="Cấp độ hiện tại",
            value=f"Level **{result['level']}** — {result['xp']}/{result['next_level_xp']} XP",
            inline=False
        )
    
    await interaction.followup.send(embed=embed, ephemeral=True)`,
            lang: "python"
          }
        ]
      },
      {
        group: "📊 Session Report — Báo Cáo Sau Buổi Học",
        items: [
          {
            name: "Lệnh /baocao — tổng kết buổi học",
            detail: "GV gọi để tổng kết, hoặc auto sau khi đóng kênh",
            code: `@app_commands.command(
    name="baocao",
    description="[GV] Xem báo cáo buổi học hôm nay"
)
@app_commands.checks.has_permissions(manage_channels=True)
async def baocao(self, interaction: discord.Interaction):
    await interaction.response.defer()
    
    today_sessions = await self.sb.get_today_sessions(
        guild_id=str(interaction.guild.id)
    )
    
    on_time = [s for s in today_sessions if s["afk_violations"] == 0]
    late = [s for s in today_sessions if s["joined_late"]]
    violators = [s for s in today_sessions if s["afk_violations"] > 0]
    avg_duration = sum(s["duration_minutes"] for s in today_sessions) / len(today_sessions) if today_sessions else 0
    
    embed = discord.Embed(
        title=f"📋 Báo Cáo Buổi Học — {datetime.now().strftime('%d/%m/%Y')}",
        color=0x6366F1
    )
    embed.add_field(name="✅ Học đầy đủ", value=str(len(on_time)), inline=True)
    embed.add_field(name="⚠️ Vi phạm AFK", value=str(len(violators)), inline=True)
    embed.add_field(name="⏱️ Thời gian TB", value=f"{avg_duration:.0f} phút", inline=True)
    
    if violators:
        violator_list = "\n".join(
            f"• <@{v['discord_id']}> — {v['afk_violations']} lần vi phạm"
            for v in violators[:5]
        )
        embed.add_field(name="🚫 Danh sách vi phạm", value=violator_list, inline=False)
    
    await interaction.followup.send(embed=embed)`,
            lang: "python"
          }
        ]
      },
      {
        group: "✅ Acceptance Criteria",
        items: [
          {
            name: "Checklist Sprint 2",
            detail: "",
            code: `✅ Vào kênh học (prefix 📚) → session được tạo trong DB
✅ Rời kênh → XP được cộng đúng công thức
✅ Mute 10 phút → nhận warning DM lần 1
✅ Mute 20 phút → nhận warning lần 2 (ping công khai)
✅ Mute 30 phút → bị move sang AFK channel
✅ /diemdanh → cộng XP trên web + hiển thị streak
✅ Dùng /diemdanh lần 2 trong ngày → báo đã điểm danh
✅ XP trên Discord Voice khớp với XP trên web ExamHub
✅ /baocao → hiển thị đúng thống kê buổi học`,
            lang: "bash"
          }
        ]
      }
    ]
  },
  {
    id: 3,
    title: "Realtime Bridge",
    subtitle: "Supabase → Discord Notifications",
    days: "3 ngày",
    color: "#DC2626",
    bgLight: "#FEE2E2",
    border: "#FCA5A5",
    icon: "📡",
    goal: "Mọi sự kiện quan trọng trên web (đề mới, arena, live class) phải tự động xuất hiện trên Discord mà GV không cần làm gì thêm. Đây là trục thông báo trung tâm.",
    tasks: [
      {
        group: "🔌 Supabase Realtime Subscriber",
        items: [
          {
            name: "Kết nối Supabase Realtime từ bot",
            detail: "Subscribe 3 tables: exams, arena_sessions, notifications",
            code: `# cogs/notifications.py
import discord
from discord.ext import commands
from supabase import create_client, Client
from datetime import datetime
import asyncio, os

class NotificationBridge(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.sb: Client = create_client(
            os.getenv("SUPABASE_URL"),
            os.getenv("SUPABASE_SERVICE_ROLE_KEY")  # Dùng service role để bypass RLS
        )
        self.ANNOUNCE_CHANNEL_ID = int(os.getenv("ANNOUNCE_CHANNEL_ID"))
        self.ARENA_CHANNEL_ID = int(os.getenv("ARENA_CHANNEL_ID"))
        self.LIVE_CHANNEL_ID = int(os.getenv("LIVE_CHANNEL_ID"))

    @commands.Cog.listener()
    async def on_ready(self):
        # Subscribe sau khi bot sẵn sàng
        await self._subscribe_all()

    async def _subscribe_all(self):
        """Subscribe vào 3 channels Realtime"""
        
        # 1. Exam mới được tạo (status = published)
        self.sb.realtime.channel("exams-published") \\
            .on("postgres_changes",
                event="UPDATE",
                schema="public",
                table="exams",
                filter="status=eq.published",
                callback=self._on_exam_published
            ).subscribe()

        # 2. Arena session mới
        self.sb.realtime.channel("arena-new") \\
            .on("postgres_changes",
                event="INSERT",
                schema="public",
                table="arena_sessions",
                callback=self._on_arena_created
            ).subscribe()

        # 3. Notification từ GV (type = discord_broadcast)
        self.sb.realtime.channel("notifications-broadcast") \\
            .on("postgres_changes",
                event="INSERT",
                schema="public",
                table="notifications",
                filter="type=eq.discord_broadcast",
                callback=self._on_broadcast_notification
            ).subscribe()`,
            lang: "python"
          },
          {
            name: "Handlers cho từng loại event",
            detail: "Exam published, Arena created, Live started",
            code: `    async def _on_exam_published(self, payload):
        """Đề thi mới → Announce channel"""
        exam = payload["new"]
        channel = self.bot.get_channel(self.ANNOUNCE_CHANNEL_ID)
        if not channel:
            return
            
        embed = discord.Embed(
            title="📝 Đề Thi Mới Vừa Được Mở!",
            description=f"**{exam['title']}**",
            color=0x6366F1,
            url=f"{os.getenv('EXAMHUB_URL')}/student/exams/{exam['id']}"
        )
        embed.add_field(name="📚 Môn học", value=exam.get("subject", "Chung"), inline=True)
        embed.add_field(name="⏱️ Thời gian", value=f"{exam['duration']} phút", inline=True)
        embed.add_field(name="❓ Số câu", value=f"{exam['total_questions']} câu", inline=True)
        
        if exam.get("is_scheduled"):
            embed.add_field(
                name="🕐 Bắt đầu lúc",
                value=f"<t:{int(datetime.fromisoformat(exam['start_time']).timestamp())}:F>",
                inline=False
            )
        
        embed.set_footer(text="Click vào tiêu đề để vào làm bài")
        
        # Tag @everyone hoặc role học sinh
        student_role_id = os.getenv("STUDENT_ROLE_ID")
        mention = f"<@&{student_role_id}>" if student_role_id else "@everyone"
        await channel.send(content=mention, embed=embed)

    async def _on_arena_created(self, payload):
        """Arena session mới → Arena channel"""
        session = payload["new"]
        channel = self.bot.get_channel(self.ARENA_CHANNEL_ID)
        if not channel:
            return
        
        embed = discord.Embed(
            title="⚔️ Đấu Trường Đang Mở!",
            description="Một phòng thi đấu mới vừa được tạo. Tham gia ngay!",
            color=0xEF4444,
            url=f"{os.getenv('EXAMHUB_URL')}/arena/{session['id']}"
        )
        embed.add_field(
            name="🚪 Tham gia",
            value=f"[Click vào đây để vào phòng]({os.getenv('EXAMHUB_URL')}/arena/{session['id']})"
        )
        embed.set_footer(text="⚡ Phòng đấu có thể đóng bất cứ lúc nào!")
        await channel.send(content="@everyone", embed=embed)

    async def _on_broadcast_notification(self, payload):
        """GV gửi thông báo từ web → relay sang Discord"""
        notif = payload["new"]
        channel = self.bot.get_channel(self.ANNOUNCE_CHANNEL_ID)
        if not channel:
            return
        
        embed = discord.Embed(
            title=f"📢 {notif['title']}",
            description=notif["message"],
            color=0xF59E0B
        )
        await channel.send(embed=embed)`,
            lang: "python"
          }
        ]
      },
      {
        group: "🌐 Next.js: Webhook Endpoint cho Bot",
        items: [
          {
            name: "API route nhận webhook từ bot",
            detail: "Bot gọi web API để đồng bộ ngược lại",
            code: `// src/app/api/discord/webhook/route.ts
// Dùng khi bot cần gửi data LÊN web (thay vì dùng Supabase trực tiếp)
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

// Xác thực request từ bot bằng HMAC signature
function verifyBotSignature(body: string, signature: string): boolean {
  const expected = crypto
    .createHmac('sha256', process.env.BOT_WEBHOOK_SECRET!)
    .update(body)
    .digest('hex')
  return crypto.timingSafeEqual(
    Buffer.from(signature), 
    Buffer.from(expected)
  )
}

export async function POST(req: Request) {
  const body = await req.text()
  const signature = req.headers.get('X-Bot-Signature') ?? ''
  
  if (!verifyBotSignature(body, signature)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const { event, data } = JSON.parse(body)
  const supabase = createClient()
  
  switch (event) {
    case 'voice_session_end':
      // Bot báo session kết thúc → web cập nhật thống kê học sinh
      await supabase.from('discord_voice_sessions').update({
        left_at: new Date().toISOString(),
        duration_minutes: data.duration_minutes,
        xp_awarded: data.xp_awarded,
        status: 'completed'
      }).eq('discord_id', data.discord_id).eq('status', 'active')
      break
      
    case 'afk_violation':
      // Bot báo có học sinh bị AFK → log để GV xem
      await supabase.from('notifications').insert({
        user_id: data.teacher_id,
        title: 'Vi phạm AFK',
        message: \`\${data.student_name} bị chuyển sang kênh AFK (vi phạm lần \${data.count})\`,
        type: 'afk_alert'
      })
      break
  }
  
  return NextResponse.json({ success: true })
}`,
            lang: "typescript"
          }
        ]
      },
      {
        group: "✅ Acceptance Criteria",
        items: [
          {
            name: "Checklist Sprint 3",
            detail: "",
            code: `✅ GV publish đề thi → trong 5 giây xuất hiện embed trên Discord
✅ Đề có lịch thi → embed hiển thị đúng thời gian bắt đầu
✅ Arena mới tạo → Discord alert ngay lập tức có link vào phòng
✅ GV gửi thông báo từ web dashboard → xuất hiện trên Discord channel
✅ AFK violation → bot gửi alert về web → GV thấy trong dashboard
✅ Không có event nào bị mất khi bot restart (graceful reconnect)`,
            lang: "bash"
          }
        ]
      }
    ]
  },
  {
    id: 4,
    title: "Command Center",
    subtitle: "Arena Bridge + Teacher Commands",
    days: "4 ngày",
    color: "#D97706",
    bgLight: "#FEF3C7",
    border: "#FCD34D",
    icon: "🎮",
    goal: "Giáo viên có thể quản lý toàn bộ ExamHub ngay từ Discord mà không cần mở trình duyệt. Học sinh có thể xem XP, rank, danh sách đề thi từ Discord.",
    tasks: [
      {
        group: "⚔️ Arena Bridge — Tạo Phòng Đấu Từ Discord",
        items: [
          {
            name: "Lệnh /arena — GV tạo phòng từ Discord",
            detail: "Tạo arena_session trên web + thông báo học sinh",
            code: `# cogs/arena_bridge.py
@app_commands.command(
    name="arena",
    description="[GV] Tạo phòng đấu trường cho học sinh"
)
@app_commands.describe(
    ten_de="Tên đề thi (tìm kiếm theo keyword)",
    tag_lop="Tag role lớp học (để ping, bỏ trống = @everyone)"
)
@app_commands.checks.has_permissions(manage_channels=True)
async def arena(
    self, 
    interaction: discord.Interaction,
    ten_de: str,
    tag_lop: discord.Role = None
):
    await interaction.response.defer()
    
    # Tìm đề thi trên Supabase
    exams = await self.sb.search_exams(ten_de, limit=5)
    if not exams:
        return await interaction.followup.send(
            f"❌ Không tìm thấy đề thi nào với từ khóa **{ten_de}**"
        )
    
    if len(exams) == 1:
        exam = exams[0]
    else:
        # Hiển thị select menu để GV chọn đề
        view = ExamSelectView(exams)
        await interaction.followup.send(
            "📝 Tìm thấy nhiều đề, chọn đề muốn dùng:", 
            view=view
        )
        await view.wait()
        exam = view.selected_exam
        if not exam:
            return
    
    # Lấy discord_id của GV để tìm profile
    teacher = await self.sb.get_profile_by_discord(str(interaction.user.id))
    if not teacher:
        return await interaction.followup.send("❌ Bạn chưa liên kết tài khoản!")
    
    # Tạo arena session qua Next.js API
    api = ExamHubAPI()
    session = await api.create_arena_session(
        exam_id=exam["id"],
        host_id=teacher["id"]
    )
    
    session_url = f"{os.getenv('EXAMHUB_URL')}/arena/{session['id']}"
    
    # Announce
    mention = tag_lop.mention if tag_lop else "@everyone"
    embed = discord.Embed(
        title="⚔️ ĐẤUTRƯỜNG ĐÃ MỞ!",
        description=f"**{exam['title']}**\nGiáo viên **{teacher['full_name']}** vừa mở một phòng thi đấu!",
        color=0xEF4444,
        url=session_url
    )
    embed.add_field(name="🎯 Tham gia", value=f"[Vào phòng ngay!]({session_url})")
    embed.add_field(name="❓ Số câu", value=str(exam["total_questions"]))
    embed.add_field(name="⏱️ Thời gian", value=f"{exam['duration']} phút")
    embed.set_footer(text="⚡ Thi đấu realtime — ai làm nhanh đúng nhiều nhất thắng!")
    
    await interaction.followup.send(content=mention, embed=embed)`,
            lang: "python"
          }
        ]
      },
      {
        group: "📊 Teacher Dashboard Commands",
        items: [
          {
            name: "/thongke — Thống kê lớp học",
            detail: "Pull data từ Supabase submissions",
            code: `@app_commands.command(
    name="thongke",
    description="[GV] Xem thống kê lớp học"
)
@app_commands.describe(ten_de="Tên đề thi (bỏ trống = tất cả)")
async def thongke(self, interaction: discord.Interaction, ten_de: str = None):
    await interaction.response.defer(ephemeral=True)
    
    stats = await self.sb.get_class_stats(
        guild_id=str(interaction.guild.id),
        exam_keyword=ten_de
    )
    
    embed = discord.Embed(title="📊 Thống Kê Lớp Học", color=0x6366F1)
    embed.add_field(name="📝 Tổng bài nộp", value=str(stats["total_submissions"]), inline=True)
    embed.add_field(name="🎯 Điểm trung bình", value=f"{stats['avg_score']:.1f}/10", inline=True)
    embed.add_field(name="✅ Tỉ lệ hoàn thành", value=f"{stats['completion_rate']}%", inline=True)
    embed.add_field(name="🏆 Điểm cao nhất", value=f"{stats['max_score']}/10 ({stats['top_student']})", inline=False)
    embed.add_field(name="📉 Điểm thấp nhất", value=f"{stats['min_score']}/10", inline=True)
    embed.add_field(name="⏱️ Thời gian TB", value=f"{stats['avg_time']} phút", inline=True)
    
    await interaction.followup.send(embed=embed, ephemeral=True)

@app_commands.command(name="xeploai", description="Xem bảng xếp hạng XP toàn server")
async def xeploai(self, interaction: discord.Interaction):
    await interaction.response.defer()
    
    # Query top 10 từ Supabase theo XP
    top10 = await self.sb.get_leaderboard(guild_id=str(interaction.guild.id), limit=10)
    
    embed = discord.Embed(title="🏆 Bảng Xếp Hạng XP", color=0xF59E0B)
    medals = ["🥇", "🥈", "🥉"] + ["🏅"] * 7
    
    lines = []
    for i, student in enumerate(top10):
        lines.append(
            f"{medals[i]} **{i+1}.** {student['full_name']} "
            f"— Level **{student['level']}** · **{student['xp']:,}** XP"
        )
    
    embed.description = "\n".join(lines)
    await interaction.followup.send(embed=embed)

@app_commands.command(name="thongbao", description="[GV] Gửi thông báo đến tất cả học sinh")
async def thongbao(self, interaction: discord.Interaction, tieu_de: str, noi_dung: str):
    await interaction.response.defer(ephemeral=True)
    
    # Gửi thông báo lên web (vào bảng notifications cho TẤT CẢ học sinh)
    api = ExamHubAPI()
    await api.broadcast_notification(title=tieu_de, message=noi_dung)
    
    # Đồng thời post vào Discord announce channel
    channel = self.bot.get_channel(int(os.getenv("ANNOUNCE_CHANNEL_ID")))
    embed = discord.Embed(title=f"📢 {tieu_de}", description=noi_dung, color=0xF59E0B)
    embed.set_footer(text=f"Từ: {interaction.user.display_name}")
    await channel.send(embed=embed)
    
    await interaction.followup.send("✅ Đã gửi thông báo!", ephemeral=True)`,
            lang: "python"
          },
          {
            name: "/hocsinh — Xem profile chi tiết 1 học sinh",
            detail: "Pull từ profiles + submissions + voice_sessions",
            code: `@app_commands.command(
    name="hocsinh",
    description="Xem thông tin chi tiết một học sinh"
)
@app_commands.describe(thanh_vien="Tag học sinh muốn xem")
async def hocsinh(self, interaction: discord.Interaction, thanh_vien: discord.Member):
    await interaction.response.defer(ephemeral=True)
    
    profile = await self.sb.get_profile_by_discord(str(thanh_vien.id))
    if not profile:
        return await interaction.followup.send(
            f"❌ {thanh_vien.mention} chưa liên kết tài khoản ExamHub.", 
            ephemeral=True
        )
    
    stats = await self.sb.get_student_full_stats(profile["id"])
    
    embed = discord.Embed(
        title=f"👤 {profile['full_name']}",
        color=0x6366F1
    )
    embed.set_thumbnail(url=thanh_vien.display_avatar.url)
    embed.add_field(name="⭐ XP", value=f"**{profile['xp']:,}**", inline=True)
    embed.add_field(name="📈 Level", value=f"**{profile['level']}**", inline=True)
    embed.add_field(name="🔥 Streak", value=f"**{stats['streak']} ngày**", inline=True)
    embed.add_field(name="📝 Đề đã làm", value=str(stats["total_exams"]), inline=True)
    embed.add_field(name="🎯 Điểm TB", value=f"{stats['avg_score']:.1f}/10", inline=True)
    embed.add_field(name="⏱️ Học Discord", value=f"{stats['total_voice_hours']:.1f}h", inline=True)
    embed.add_field(name="⚠️ AFK Violations", value=str(stats["total_afk_violations"]), inline=True)
    embed.add_field(name="🏅 Huy hiệu", value=str(stats["achievement_count"]), inline=True)
    
    examhub_url = os.getenv("EXAMHUB_URL")
    embed.add_field(
        name="🔗 Xem đầy đủ",
        value=f"[Trang cá nhân]({examhub_url}/student/profile/{profile['id']})",
        inline=False
    )
    await interaction.followup.send(embed=embed, ephemeral=True)`,
            lang: "python"
          }
        ]
      },
      {
        group: "🎓 Student Commands",
        items: [
          {
            name: "/thi và /xp — Học sinh tự tra cứu",
            detail: "Học sinh dùng trên Discord để xem thông tin",
            code: `@app_commands.command(name="thi", description="Xem danh sách đề thi đang mở")
async def thi(self, interaction: discord.Interaction):
    await interaction.response.defer(ephemeral=True)
    
    exams = await self.sb.get_open_exams(limit=5)
    
    if not exams:
        return await interaction.followup.send(
            "📭 Hiện chưa có đề thi nào đang mở.", ephemeral=True
        )
    
    embed = discord.Embed(title="📚 Đề Thi Đang Mở", color=0x6366F1)
    examhub_url = os.getenv("EXAMHUB_URL")
    
    for exam in exams:
        embed.add_field(
            name=f"📝 {exam['title']}",
            value=(
                f"Môn: **{exam['subject']}** · {exam['total_questions']} câu · {exam['duration']}p\n"
                f"[→ Vào làm bài]({examhub_url}/student/exams/{exam['id']})"
            ),
            inline=False
        )
    
    await interaction.followup.send(embed=embed, ephemeral=True)

@app_commands.command(name="xp", description="Xem XP và cấp độ hiện tại của bạn")
async def xp(self, interaction: discord.Interaction):
    await interaction.response.defer(ephemeral=True)
    
    discord_id = str(interaction.user.id)
    profile = await self.sb.get_profile_by_discord(discord_id)
    
    if not profile:
        return await interaction.followup.send(
            "❌ Bạn chưa liên kết tài khoản! Dùng **/lienket** nhé.", ephemeral=True
        )
    
    # Tính % progress tới level tiếp theo
    from services.xp_calculator import XPCalculator
    calc = XPCalculator()
    progress = calc.level_progress(profile["xp"], profile["level"])
    
    bar_filled = int(progress["percent"] / 10)
    bar = "█" * bar_filled + "░" * (10 - bar_filled)
    
    embed = discord.Embed(
        title=f"⭐ {profile['full_name']} — Level {profile['level']}",
        color=0xF59E0B
    )
    embed.add_field(name="XP hiện tại", value=f"**{profile['xp']:,} XP**", inline=True)
    embed.add_field(name="Cần thêm", value=f"**{progress['needed']:,} XP**", inline=True)
    embed.add_field(
        name=f"Tiến độ lên Level {profile['level'] + 1}",
        value=f"`{bar}` {progress['percent']:.0f}%",
        inline=False
    )
    
    await interaction.followup.send(embed=embed, ephemeral=True)`,
            lang: "python"
          }
        ]
      },
      {
        group: "✅ Acceptance Criteria",
        items: [
          {
            name: "Checklist Sprint 4",
            detail: "",
            code: `✅ /arena "Toán Giải Tích" → tạo arena_session trên Supabase → announce
✅ /arena với nhiều kết quả → hiển thị select menu
✅ /thongke → hiển thị đúng số liệu từ bảng submissions
✅ /xeploai → top 10 XP từ profiles, đúng thứ tự
✅ /thongbao → xuất hiện trên web notifications VÀ Discord channel
✅ /hocsinh @user → hiển thị đầy đủ stats + link profile web
✅ /thi → danh sách đề đang mở, link đúng
✅ /xp → thanh tiến độ đúng, XP đồng bộ với web
✅ Chỉ GV (manage_channels) mới dùng được /arena, /thongke, /thongbao`,
            lang: "bash"
          }
        ]
      }
    ]
  },
  {
    id: 5,
    title: "Polish",
    subtitle: "Role Sync + Live Announcer",
    days: "2 ngày",
    color: "#0284C7",
    bgLight: "#E0F2FE",
    border: "#7DD3FC",
    icon: "✨",
    goal: "Hoàn thiện hệ thống: Discord Role tự động phản ánh Level trên web, YouTube Live được announce tự động, và toàn bộ bot được tối ưu hóa.",
    tasks: [
      {
        group: "🎖️ Role Sync — Level Web → Discord Role",
        items: [
          {
            name: "Config mapping Level → Discord Role",
            detail: "Trong .env hoặc config.py",
            code: `# config.py — Mapping Level ExamHub → Discord Role ID
LEVEL_ROLE_MAP = {
    1:  os.getenv("ROLE_LEVEL_1"),    # Beginner
    5:  os.getenv("ROLE_LEVEL_5"),    # Scholar  
    10: os.getenv("ROLE_LEVEL_10"),   # Expert
    15: os.getenv("ROLE_LEVEL_15"),   # Master
    20: os.getenv("ROLE_LEVEL_20"),   # Legend
}

# .env
ROLE_LEVEL_1=123456789
ROLE_LEVEL_5=234567890
ROLE_LEVEL_10=345678901
ROLE_LEVEL_15=456789012
ROLE_LEVEL_20=567890123

STUDENT_ROLE_ID=111222333  # Role "Học Sinh" cơ bản
TEACHER_ROLE_ID=444555666  # Role "Giáo Viên"`,
            lang: "python"
          },
          {
            name: "Cog Role Sync — Subscribe Supabase Realtime",
            detail: "Khi XP update trên web → bot tự cập nhật Role Discord",
            code: `# cogs/role_sync.py
class RoleSync(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.sb = SupabaseClient()

    @commands.Cog.listener()
    async def on_ready(self):
        # Subscribe vào profiles table, watch cột level
        self.sb.realtime.channel("profiles-level-up") \\
            .on("postgres_changes",
                event="UPDATE",
                schema="public",
                table="profiles",
                callback=self._on_level_change
            ).subscribe()

    async def _on_level_change(self, payload):
        old_level = payload["old"].get("level", 0)
        new_level = payload["new"].get("level", 0)
        discord_id = payload["new"].get("discord_id")
        
        # Chỉ xử lý khi level tăng và có discord_id
        if new_level <= old_level or not discord_id:
            return
        
        await self._sync_roles(discord_id, new_level, payload["new"]["full_name"])

    async def _sync_roles(self, discord_id: str, level: int, name: str):
        from config import LEVEL_ROLE_MAP
        
        for guild in self.bot.guilds:
            member = guild.get_member(int(discord_id))
            if not member:
                continue
            
            # Xác định role mới dựa trên level
            new_role_id = None
            for lvl_threshold, role_id in sorted(LEVEL_ROLE_MAP.items(), reverse=True):
                if level >= lvl_threshold and role_id:
                    new_role_id = int(role_id)
                    break
            
            if not new_role_id:
                continue
            
            new_role = guild.get_role(new_role_id)
            if not new_role:
                continue
            
            # Xóa tất cả level roles cũ
            old_level_roles = [
                guild.get_role(int(rid)) 
                for rid in LEVEL_ROLE_MAP.values() 
                if rid and guild.get_role(int(rid))
            ]
            await member.remove_roles(*[r for r in old_level_roles if r in member.roles])
            
            # Gán role mới
            await member.add_roles(new_role)
            
            # Chúc mừng lên level
            announce_ch = guild.get_channel(int(os.getenv("ANNOUNCE_CHANNEL_ID")))
            if announce_ch:
                embed = discord.Embed(
                    title="🎉 LÊN LEVEL!",
                    description=f"**{name}** vừa đạt **Level {level}** trên ExamHub!\nRank mới: **{new_role.name}** 🏆",
                    color=0xF59E0B
                )
                await announce_ch.send(embed=embed)

    @app_commands.command(
        name="syncroles", 
        description="[Admin] Đồng bộ lại toàn bộ roles cho server"
    )
    @app_commands.checks.has_permissions(administrator=True)
    async def syncroles(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True)
        
        # Lấy tất cả profiles có discord_id
        profiles = await self.sb.get_all_linked_profiles()
        count = 0
        
        for profile in profiles:
            if profile.get("discord_id") and profile.get("level"):
                await self._sync_roles(
                    profile["discord_id"], 
                    profile["level"],
                    profile["full_name"]
                )
                count += 1
        
        await interaction.followup.send(
            f"✅ Đã đồng bộ roles cho **{count}** học sinh!", ephemeral=True
        )`,
            lang: "python"
          }
        ]
      },
      {
        group: "📺 YouTube Live Announcer",
        items: [
          {
            name: "Auto-check lịch live và announce",
            detail: "Kiểm tra mỗi 5 phút, announce khi live bắt đầu",
            code: `# cogs/role_sync.py (thêm vào hoặc file riêng)
from discord.ext import tasks
import aiohttp

class LiveAnnouncer(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.sb = SupabaseClient()
        self.announced_live_ids = set()  # Tránh announce trùng
        self.check_live_loop.start()

    @tasks.loop(minutes=5)
    async def check_live_loop(self):
        """Kiểm tra Supabase xem có live nào đang bắt đầu không"""
        # Query các youtube_live sessions scheduled trong 10 phút tới
        upcoming = await self.sb.get_upcoming_live_sessions(minutes_ahead=10)
        
        for live in upcoming:
            if live["id"] in self.announced_live_ids:
                continue
            
            channel = self.bot.get_channel(int(os.getenv("LIVE_CHANNEL_ID")))
            if not channel:
                continue
            
            youtube_url = f"https://youtube.com/watch?v={live['youtube_id']}"
            
            embed = discord.Embed(
                title="📺 LIVE CLASS SẮP BẮT ĐẦU!",
                description=f"**{live['title']}**\nGiáo viên: **{live['teacher_name']}**",
                color=0xEF4444,
                url=youtube_url
            )
            embed.add_field(
                name="🕐 Bắt đầu lúc",
                value=f"<t:{int(datetime.fromisoformat(live['start_time']).timestamp())}:R>"
            )
            embed.add_field(name="🔴 Xem trực tiếp", value=f"[YouTube Live]({youtube_url})")
            embed.set_thumbnail(url=f"https://img.youtube.com/vi/{live['youtube_id']}/maxresdefault.jpg")
            
            student_role_id = os.getenv("STUDENT_ROLE_ID")
            mention = f"<@&{student_role_id}>" if student_role_id else "@everyone"
            
            await channel.send(content=mention, embed=embed)
            self.announced_live_ids.add(live["id"])`,
            lang: "python"
          }
        ]
      },
      {
        group: "🔧 Cleanup & Production Config",
        items: [
          {
            name: "main.py — Entry point hoàn chỉnh",
            detail: "Load tất cả cogs, error handling, logging",
            code: `# main.py
import discord
from discord.ext import commands
import asyncio, logging, os
from dotenv import load_dotenv

load_dotenv()
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s'
)

COGS = [
    "cogs.account_linker",   # Sprint 1
    "cogs.voice_tracker",    # Sprint 2
    "cogs.notifications",    # Sprint 3
    "cogs.arena_bridge",     # Sprint 4
    "cogs.teacher_commands", # Sprint 4
    "cogs.role_sync",        # Sprint 5
]

class ExamHubBot(commands.Bot):
    def __init__(self):
        intents = discord.Intents.default()
        intents.members = True
        intents.voice_states = True
        intents.message_content = True
        super().__init__(command_prefix="!", intents=intents)

    async def setup_hook(self):
        for cog in COGS:
            try:
                await self.load_extension(cog)
                logging.info(f"✅ Loaded: {cog}")
            except Exception as e:
                logging.error(f"❌ Failed to load {cog}: {e}")
        
        # Sync slash commands
        guild_id = os.getenv("DISCORD_GUILD_ID")
        if guild_id:
            guild = discord.Object(id=int(guild_id))
            self.tree.copy_global_to(guild=guild)
            await self.tree.sync(guild=guild)
            logging.info("✅ Slash commands synced")

    async def on_ready(self):
        logging.info(f"🤖 Bot online: {self.user}")
        await self.change_presence(
            activity=discord.Activity(
                type=discord.ActivityType.watching,
                name="ExamHub 📚"
            )
        )

bot = ExamHubBot()

@bot.tree.error
async def on_app_command_error(interaction, error):
    if isinstance(error, discord.app_commands.errors.MissingPermissions):
        await interaction.response.send_message(
            "❌ Bạn không có quyền dùng lệnh này!", ephemeral=True
        )
    else:
        logging.error(f"Command error: {error}")

bot.run(os.getenv("DISCORD_BOT_TOKEN"))`,
            lang: "python"
          },
          {
            name: "requirements.txt",
            detail: "Dependencies đầy đủ",
            code: `py-cord==2.6.1         # Discord bot framework
supabase==2.4.0        # Supabase Python client
python-dotenv==1.0.0   # .env support
aiohttp==3.9.1         # Async HTTP cho Next.js API calls
asyncio==3.4.3         # Async support`,
            lang: "bash"
          }
        ]
      },
      {
        group: "✅ Acceptance Criteria",
        items: [
          {
            name: "Checklist Sprint 5 + Final",
            detail: "",
            code: `✅ Level up trên web → Discord Role thay đổi tự động < 10s
✅ /syncroles → đồng bộ đúng toàn bộ server trong 1 lần
✅ Announce lên cấp kèm tên học sinh trong channel chung
✅ YouTube Live schedule trong DB → bot announce trước 10 phút
✅ Không announce trùng cùng một live session
✅ Bot restart không bị announce lại các event cũ

--- FINAL SYSTEM CHECK ---
✅ Tất cả 5 sprints hoạt động đồng thời không conflict
✅ Bot xử lý 50+ học sinh cùng lúc không lag
✅ Graceful reconnect khi mất kết nối Supabase Realtime
✅ Tất cả secret nằm trong .env, không hardcode
✅ Log đầy đủ để debug production issues`,
            lang: "bash"
          }
        ]
      }
    ]
  }
];

const COLORS = {
  1: { tab: "#7C3AED", light: "#F5F3FF", badge: "#EDE9FE", text: "#5B21B6" },
  2: { tab: "#059669", light: "#F0FDF4", badge: "#D1FAE5", text: "#065F46" },
  3: { tab: "#DC2626", light: "#FFF5F5", badge: "#FEE2E2", text: "#991B1B" },
  4: { tab: "#D97706", light: "#FFFBEB", badge: "#FEF3C7", text: "#92400E" },
  5: { tab: "#0284C7", light: "#F0F9FF", badge: "#E0F2FE", text: "#075985" },
};

function CodeBlock({ code, lang }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div style={{ position: "relative", margin: "10px 0" }}>
      <button
        onClick={copy}
        style={{
          position: "absolute", top: 8, right: 8, zIndex: 2,
          background: copied ? "#10B981" : "#374151",
          color: "#fff", border: "none", borderRadius: 6,
          padding: "3px 10px", fontSize: 11, cursor: "pointer",
          transition: "background 0.2s"
        }}
      >{copied ? "✓ Copied" : "Copy"}</button>
      <div style={{
        background: "#0F172A",
        borderRadius: 10,
        padding: "14px 16px",
        overflowX: "auto",
        maxHeight: 340,
        overflowY: "auto",
        border: "1px solid #1E293B"
      }}>
        <pre style={{
          margin: 0, fontFamily: "monospace", fontSize: 12.5,
          color: "#E2E8F0", lineHeight: 1.7, whiteSpace: "pre"
        }}>{code}</pre>
      </div>
    </div>
  );
}

function TaskItem({ item }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginBottom: 8, border: "1px solid #E5E7EB", borderRadius: 10, overflow: "hidden" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", textAlign: "left",
          background: open ? "#F8FAFC" : "#fff",
          border: "none", padding: "12px 16px",
          cursor: "pointer", display: "flex",
          alignItems: "center", gap: 10,
          transition: "background 0.15s"
        }}
      >
        <span style={{ fontSize: 16 }}>{open ? "▼" : "▶"}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: "#111827" }}>{item.name}</div>
          {item.detail && <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>{item.detail}</div>}
        </div>
        <span style={{
          fontSize: 11, background: "#F3F4F6", color: "#374151",
          borderRadius: 5, padding: "2px 8px", fontFamily: "monospace"
        }}>{item.lang}</span>
      </button>
      {open && (
        <div style={{ padding: "0 16px 14px" }}>
          <CodeBlock code={item.code} lang={item.lang} />
        </div>
      )}
    </div>
  );
}

function TaskGroup({ group }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        fontSize: 13, fontWeight: 600, color: "#374151",
        padding: "6px 0 10px", borderBottom: "1px solid #E5E7EB",
        marginBottom: 10, letterSpacing: 0.3
      }}>{group.group}</div>
      {group.items.map((item, i) => <TaskItem key={i} item={item} />)}
    </div>
  );
}

export default function SprintPlan() {
  const [active, setActive] = useState(1);
  const sprint = SPRINTS.find(s => s.id === active);
  const color = COLORS[active];

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: 860, margin: "0 auto" }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)",
        borderRadius: 16, padding: "24px 28px", marginBottom: 20, color: "#fff"
      }}>
        <div style={{ fontSize: 13, color: "#A5B4FC", marginBottom: 6, letterSpacing: 1 }}>
          DISCORD BOT × EXAMHUB — SPRINT MASTER PLAN
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>
          🤖 Kế Hoạch Tích Hợp Toàn Diện
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {SPRINTS.map(s => (
            <div key={s.id} style={{
              background: "rgba(255,255,255,0.12)", borderRadius: 8,
              padding: "6px 14px", fontSize: 13
            }}>
              <span style={{ opacity: 0.7 }}>S{s.id} </span>
              <strong>{s.title}</strong>
              <span style={{ opacity: 0.6 }}> · {s.days}</span>
            </div>
          ))}
          <div style={{
            background: "rgba(255,255,255,0.2)", borderRadius: 8,
            padding: "6px 14px", fontSize: 13, fontWeight: 700
          }}>
            ⏱️ Tổng: ~14 ngày
          </div>
        </div>
      </div>

      {/* Sprint Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {SPRINTS.map(s => {
          const c = COLORS[s.id];
          const isActive = active === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setActive(s.id)}
              style={{
                padding: "10px 18px", borderRadius: 10, cursor: "pointer",
                border: `2px solid ${isActive ? c.tab : "#E5E7EB"}`,
                background: isActive ? c.tab : "#fff",
                color: isActive ? "#fff" : "#374151",
                fontWeight: isActive ? 700 : 400,
                fontSize: 13, transition: "all 0.18s",
                display: "flex", alignItems: "center", gap: 7
              }}
            >
              <span>{s.icon}</span>
              <span>Sprint {s.id}</span>
              <span style={{
                background: isActive ? "rgba(255,255,255,0.25)" : c.badge,
                color: isActive ? "#fff" : c.text,
                borderRadius: 5, padding: "1px 7px", fontSize: 11, fontWeight: 600
              }}>{s.days}</span>
            </button>
          );
        })}
      </div>

      {/* Sprint Content */}
      <div style={{
        background: "#fff", borderRadius: 14,
        border: `2px solid ${color.tab}22`,
        overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.06)"
      }}>
        {/* Sprint Header */}
        <div style={{
          background: color.light,
          borderBottom: `2px solid ${color.tab}22`,
          padding: "20px 24px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 8 }}>
            <div style={{
              background: color.tab, color: "#fff",
              width: 44, height: 44, borderRadius: 12,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22, fontWeight: 700, flexShrink: 0
            }}>{sprint.icon}</div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#111827" }}>
                Sprint {sprint.id}: {sprint.title}
              </div>
              <div style={{ fontSize: 13, color: "#6B7280" }}>
                {sprint.subtitle} · <strong style={{ color: color.tab }}>{sprint.days}</strong>
              </div>
            </div>
          </div>
          <div style={{
            background: `${color.tab}15`,
            border: `1px solid ${color.tab}30`,
            borderRadius: 8, padding: "10px 14px",
            fontSize: 13.5, color: color.text, lineHeight: 1.6
          }}>
            🎯 <strong>Mục tiêu:</strong> {sprint.goal}
          </div>
        </div>

        {/* Tasks */}
        <div style={{ padding: "20px 24px" }}>
          {sprint.tasks.map((group, i) => <TaskGroup key={i} group={group} />)}
        </div>
      </div>

      {/* Bottom nav */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16, gap: 10 }}>
        <button
          onClick={() => setActive(a => Math.max(1, a - 1))}
          disabled={active === 1}
          style={{
            padding: "10px 20px", borderRadius: 10, border: "1px solid #E5E7EB",
            background: active === 1 ? "#F9FAFB" : "#fff",
            color: active === 1 ? "#9CA3AF" : "#374151",
            cursor: active === 1 ? "default" : "pointer", fontSize: 14, fontWeight: 500
          }}
        >← Sprint trước</button>

        <div style={{ fontSize: 13, color: "#9CA3AF", display: "flex", alignItems: "center" }}>
          {active} / {SPRINTS.length}
        </div>

        <button
          onClick={() => setActive(a => Math.min(5, a + 1))}
          disabled={active === 5}
          style={{
            padding: "10px 20px", borderRadius: 10,
            border: `1px solid ${active === 5 ? "#E5E7EB" : COLORS[active].tab}`,
            background: active === 5 ? "#F9FAFB" : COLORS[active].tab,
            color: active === 5 ? "#9CA3AF" : "#fff",
            cursor: active === 5 ? "default" : "pointer", fontSize: 14, fontWeight: 500
          }}
        >Sprint tiếp →</button>
      </div>
    </div>
  );
}
