import { useState } from "react";

// ─── DATA ────────────────────────────────────────────────────────────────────

const PHASES = [
  {
    id: "A",
    title: "Power Admin",
    sub: "Bot thay thế hoàn toàn web dashboard",
    weeks: "2 tuần",
    color: "#7C3AED",
    dark: "#5B21B6",
    light: "#F5F3FF",
    badge: "#EDE9FE",
    icon: "⚡",
    summary: "Giáo viên & Admin có thể quản lý 100% ExamHub ngay từ Discord — tạo đề, quản lý học sinh, đặt lịch thông báo — không cần mở trình duyệt.",
    features: [
      {
        icon: "📝",
        name: "Exam Builder via Discord Modal",
        priority: "CRITICAL",
        cmds: ["/taode"],
        desc: "GV tạo đề thi hoàn toàn từ Discord qua multi-step Modal flow. Hỗ trợ nhiều loại câu hỏi, upload ảnh, preview trước khi publish.",
        tech: ["discord.py Modals", "Multi-step wizard", "Supabase REST", "File upload via attachment"],
        code: `# cogs/exam_builder.py — Multi-step Modal flow
class Step1Modal(discord.ui.Modal, title="Tạo Đề Thi — Bước 1/3: Thông Tin"):
    ten_de = discord.ui.TextInput(label="Tên đề thi", max_length=100)
    mon_hoc = discord.ui.TextInput(label="Môn học")
    thoi_gian = discord.ui.TextInput(label="Thời gian làm bài (phút)", placeholder="60")
    mo_ta = discord.ui.TextInput(label="Mô tả (tùy chọn)", required=False, style=discord.TextStyle.paragraph)

    async def on_submit(self, interaction: discord.Interaction):
        # Lưu vào session tạm (Redis hoặc dict in-memory)
        ExamSession.set(interaction.user.id, {
            "title": self.ten_de.value,
            "subject": self.mon_hoc.value,
            "duration": int(self.thoi_gian.value),
            "description": self.mo_ta.value,
            "questions": []
        })
        # Chuyển sang bước 2: chọn loại câu hỏi
        view = QuestionTypeView()
        await interaction.response.send_message(
            "✅ Bước 1 xong! Chọn cách thêm câu hỏi:", 
            view=view, ephemeral=True
        )

class AddQuestionModal(discord.ui.Modal, title="Thêm Câu Hỏi"):
    cau_hoi = discord.ui.TextInput(label="Nội dung câu hỏi", style=discord.TextStyle.paragraph)
    lua_chon = discord.ui.TextInput(
        label="Các đáp án (mỗi dòng 1 đáp án)", 
        style=discord.TextStyle.paragraph,
        placeholder="A. Đáp án 1\\nB. Đáp án 2\\nC. Đáp án 3\\nD. Đáp án 4"
    )
    dap_an = discord.ui.TextInput(label="Đáp án đúng (A/B/C/D)")
    diem = discord.ui.TextInput(label="Điểm (mặc định: 1)", default="1", required=False)

    async def on_submit(self, interaction: discord.Interaction):
        session = ExamSession.get(interaction.user.id)
        session["questions"].append({
            "content": self.cau_hoi.value,
            "options": self.lua_chon.value.split("\\n"),
            "correct_answer": self.dap_an.value.upper(),
            "points": int(self.diem.value or 1)
        })
        ExamSession.set(interaction.user.id, session)
        
        q_count = len(session["questions"])
        view = ContinueOrPublishView(q_count)
        await interaction.response.send_message(
            f"✅ Đã thêm câu {q_count}! Tiếp tục hay publish?",
            view=view, ephemeral=True
        )

# Bước 3: Preview + Publish
async def publish_exam(interaction, session):
    api = ExamHubAPI()
    exam = await api.create_exam(session)
    
    embed = discord.Embed(title="🎉 Đề Thi Đã Được Tạo!", color=0x10B981)
    embed.add_field(name="📝 Tên đề", value=session["title"])
    embed.add_field(name="❓ Số câu", value=str(len(session["questions"])))
    embed.add_field(name="⏱️ Thời gian", value=f"{session['duration']} phút")
    embed.add_field(name="🔗 Link", value=f"[Xem đề thi]({EXAMHUB_URL}/exams/{exam['id']})")
    await interaction.response.send_message(embed=embed)`,
        complexity: 4,
        deps: ["Sprint 1-4 hoàn thành", "ExamHub API /api/exams POST"]
      },
      {
        icon: "🗃️",
        name: "Question Bank Manager",
        priority: "HIGH",
        cmds: ["/nganhang add", "/nganhang search", "/nganhang edit"],
        desc: "Quản lý kho câu hỏi trực tiếp từ Discord. Tìm kiếm, thêm, sửa, xóa câu hỏi. Import hàng loạt từ file CSV/JSON đính kèm.",
        tech: ["discord Attachments API", "CSV parser", "Supabase full-text search", "Paginated embeds"],
        code: `@app_commands.command(name="nganhang", description="Quản lý kho câu hỏi")
@app_commands.describe(hanh_dong="add / search / import", tu_khoa="Từ khóa tìm kiếm")
async def nganhang(self, interaction, hanh_dong: str, tu_khoa: str = None):
    
    if hanh_dong == "search":
        # Full-text search trong Supabase
        results = await self.sb.search_questions(tu_khoa, limit=5)
        
        embed = discord.Embed(
            title=f"🔍 Kết quả: '{tu_khoa}'",
            description=f"Tìm thấy {len(results)} câu hỏi",
            color=0x6366F1
        )
        for q in results:
            embed.add_field(
                name=f"[{q['id'][:8]}] {q['subject']}",
                value=q['content'][:100] + "...",
                inline=False
            )
        view = QuestionBankNavigator(results)
        await interaction.response.send_message(embed=embed, view=view)
    
    elif hanh_dong == "import":
        # Hướng dẫn upload file
        await interaction.response.send_message(
            "📎 Đính kèm file CSV/JSON vào tin nhắn tiếp theo\\n"
            "Format CSV: question,optionA,optionB,optionC,optionD,answer,points",
            ephemeral=True
        )
        # Chờ attachment từ user
        def check(m): return m.author == interaction.user and m.attachments
        msg = await self.bot.wait_for("message", check=check, timeout=60)
        await self._process_question_import(interaction, msg.attachments[0])`,
        complexity: 3,
        deps: ["Supabase questions table", "ExamHub API /api/questions"]
      },
      {
        icon: "👥",
        name: "Student Roster Manager",
        priority: "HIGH",
        cmds: ["/hocsinh list", "/hocsinh reset", "/hocsinh export", "/hocsinh ban"],
        desc: "Quản lý toàn bộ danh sách học sinh: xem, tìm kiếm, reset mật khẩu, export danh sách ra CSV, khóa/mở tài khoản.",
        tech: ["Supabase Admin API", "CSV generation", "Discord Button paginator", "DM automation"],
        code: `# Export danh sách học sinh ra CSV và gửi vào Discord
@app_commands.command(name="export_hocsinh")
@app_commands.checks.has_permissions(administrator=True)
async def export_hocsinh(self, interaction: discord.Interaction):
    await interaction.response.defer(ephemeral=True)
    
    students = await self.sb.get_all_students(guild_id=str(interaction.guild_id))
    
    # Tạo CSV in-memory
    import csv, io
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Họ tên", "Email", "Level", "XP", "Streak", "Bài đã làm", "Discord ID", "Ngày link"])
    for s in students:
        writer.writerow([
            s["full_name"], s["email"], s["level"], s["xp"],
            s["streak"], s["total_submissions"],
            s["discord_id"], s["discord_linked_at"]
        ])
    
    output.seek(0)
    file = discord.File(fp=io.BytesIO(output.getvalue().encode()), filename="hocsinh_export.csv")
    await interaction.followup.send(
        f"📊 Export **{len(students)} học sinh** thành công!", 
        file=file, ephemeral=True
    )`,
        complexity: 2,
        deps: ["Sprint 1 (discord_id)", "Supabase profiles table"]
      },
      {
        icon: "📅",
        name: "Announcement Scheduler",
        priority: "MEDIUM",
        cmds: ["/lichthongbao add", "/lichthongbao list", "/lichthongbao cancel"],
        desc: "Đặt lịch thông báo tự động: nhắc thi, thông báo buổi live, deadline nộp bài. Bot tự gửi đúng giờ vào Discord + web notifications.",
        tech: ["APScheduler", "Supabase scheduled_notifications table", "Cron-style scheduling"],
        code: `# Persistent scheduler dùng APScheduler + Supabase
from apscheduler.schedulers.asyncio import AsyncIOScheduler

class AnnouncementScheduler(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.scheduler = AsyncIOScheduler()
        self.scheduler.start()

    @commands.Cog.listener()
    async def on_ready(self):
        # Load lại các scheduled jobs từ Supabase khi bot restart
        jobs = await self.sb.get_pending_scheduled_notifications()
        for job in jobs:
            self.scheduler.add_job(
                self._send_notification,
                'date',
                run_date=job["scheduled_at"],
                args=[job],
                id=job["id"]
            )

    @app_commands.command(name="lichthongbao")
    async def schedule_notif(self, interaction, noi_dung: str, thoi_gian: str):
        # Parse "15/07 08:30" → datetime
        from datetime import datetime
        dt = datetime.strptime(thoi_gian, "%d/%m %H:%M").replace(year=datetime.now().year)
        
        job_data = await self.sb.create_scheduled_notification({
            "content": noi_dung, "scheduled_at": dt.isoformat(),
            "guild_id": str(interaction.guild_id),
            "channel_id": str(interaction.channel_id)
        })
        self.scheduler.add_job(
            self._send_notification, 'date',
            run_date=dt, args=[job_data], id=job_data["id"]
        )
        await interaction.response.send_message(
            f"✅ Đã lên lịch thông báo lúc **{thoi_gian}**", ephemeral=True
        )`,
        complexity: 3,
        deps: ["APScheduler library", "scheduled_notifications table"]
      }
    ]
  },
  {
    id: "B",
    title: "AI Intelligence",
    sub: "Tích hợp Gemini AI vào từng lệnh",
    weeks: "2 tuần",
    color: "#059669",
    dark: "#047857",
    light: "#F0FDF4",
    badge: "#D1FAE5",
    icon: "🧠",
    summary: "Biến Discord thành trợ lý AI học tập thông minh. Gemini API (đã có trong ExamHub) sẽ được tích hợp vào bot để hỏi bài, tạo đề, phân tích điểm yếu và phát hiện gian lận.",
    features: [
      {
        icon: "🤖",
        name: "AI Tutor — /hoibai",
        priority: "CRITICAL",
        cmds: ["/hoibai [câu hỏi]", "/hoibai [ảnh bài toán]"],
        desc: "Học sinh hỏi bài trực tiếp trong Discord. Gemini giải thích từng bước, tham chiếu tài liệu trong ExamHub resources, trả lời theo đúng chương trình học.",
        tech: ["Gemini 1.5 Flash API", "Vision API (ảnh bài toán)", "Supabase resources context", "Thread-based conversations"],
        code: `# cogs/ai_tutor.py
import google.generativeai as genai
from PIL import Image
import io

class AITutor(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
        self.model = genai.GenerativeModel("gemini-1.5-flash")
        # Chat sessions per user (context memory)
        self.chat_sessions: dict[str, genai.ChatSession] = {}

    @app_commands.command(name="hoibai", description="Hỏi AI Tutor — giải thích bài học")
    @app_commands.describe(cau_hoi="Câu hỏi hoặc để trống nếu đính kèm ảnh bài toán")
    async def hoibai(self, interaction: discord.Interaction, cau_hoi: str = None):
        await interaction.response.defer()
        
        user_id = str(interaction.user.id)
        profile = await self.sb.get_profile_by_discord(user_id)
        
        # Lấy context từ ExamHub resources (môn học của user)
        resources_context = await self.sb.get_relevant_resources(
            subject=profile.get("current_subject"),
            keyword=cau_hoi,
            limit=3
        )
        
        system_prompt = f\"\"\"Bạn là AI Tutor của ExamHub — trợ lý học tập cho học sinh THPT Việt Nam.
Học sinh: {profile['full_name']}, Level {profile['level']}
Trả lời bằng tiếng Việt, giải thích từng bước rõ ràng.
Khi có thể, tham chiếu nội dung từ tài liệu học tập đã cung cấp.

Tài liệu liên quan:
{chr(10).join([r['content'][:500] for r in resources_context])}
\"\"\"
        # Tạo thread riêng để chat
        thread = await interaction.channel.create_thread(
            name=f"🤖 AI Tutor — {interaction.user.display_name}",
            auto_archive_duration=60
        )
        
        # Xử lý ảnh đính kèm nếu có
        content_parts = [system_prompt, cau_hoi or "Giải bài toán trong ảnh này:"]
        if interaction.message and interaction.message.attachments:
            attachment = interaction.message.attachments[0]
            img_data = await attachment.read()
            content_parts.append(Image.open(io.BytesIO(img_data)))
        
        # Khởi tạo chat session
        chat = self.model.start_chat(history=[])
        self.chat_sessions[user_id] = chat
        
        response = chat.send_message(content_parts)
        
        # Gửi câu trả lời vào thread (split nếu quá dài)
        answer = response.text
        chunks = [answer[i:i+1900] for i in range(0, len(answer), 1900)]
        for chunk in chunks:
            await thread.send(chunk)
        
        await interaction.followup.send(
            f"💬 Đã tạo thread tư vấn: {thread.mention}", ephemeral=True
        )`,
        complexity: 4,
        deps: ["Gemini API key", "Supabase resources table", "Discord Thread permissions"]
      },
      {
        icon: "✨",
        name: "AI Exam Generator",
        priority: "CRITICAL",
        cmds: ["/taode-ai [chủ đề] [số câu] [độ khó]"],
        desc: "GV nhập chủ đề → Gemini tự tạo bộ câu hỏi hoàn chỉnh → GV review trong Discord → confirm → tự động upload lên ExamHub. Tiết kiệm 90% thời gian soạn đề.",
        tech: ["Gemini structured output (JSON)", "Discord Select Menu review", "Batch question upload", "Difficulty calibration"],
        code: `@app_commands.command(name="taode_ai", description="[GV] AI tự tạo đề thi từ chủ đề")
@app_commands.describe(
    chu_de="Chủ đề cần ra đề (VD: Phương trình bậc 2)",
    so_cau="Số câu hỏi (5-30)",
    do_kho="easy / medium / hard"
)
async def taode_ai(self, interaction, chu_de: str, so_cau: int, do_kho: str):
    await interaction.response.defer()
    
    prompt = f\"\"\"Tạo {so_cau} câu hỏi trắc nghiệm 4 đáp án về: {chu_de}
Độ khó: {do_kho}. Đối tượng: học sinh THPT Việt Nam.
Trả về JSON hợp lệ, không có backtick, theo schema:
{{
  "title": "Tên đề thi",
  "questions": [
    {{
      "content": "Nội dung câu hỏi",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "correct": "A",
      "explanation": "Giải thích đáp án",
      "points": 1
    }}
  ]
}}\"\"\"
    
    response = self.model.generate_content(prompt)
    import json
    exam_data = json.loads(response.text.strip())
    
    # Preview 3 câu đầu trong Discord
    embed = discord.Embed(
        title=f"🤖 AI Đã Tạo Đề: {exam_data['title']}",
        description=f"**{len(exam_data['questions'])} câu** · Độ khó: {do_kho}",
        color=0x10B981
    )
    for i, q in enumerate(exam_data["questions"][:3], 1):
        embed.add_field(
            name=f"Câu {i}: {q['content'][:60]}...",
            value="\\n".join(q["options"][:2]) + "\\n...",
            inline=False
        )
    embed.set_footer(text=f"Còn {len(exam_data['questions'])-3} câu nữa. Xác nhận để upload lên ExamHub.")
    
    view = ConfirmPublishView(exam_data)
    await interaction.followup.send(embed=embed, view=view)`,
        complexity: 4,
        deps: ["Gemini API key", "ExamHub /api/exams POST", "GV permissions"]
      },
      {
        icon: "📊",
        name: "Smart Analytics — Phân Tích Điểm Yếu",
        priority: "HIGH",
        cmds: ["/phantich @user", "/phantich lop"],
        desc: "AI phân tích lịch sử bài làm → tìm ra chủ đề yếu → đưa ra lịch ôn tập cá nhân hóa → gợi ý đề luyện. Chạy tự động hàng tuần cho từng học sinh.",
        tech: ["Gemini analysis prompt", "Supabase submissions aggregation", "Weekly auto-report", "Personalized study plan"],
        code: `@app_commands.command(name="phantich", description="AI phân tích điểm yếu và gợi ý ôn tập")
async def phantich(self, interaction, thanh_vien: discord.Member = None):
    await interaction.response.defer(ephemeral=True)
    
    target = thanh_vien or interaction.user
    profile = await self.sb.get_profile_by_discord(str(target.id))
    
    # Lấy 30 bài làm gần nhất
    submissions = await self.sb.get_submissions(profile["id"], limit=30)
    
    # Tổng hợp dữ liệu
    weak_topics = {}
    for sub in submissions:
        for wrong in sub.get("wrong_answers", []):
            topic = wrong.get("topic", "Chung")
            weak_topics[topic] = weak_topics.get(topic, 0) + 1
    
    analysis_prompt = f\"\"\"Phân tích dữ liệu học tập của học sinh và đưa ra kế hoạch ôn tập:

Học sinh: {profile['full_name']}, Level {profile['level']}
Điểm trung bình: {sum(s['score'] for s in submissions)/len(submissions):.1f}/10
Chủ đề hay sai: {dict(sorted(weak_topics.items(), key=lambda x: -x[1])[:5])}
Streak hiện tại: {profile['streak']} ngày

Hãy:
1. Chỉ ra 3 điểm yếu chính cần cải thiện
2. Đề xuất kế hoạch ôn tập 2 tuần (cụ thể từng ngày)
3. Gợi ý dạng bài cần luyện thêm
Trả lời ngắn gọn, thực tế, bằng tiếng Việt.\"\"\"
    
    response = self.model.generate_content(analysis_prompt)
    
    embed = discord.Embed(
        title=f"🧠 Phân Tích AI — {profile['full_name']}",
        description=response.text,
        color=0x6366F1
    )
    await interaction.followup.send(embed=embed, ephemeral=True)

# Cron job: Chạy tự động mỗi Chủ nhật 20:00
@tasks.loop(time=datetime.time(hour=20, minute=0))
async def weekly_analysis_report(self):
    if datetime.datetime.now().weekday() != 6:  # Chỉ CN
        return
    students = await self.sb.get_all_linked_students()
    for student in students:
        member = # get member by discord_id
        if member:
            await member.send("📊 Báo cáo học tập tuần này của bạn đây!")
            # Gọi /phantich logic`,
        complexity: 3,
        deps: ["Gemini API key", "submissions table với topic metadata"]
      },
      {
        icon: "🕵️",
        name: "Anti-Cheat AI — Phát Hiện Bất Thường",
        priority: "HIGH",
        cmds: ["[Auto-run sau mỗi lần nộp bài]"],
        desc: "AI tự động phát hiện các pattern gian lận: nộp bài quá nhanh, tỉ lệ đúng đột biến, thời gian làm bài bất thường. Gửi alert về GV ngay lập tức.",
        tech: ["Statistical anomaly detection", "Gemini pattern analysis", "Supabase DB trigger → webhook", "Auto-flag system"],
        code: `# services/anticheat_ai.py
class AntiCheatAI:
    def __init__(self):
        self.model = genai.GenerativeModel("gemini-1.5-flash")
        self.sb = SupabaseClient()

    async def analyze_submission(self, submission: dict, profile: dict, exam: dict) -> dict:
        """Phân tích bài nộp, trả về risk_score và flags"""
        
        # Tính các metrics bất thường
        time_per_question = submission["time_spent"] / exam["total_questions"]
        historical_avg = await self.sb.get_avg_score(profile["id"], exam["subject"])
        score_jump = submission["score"] - historical_avg
        
        flags = []
        risk_score = 0
        
        # Rule-based checks
        if time_per_question < 5:  # Ít hơn 5 giây/câu
            flags.append("SPEED_ANOMALY")
            risk_score += 40
        if score_jump > 3:  # Tăng hơn 3 điểm đột ngột
            flags.append("SCORE_SPIKE")
            risk_score += 30
        if submission["tab_switches"] > 5:  # Chuyển tab nhiều
            flags.append("TAB_SWITCH")
            risk_score += 20
        
        if risk_score >= 50:
            # Gửi alert về Discord GV channel
            await self._send_cheat_alert(submission, profile, flags, risk_score)
        
        return {"risk_score": risk_score, "flags": flags}
    
    async def _send_cheat_alert(self, sub, profile, flags, score):
        channel = self.bot.get_channel(int(os.getenv("TEACHER_ALERT_CHANNEL")))
        embed = discord.Embed(
            title="⚠️ CẢNH BÁO GIAN LẬN",
            color=0xEF4444
        )
        embed.add_field(name="Học sinh", value=profile["full_name"])
        embed.add_field(name="Risk Score", value=f"**{score}/100**")
        embed.add_field(name="Dấu hiệu", value="\\n".join(f"• {f}" for f in flags))
        view = ReviewSubmissionView(sub["id"])
        await channel.send(embed=embed, view=view)`,
        complexity: 4,
        deps: ["submissions table với time_spent, tab_switches", "TEACHER_ALERT_CHANNEL env"]
      }
    ]
  },
  {
    id: "C",
    title: "Social Learning",
    sub: "Biến Discord thành cộng đồng học tập",
    weeks: "1.5 tuần",
    color: "#EA580C",
    dark: "#C2410C",
    light: "#FFF7ED",
    badge: "#FFEDD5",
    icon: "🌐",
    summary: "Discord không chỉ là nơi giám sát mà thành nền tảng học tập xã hội: study groups tự động, thách đấu 1v1, câu hỏi hàng ngày và hệ thống mùa giải theo học kỳ.",
    features: [
      {
        icon: "⚔️",
        name: "Peer Challenge — /thacdau 1v1",
        priority: "HIGH",
        cmds: ["/thacdau @user [môn]", "/thacdau chấp nhận", "/thacdau từ chối"],
        desc: "Học sinh thách đấu nhau 1v1: bot tạo private thread, cả hai làm cùng 1 bộ 5 câu ngẫu nhiên, tính giờ realtime, kết quả công bố ngay sau khi nộp.",
        tech: ["Discord Threads", "Supabase random question sampling", "Real-time timer via embed edit", "XP stakes system"],
        code: `@app_commands.command(name="thacdau", description="Thách đấu 1v1 với bạn học")
@app_commands.describe(doi_thu="Tag người muốn thách đấu", mon_hoc="Môn học để thi")
async def thacdau(self, interaction, doi_thu: discord.Member, mon_hoc: str):
    challenger_id = str(interaction.user.id)
    target_id = str(doi_thu.id)
    
    # Tạo challenge record
    challenge_id = await self.sb.create_challenge({
        "challenger": challenger_id,
        "opponent": target_id,
        "subject": mon_hoc,
        "status": "pending"
    })
    
    embed = discord.Embed(
        title=f"⚔️ Thách Đấu từ {interaction.user.display_name}!",
        description=f"{doi_thu.mention}, bạn có chấp nhận thách đấu môn **{mon_hoc}** không?\\n"
                    f"5 câu hỏi · Thời gian: 3 phút · Cược: 50 XP",
        color=0xEF4444
    )
    view = ChallengeAcceptView(challenge_id, doi_thu.id)
    await interaction.response.send_message(
        content=doi_thu.mention, embed=embed, view=view
    )

async def start_duel(self, challenge_id, thread: discord.Thread):
    """Bắt đầu cuộc đấu khi cả 2 đã vào thread"""
    challenge = await self.sb.get_challenge(challenge_id)
    questions = await self.sb.get_random_questions(
        subject=challenge["subject"], count=5
    )
    
    # Hiển thị từng câu hỏi với timer
    for i, q in enumerate(questions, 1):
        embed = discord.Embed(
            title=f"Câu {i}/5 ⏱️ 30 giây",
            description=q["content"], color=0x6366F1
        )
        view = MCQView(q, challenge_id, i)
        msg = await thread.send(embed=embed, view=view)
        
        # Đếm ngược 30 giây
        for secs in range(29, 0, -5):
            await asyncio.sleep(5)
            embed.title = f"Câu {i}/5 ⏱️ {secs} giây"
            await msg.edit(embed=embed)
        
        await asyncio.sleep(5)
        await msg.edit(view=None)  # Vô hiệu hóa nút
    
    await self._calculate_duel_result(challenge_id, thread)`,
        complexity: 5,
        deps: ["questions table với subject filter", "challenges table", "Thread permissions"]
      },
      {
        icon: "📆",
        name: "Daily Challenge — Câu Hỏi Hàng Ngày",
        priority: "HIGH",
        cmds: ["/daily [trả lời]", "[Auto-post 7:00 sáng]"],
        desc: "Bot tự động post 3 câu hỏi mỗi sáng 7h. Học sinh có 24h để trả lời. Leaderboard câu hỏi daily riêng. Streak bonus cho người trả lời liên tiếp.",
        tech: ["APScheduler daily cron", "Discord ephemeral answers", "Daily leaderboard embed", "Streak tracker"],
        code: `class DailyChallenge(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.post_daily.start()

    @tasks.loop(time=datetime.time(hour=7, minute=0))
    async def post_daily(self):
        for guild in self.bot.guilds:
            channel_id = await self.sb.get_guild_config(
                str(guild.id), "daily_channel_id"
            )
            if not channel_id:
                continue
            
            channel = guild.get_channel(int(channel_id))
            questions = await self.sb.get_daily_questions()  # 3 câu ngẫu nhiên
            
            embed = discord.Embed(
                title=f"☀️ Câu Hỏi Ngày {datetime.date.today().strftime('%d/%m')}",
                description="Trả lời trước **23:59** để nhận XP bonus! 🎯",
                color=0xF59E0B
            )
            for i, q in enumerate(questions, 1):
                embed.add_field(
                    name=f"Câu {i}: {q['content'][:80]}",
                    value="Dùng **/daily [số câu] [A/B/C/D]** để trả lời",
                    inline=False
                )
            embed.set_footer(text="🔥 Trả lời đúng hết = +30 XP · Streak 7 ngày = +100 XP bonus")
            
            view = DailyAnswerView(questions)
            await channel.send(embed=embed, view=view)
            
            # Lưu daily questions vào Supabase
            await self.sb.set_today_questions(str(guild.id), questions)`,
        complexity: 3,
        deps: ["APScheduler", "daily_challenge_submissions table", "guild_config table"]
      },
      {
        icon: "🏅",
        name: "Season System — Hệ Thống Mùa Giải",
        priority: "MEDIUM",
        cmds: ["/season info", "/season leaderboard", "[Admin] /season start", "[Admin] /season end"],
        desc: "Mỗi học kỳ = 1 mùa giải. Cuối mùa reset XP ranking, trao huy hiệu đặc biệt cho top 3, lưu lại 'hall of fame' vĩnh viễn trên web.",
        tech: ["season_records table", "Badge auto-award system", "Hall of Fame Supabase table", "Season XP vs All-time XP"],
        code: `# SQL Schema mùa giải
CREATE TABLE seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id VARCHAR(20) NOT NULL,
  name VARCHAR(100),  -- "Học Kỳ 1 2025-2026"
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'active',  -- active / ended
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE season_rankings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID REFERENCES seasons(id),
  profile_id UUID REFERENCES profiles(id),
  rank INTEGER,
  season_xp INTEGER DEFAULT 0,
  badge_awarded VARCHAR(50),  -- gold / silver / bronze
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger: Khi season kết thúc → tự snapshot XP → award badges
CREATE OR REPLACE FUNCTION end_season(p_season_id UUID)
RETURNS void AS $$
DECLARE r RECORD; rank_num INT := 1;
BEGIN
  FOR r IN (
    SELECT p.id, p.xp, p.discord_id
    FROM profiles p
    JOIN discord_voice_sessions dvs ON dvs.profile_id = p.id
    WHERE dvs.created_at >= (SELECT start_date FROM seasons WHERE id = p_season_id)
    GROUP BY p.id ORDER BY p.xp DESC LIMIT 100
  ) LOOP
    INSERT INTO season_rankings(season_id, profile_id, rank, season_xp,
      badge_awarded)
    VALUES (p_season_id, r.id, rank_num, r.xp,
      CASE WHEN rank_num=1 THEN 'gold' WHEN rank_num=2 THEN 'silver'
           WHEN rank_num=3 THEN 'bronze' ELSE NULL END);
    rank_num := rank_num + 1;
  END LOOP;
  UPDATE seasons SET status='ended' WHERE id = p_season_id;
END;
$$ LANGUAGE plpgsql;`,
        complexity: 3,
        deps: ["seasons table", "season_rankings table", "badge_awards table"]
      },
      {
        icon: "📚",
        name: "Study Groups — Auto Thread Per Class",
        priority: "MEDIUM",
        cmds: ["/nhom tao [tên lớp]", "/nhom thamgia", "/nhom tailieu"],
        desc: "Tự động tạo Discord Thread riêng cho từng lớp/nhóm học. Mỗi thread có pinned resource list từ ExamHub, bot làm moderator nhắc nhở lịch học.",
        tech: ["Discord Forum Channels", "Thread auto-archive management", "Resource pin bot", "Group XP tracking"],
        code: `@app_commands.command(name="nhom_tao", description="[GV] Tạo nhóm học tập")
async def nhom_tao(self, interaction, ten_lop: str, mon_hoc: str):
    # Tạo thread trong forum channel
    forum = discord.utils.get(interaction.guild.forums, name="📚-nhóm-học")
    if not forum:
        await interaction.response.send_message("❌ Chưa có Forum Channel. Admin tạo trước nhé.")
        return
    
    # Lấy tài liệu liên quan từ ExamHub
    resources = await self.sb.get_resources_by_subject(mon_hoc, limit=5)
    
    initial_message = f"**👋 Chào mừng đến nhóm {ten_lop}!**\\n\\n"
    initial_message += "**📚 Tài liệu học tập:**\\n"
    for r in resources:
        initial_message += f"• [{r['title']}]({EXAMHUB_URL}/resources/{r['id']})\\n"
    initial_message += "\\nDùng `/hoibai` để hỏi AI Tutor bất cứ lúc nào!"
    
    thread, _ = await forum.create_thread(
        name=f"{ten_lop} — {mon_hoc}",
        content=initial_message,
        auto_archive_duration=10080  # 7 ngày
    )
    
    # Lưu group vào Supabase
    await self.sb.create_study_group({
        "name": ten_lop, "subject": mon_hoc,
        "thread_id": str(thread.id),
        "guild_id": str(interaction.guild_id)
    })
    
    await interaction.response.send_message(
        f"✅ Đã tạo nhóm: {thread.mention}", ephemeral=True
    )`,
        complexity: 2,
        deps: ["Discord Forum Channel setup", "study_groups table", "resources table"]
      }
    ]
  },
  {
    id: "D",
    title: "Tournament Engine",
    sub: "Hệ thống thi đấu quy mô lớn",
    weeks: "1.5 tuần",
    color: "#DC2626",
    dark: "#B91C1C",
    light: "#FFF5F5",
    badge: "#FEE2E2",
    icon: "🏆",
    summary: "Biến ExamHub thành sân chơi thi đấu cấp trường và liên trường. Bot quản lý toàn bộ bracket, announce kết quả realtime và sync trophy lên web.",
    features: [
      {
        icon: "🎯",
        name: "Tournament Bracket System",
        priority: "HIGH",
        cmds: ["/giai tao", "/giai bracket", "/giai ketqua", "/giai info"],
        desc: "GV tạo giải đấu theo thể thức Swiss hoặc Knockout. Bot quản lý bracket, tự động tạo các trận đấu, announce kết quả và update bracket sau mỗi trận.",
        tech: ["Tournament bracket algorithm", "Swiss/Single-elimination logic", "Dynamic embed updates", "Supabase tournament tables"],
        code: `# SQL Schema tournament
CREATE TABLE tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id VARCHAR(20) NOT NULL,
  name VARCHAR(100) NOT NULL,
  format VARCHAR(20) DEFAULT 'single_elimination', -- swiss / single_elimination
  subject VARCHAR(50),
  status VARCHAR(20) DEFAULT 'registration', -- registration / active / completed
  max_participants INTEGER DEFAULT 32,
  prize_xp INTEGER DEFAULT 500,
  start_date TIMESTAMPTZ,
  created_by VARCHAR(20),  -- discord_id của GV
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tournament_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES tournaments(id),
  profile_id UUID REFERENCES profiles(id),
  discord_id VARCHAR(20),
  seed INTEGER,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  score_total NUMERIC DEFAULT 0
);

CREATE TABLE tournament_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES tournaments(id),
  round INTEGER NOT NULL,
  player1_id UUID REFERENCES tournament_participants(id),
  player2_id UUID REFERENCES tournament_participants(id),
  winner_id UUID REFERENCES tournament_participants(id),
  score1 NUMERIC, score2 NUMERIC,
  status VARCHAR(20) DEFAULT 'pending', -- pending / active / completed
  match_url TEXT,  -- Link vào Arena session
  played_at TIMESTAMPTZ
);`,
        complexity: 5,
        deps: ["Arena system (Sprint 4)", "tournaments table", "Discord Forum Channels"]
      },
      {
        icon: "📢",
        name: "Live Commentary Bot",
        priority: "MEDIUM",
        cmds: ["[Auto-run khi Arena match active]"],
        desc: "Bot subscribe vào Arena session realtime và chạy auto-commentary: thông báo ai đang dẫn điểm, ai vừa trả lời đúng câu khó, đếm ngược kết thúc.",
        tech: ["Supabase Realtime arena_answers", "Rate-limited Discord messages", "Dynamic leaderboard embed", "Score change detection"],
        code: `class LiveCommentator(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.active_commentaries = {}  # {session_id: channel_id}

    async def start_commentary(self, session_id: str, channel_id: int):
        self.active_commentaries[session_id] = channel_id
        channel = self.bot.get_channel(channel_id)
        
        # Subscribe Realtime vào arena_answers
        self.sb.realtime.channel(f"arena-{session_id}") \\
            .on("postgres_changes",
                event="INSERT",
                schema="public",
                table="arena_answers",
                filter=f"session_id=eq.{session_id}",
                callback=lambda p: asyncio.create_task(
                    self._on_answer(p, channel)
                )
            ).subscribe()
    
    async def _on_answer(self, payload, channel):
        answer = payload["new"]
        
        # Lấy thông tin người chơi
        profile = await self.sb.get_profile(answer["profile_id"])
        
        if answer["is_correct"]:
            # Random commentary messages
            comments = [
                f"🎯 **{profile['full_name']}** vừa trả lời đúng câu {answer['question_order']}!",
                f"⚡ Nhanh như chớp! **{profile['full_name']}** ghi điểm!",
                f"🔥 **{profile['full_name']}** đang nóng! Câu {answer['question_order']} đúng!",
            ]
            import random
            await channel.send(random.choice(comments))
        
        # Cập nhật live scoreboard mỗi 3 câu
        if answer["question_order"] % 3 == 0:
            scoreboard = await self.sb.get_arena_scoreboard(answer["session_id"])
            embed = discord.Embed(
                title=f"📊 Bảng Điểm Trực Tiếp — Câu {answer['question_order']}",
                color=0xEF4444
            )
            for i, player in enumerate(scoreboard[:5], 1):
                embed.add_field(
                    name=f"{'🥇🥈🥉🏅🏅'[i-1]} {player['name']}",
                    value=f"**{player['score']}** điểm · {player['correct']}/{player['total']} câu",
                    inline=False
                )
            await channel.send(embed=embed)`,
        complexity: 4,
        deps: ["Supabase Realtime arena_answers", "Arena system", "COMMENTARY_CHANNEL env"]
      },
      {
        icon: "🏫",
        name: "Multi-School Battle",
        priority: "MEDIUM",
        cmds: ["/lienkhoa thamgia [server-id]", "/lienkhoa tao-giai"],
        desc: "Các trường khác nhau (Discord server khác nhau) có thể tạo giải thi đấu liên trường. Bot hoạt động làm cầu nối giữa các server.",
        tech: ["Cross-guild messaging via webhook", "Shared Supabase tournament namespace", "Invite system", "Global leaderboard"],
        code: `# Bot cần JOIN cả 2 server, hoặc dùng webhook để cross-server
# Cách đơn giản nhất: Discord Webhook + shared tournament_id trên Supabase

@app_commands.command(name="lienkhoa_tao")
@app_commands.checks.has_permissions(administrator=True)
async def lienkhoa_tao(self, interaction, ten_giai: str, mon_hoc: str):
    """Tạo giải thi đấu liên trường, generate invite code"""
    
    tournament = await self.sb.create_tournament({
        "name": ten_giai, "subject": mon_hoc,
        "host_guild_id": str(interaction.guild_id),
        "format": "multi_school",
        "invite_code": generate_token()  # Code để trường khác join
    })
    
    embed = discord.Embed(
        title=f"🏫 Giải Liên Trường: {ten_giai}",
        description=f"Chia sẻ code sau để trường khác tham gia:",
        color=0x7C3AED
    )
    embed.add_field(name="Mã tham gia", value=f"```{tournament['invite_code']}```")
    embed.add_field(
        name="Hướng dẫn", 
        value="Trường khác dùng **/lienkhoa thamgia [mã]** trong server của họ"
    )
    await interaction.response.send_message(embed=embed)`,
        complexity: 5,
        deps: ["Bot có mặt ở nhiều server", "Supabase shared tournament namespace"]
      }
    ]
  },
  {
    id: "E",
    title: "Parent & Multi-tenant",
    sub: "Mở rộng ra nhiều trường, tích hợp phụ huynh",
    weeks: "2 tuần",
    color: "#0284C7",
    dark: "#0369A1",
    light: "#F0F9FF",
    badge: "#E0F2FE",
    icon: "🏛️",
    summary: "Bot trở thành sản phẩm B2B: hỗ trợ nhiều trường cùng lúc với cấu hình độc lập, phụ huynh nhận báo cáo hàng tuần, và dashboard tổng quan cho admin cấp trường.",
    features: [
      {
        icon: "👨‍👩‍👧",
        name: "Parent Report System",
        priority: "HIGH",
        cmds: ["/phuhuynh link [email phụ huynh]", "[Auto DM hàng tuần cho PH]"],
        desc: "Học sinh link email phụ huynh → mỗi Chủ nhật bot DM cho phụ huynh báo cáo PDF: số buổi học, thời gian học trên Discord, điểm thi, vi phạm AFK.",
        tech: ["PDF generation (reportlab)", "Email fallback (SendGrid)", "Parent profile table", "Weekly cron job"],
        code: `# services/parent_reporter.py
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
import io

class ParentReporter:
    async def generate_weekly_pdf(self, student_profile: dict, week_stats: dict) -> bytes:
        buffer = io.BytesIO()
        c = canvas.Canvas(buffer, pagesize=A4)
        
        # Header
        c.setFont("Helvetica-Bold", 16)
        c.drawString(50, 800, f"BÁO CÁO HỌC TẬP TUẦN - {week_stats['week_label']}")
        c.setFont("Helvetica", 12)
        c.drawString(50, 775, f"Học sinh: {student_profile['full_name']}")
        c.drawString(50, 755, f"Lớp: {student_profile['class_name']}")
        
        # Stats
        y = 720
        stats = [
            ("Số buổi học trên Discord", f"{week_stats['sessions']} buổi"),
            ("Tổng thời gian học", f"{week_stats['total_minutes']} phút"),
            ("XP kiếm được tuần này", f"+{week_stats['weekly_xp']} XP"),
            ("Cấp độ hiện tại", f"Level {student_profile['level']}"),
            ("Số bài thi đã làm", f"{week_stats['exams_taken']} bài"),
            ("Điểm trung bình", f"{week_stats['avg_score']:.1f}/10"),
            ("Số lần vi phạm AFK", f"{week_stats['afk_violations']} lần"),
            ("Streak điểm danh", f"{student_profile['streak']} ngày"),
        ]
        for label, value in stats:
            c.drawString(60, y, f"• {label}: {value}")
            y -= 25
        
        c.save()
        buffer.seek(0)
        return buffer.getvalue()
    
    async def send_to_parent(self, discord_id: str, pdf_bytes: bytes):
        parent_discord = await self.sb.get_parent_discord(discord_id)
        if parent_discord:
            try:
                user = await self.bot.fetch_user(int(parent_discord))
                file = discord.File(
                    io.BytesIO(pdf_bytes),
                    filename=f"baocao_tuan_{datetime.date.today()}.pdf"
                )
                await user.send(
                    "📊 Báo cáo học tập tuần này của con bạn:",
                    file=file
                )
            except discord.Forbidden:
                pass  # PH chưa cho phép DM`,
        complexity: 4,
        deps: ["reportlab library", "parent_profiles table", "parent discord_id field"]
      },
      {
        icon: "🏫",
        name: "Multi-Server / Multi-School",
        priority: "HIGH",
        cmds: ["/setup", "/config set [key] [value]", "/config view"],
        desc: "1 bot instance phục vụ nhiều trường/server với cấu hình độc lập. Mỗi server có config riêng: channel IDs, AFK thresholds, XP rates, daily challenge time.",
        tech: ["guild_configs Supabase table", "Per-guild settings cache (Redis)", "Setup wizard on bot join", "Config validation"],
        code: `-- guild_configs table: cấu hình riêng mỗi server
CREATE TABLE guild_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id VARCHAR(20) UNIQUE NOT NULL,
  guild_name VARCHAR(100),
  
  -- Channel IDs
  announce_channel_id VARCHAR(20),
  arena_channel_id VARCHAR(20),
  live_channel_id VARCHAR(20),
  teacher_alert_channel_id VARCHAR(20),
  daily_challenge_channel_id VARCHAR(20),
  parent_report_day INTEGER DEFAULT 0,  -- 0=CN, 1=T2...
  
  -- Bot behavior
  xp_per_minute INTEGER DEFAULT 2,
  afk_threshold_minutes INTEGER DEFAULT 30,
  daily_challenge_time TIME DEFAULT '07:00:00',
  study_channel_prefix VARCHAR(10) DEFAULT '📚',
  
  -- Feature flags
  enable_ai_tutor BOOLEAN DEFAULT TRUE,
  enable_parent_reports BOOLEAN DEFAULT FALSE,
  enable_anticheat BOOLEAN DEFAULT TRUE,
  enable_tournament BOOLEAN DEFAULT TRUE,
  
  -- School info
  school_name VARCHAR(100),
  school_logo_url TEXT,
  examhub_url TEXT,  -- Custom domain nếu có
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bot tự chạy setup wizard khi join server mới
@commands.Cog.listener()
async def on_guild_join(self, guild: discord.Guild):
    # Tạo config mặc định
    await self.sb.create_guild_config(str(guild.id), guild.name)
    
    # Gửi setup wizard vào system channel
    channel = guild.system_channel or guild.text_channels[0]
    embed = discord.Embed(
        title="👋 Chào mừng ExamHub Bot!",
        description="Dùng **/setup** để cấu hình bot cho trường của bạn.",
        color=0x7C3AED
    )
    view = SetupWizardView()
    await channel.send(embed=embed, view=view)`,
        complexity: 3,
        deps: ["guild_configs table", "Redis hoặc in-memory cache", "Setup wizard UI"]
      },
      {
        icon: "📱",
        name: "Zalo Bridge Integration",
        priority: "MEDIUM",
        cmds: ["/zalo link [số điện thoại]", "[Auto relay thông báo sang Zalo]"],
        desc: "Relay thông báo từ ExamHub → Discord → Zalo OA. Phụ huynh và học sinh không dùng Discord vẫn nhận được thông báo quan trọng qua Zalo.",
        tech: ["Zalo OA API", "Phone number → Zalo ID lookup", "Template message system", "Opt-in/opt-out management"],
        code: `# services/zalo_bridge.py
import aiohttp

class ZaloBridge:
    ZALO_API = "https://openapi.zalo.me/v2.0/oa"
    
    def __init__(self):
        self.access_token = os.getenv("ZALO_OA_ACCESS_TOKEN")
    
    async def send_message(self, phone: str, message: str, template_id: str = None):
        """Gửi tin nhắn Zalo OA đến user qua số điện thoại"""
        # Tìm follower_id từ phone
        follower_id = await self._get_follower_id(phone)
        if not follower_id:
            return False
        
        async with aiohttp.ClientSession() as session:
            payload = {
                "recipient": {"user_id": follower_id},
                "message": {"text": message}
            }
            if template_id:
                payload["message"] = {
                    "attachment": {
                        "type": "template",
                        "payload": {"template_type": "transaction_education",
                                   "template_id": template_id}
                    }
                }
            
            async with session.post(
                f"{self.ZALO_API}/message/cs",
                json=payload,
                headers={"access_token": self.access_token}
            ) as resp:
                return (await resp.json()).get("error") == 0
    
    # Dùng trong cogs/notifications.py
    async def relay_exam_notification(self, exam: dict, student_phones: list):
        message = (
            f"📝 ExamHub: Đề thi mới!\\n"
            f"📚 {exam['title']}\\n"
            f"⏰ {exam['duration']} phút\\n"
            f"🔗 Vào làm bài: {EXAMHUB_URL}/exams/{exam['id']}"
        )
        for phone in student_phones:
            await self.send_message(phone, message)`,
        complexity: 4,
        deps: ["Zalo OA API credentials", "phone_number field in profiles", "Zalo OA setup"]
      },
      {
        icon: "📈",
        name: "Admin Analytics Dashboard",
        priority: "MEDIUM",
        cmds: ["/admin stats", "/admin heatmap", "/admin export-full"],
        desc: "Dashboard tổng quan cấp Admin: số học sinh active, tổng giờ học qua Discord, top performers, peak hours heatmap, revenue (nếu có premium).",
        tech: ["Supabase aggregation queries", "Discord embed heatmap (text art)", "Weekly/monthly comparison", "Export to Excel"],
        code: `@app_commands.command(name="admin_stats")
@app_commands.checks.has_permissions(administrator=True)
async def admin_stats(self, interaction, period: str = "week"):
    """period: week / month / all"""
    await interaction.response.defer(ephemeral=True)
    
    stats = await self.sb.get_admin_stats(
        guild_id=str(interaction.guild_id),
        period=period
    )
    
    embed = discord.Embed(
        title=f"📈 Admin Dashboard — {period.title()}",
        color=0x1E1B4B
    )
    embed.add_field(name="👥 Học sinh active", value=str(stats["active_students"]), inline=True)
    embed.add_field(name="⏱️ Tổng giờ học", value=f"{stats['total_hours']:.1f}h", inline=True)
    embed.add_field(name="📝 Bài đã nộp", value=str(stats["total_submissions"]), inline=True)
    embed.add_field(name="⚔️ Arena battles", value=str(stats["arena_sessions"]), inline=True)
    embed.add_field(name="🤖 AI queries", value=str(stats["ai_queries"]), inline=True)
    embed.add_field(name="🚫 AFK violations", value=str(stats["afk_violations"]), inline=True)
    
    # Heatmap giờ học cao điểm (text art)
    heatmap = stats["hourly_heatmap"]  # list 24 values
    bars = "".join(
        "█" * int(v / max(heatmap) * 5) if v > 0 else "░"
        for v in heatmap
    )
    embed.add_field(
        name="⏰ Giờ học cao điểm (0h→23h)",
        value=f"\`{bars}\`",
        inline=False
    )
    await interaction.followup.send(embed=embed, ephemeral=True)`,
        complexity: 3,
        deps: ["Aggregation queries trên Supabase", "hourly_heatmap materialized view"]
      }
    ]
  },
  {
    id: "F",
    title: "Monetize & Ship",
    sub: "Đóng gói thành sản phẩm thương mại",
    weeks: "1 tuần",
    color: "#B45309",
    dark: "#92400E",
    light: "#FFFBEB",
    badge: "#FEF3C7",
    icon: "🚀",
    summary: "Đây là bước cuối: biến bot thành sản phẩm có thể bán cho nhiều trường khác nhau, với tier pricing, white-label config, và bot listing trên top.gg.",
    features: [
      {
        icon: "💎",
        name: "Premium Tier System",
        priority: "HIGH",
        cmds: ["/premium status", "/premium upgrade", "[Admin] /premium grant [server]"],
        desc: "3 tier: Free (tính năng cơ bản) / Pro (AI Tutor + Advanced Analytics) / Enterprise (Multi-school + Parent Reports + Custom branding). Feature gates tự động theo tier.",
        tech: ["Supabase subscriptions table", "Feature flag middleware", "Stripe webhook (optional)", "Grace period handling"],
        code: `# Middleware kiểm tra tier trước khi chạy command
def require_tier(min_tier: str):
    """Decorator: chặn command nếu server không đủ tier"""
    tier_order = {"free": 0, "pro": 1, "enterprise": 2}
    
    def decorator(func):
        @wraps(func)
        async def wrapper(self, interaction: discord.Interaction, *args, **kwargs):
            guild_tier = await self.sb.get_guild_tier(str(interaction.guild_id))
            
            if tier_order.get(guild_tier, 0) < tier_order.get(min_tier, 0):
                embed = discord.Embed(
                    title="💎 Tính Năng Premium",
                    description=f"Lệnh này yêu cầu tier **{min_tier.upper()}**.\n"
                                f"Server của bạn đang dùng: **{guild_tier.upper()}**",
                    color=0xF59E0B
                )
                embed.add_field(
                    name="Nâng cấp",
                    value=f"[Xem các gói tại đây]({EXAMHUB_URL}/pricing)"
                )
                return await interaction.response.send_message(embed=embed, ephemeral=True)
            
            return await func(self, interaction, *args, **kwargs)
        return wrapper
    return decorator

# Áp dụng vào commands
@require_tier("pro")
async def hoibai(self, interaction, cau_hoi: str):
    # AI Tutor chỉ cho tier Pro+
    ...

@require_tier("enterprise")
async def lienkhoa_tao(self, interaction, ten_giai: str):
    # Multi-school chỉ cho Enterprise
    ...

# Tier features table
TIER_FEATURES = {
    "free": {
        "xp_sync": True, "voice_tracking": True, "slash_commands": True,
        "ai_tutor": False, "parent_reports": False, "tournament": False,
        "daily_challenge": True, "peer_challenge": True,
        "max_students": 50, "max_exams_per_month": 10
    },
    "pro": {
        "ai_tutor": True, "smart_analytics": True, "exam_builder": True,
        "tournament": True, "anticheat_ai": True,
        "max_students": 300, "max_exams_per_month": 100
    },
    "enterprise": {
        "parent_reports": True, "zalo_bridge": True, "multi_school": True,
        "custom_branding": True, "dedicated_support": True,
        "max_students": -1, "max_exams_per_month": -1  # Unlimited
    }
}`,
        complexity: 3,
        deps: ["guild_subscriptions table", "Feature flag middleware hoàn chỉnh"]
      },
      {
        icon: "🎨",
        name: "White-label & Custom Branding",
        priority: "MEDIUM",
        cmds: ["/brand set-name [tên trường]", "/brand set-color [hex]", "/brand set-logo [url]"],
        desc: "Mỗi trường có thể custom hoàn toàn: tên trường trong embed, màu accent, logo trong footer. Tất cả embed của bot sẽ dùng brand của trường đó.",
        tech: ["guild_configs branding fields", "Dynamic embed builder", "Color validation", "Logo CDN upload"],
        code: `# utils/embed_builder.py — Brand-aware embed factory
class BrandedEmbed:
    def __init__(self, guild_config: dict):
        self.config = guild_config
        self.color = int(guild_config.get("brand_color", "6366F1"), 16)
        self.school_name = guild_config.get("school_name", "ExamHub")
        self.logo_url = guild_config.get("school_logo_url")
    
    def create(self, title: str, description: str = None, **kwargs) -> discord.Embed:
        embed = discord.Embed(
            title=title, description=description,
            color=self.color, **kwargs
        )
        embed.set_footer(
            text=f"{self.school_name} · Powered by ExamHub",
            icon_url=self.logo_url
        )
        return embed

# Dùng trong bất kỳ cog nào
class SomeCog(commands.Cog):
    async def get_embed(self, guild_id: str) -> BrandedEmbed:
        config = await self.sb.get_guild_config(guild_id)
        return BrandedEmbed(config)

    async def some_command(self, interaction):
        eb = await self.get_embed(str(interaction.guild_id))
        embed = eb.create("Tiêu đề", "Nội dung")
        await interaction.response.send_message(embed=embed)`,
        complexity: 2,
        deps: ["guild_configs branding fields", "BrandedEmbed được dùng toàn bot"]
      },
      {
        icon: "🩺",
        name: "Bot Health Monitor",
        priority: "MEDIUM",
        cmds: ["/status", "[Auto-alert khi có lỗi]"],
        desc: "Dashboard health của bot: latency, commands per minute, Supabase connection status, active voice sessions, memory usage. Auto-alert admin khi có downtime.",
        tech: ["Prometheus metrics (optional)", "Discord embed status page", "Supabase health check", "Auto-restart on crash"],
        code: `class HealthMonitor(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.start_time = datetime.datetime.utcnow()
        self.command_count = 0
        self.error_count = 0
        self.health_check.start()
    
    @tasks.loop(minutes=5)
    async def health_check(self):
        """Kiểm tra sức khỏe định kỳ, alert nếu có vấn đề"""
        issues = []
        
        # Latency check
        if self.bot.latency * 1000 > 500:
            issues.append(f"⚠️ Latency cao: {self.bot.latency*1000:.0f}ms")
        
        # Supabase check
        try:
            await self.sb.health_check()
        except Exception as e:
            issues.append(f"🔴 Supabase error: {str(e)[:50]}")
        
        # Alert admin nếu có vấn đề
        if issues:
            admin_id = os.getenv("BOT_ADMIN_DISCORD_ID")
            admin = await self.bot.fetch_user(int(admin_id))
            await admin.send("🚨 **Bot Health Alert:**\n" + "\n".join(issues))
    
    @app_commands.command(name="status", description="Xem trạng thái bot")
    async def status(self, interaction):
        uptime = datetime.datetime.utcnow() - self.start_time
        active_sessions = len(self.voice_tracker.active_sessions)
        
        embed = discord.Embed(title="🤖 Bot Status", color=0x10B981)
        embed.add_field(name="⏱️ Uptime", value=str(uptime).split('.')[0])
        embed.add_field(name="📡 Latency", value=f"{self.bot.latency*1000:.0f}ms")
        embed.add_field(name="🎤 Voice Sessions", value=str(active_sessions))
        embed.add_field(name="🌐 Servers", value=str(len(self.bot.guilds)))
        embed.add_field(name="📊 Commands Run", value=str(self.command_count))
        await interaction.response.send_message(embed=embed, ephemeral=True)`,
        complexity: 2,
        deps: ["Tất cả phases hoàn thành", "BOT_ADMIN_DISCORD_ID env"]
      }
    ]
  }
];

// ─── COMPONENTS ─────────────────────────────────────────────────────────────

const PRIORITY_STYLES = {
  CRITICAL: { bg: "#FEE2E2", text: "#991B1B", label: "🔴 CRITICAL" },
  HIGH: { bg: "#FEF3C7", text: "#92400E", label: "🟡 HIGH" },
  MEDIUM: { bg: "#D1FAE5", text: "#065F46", label: "🟢 MEDIUM" },
};

function ComplexityDots({ n }) {
  return (
    <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
      {[1,2,3,4,5].map(i => (
        <div key={i} style={{
          width: 8, height: 8, borderRadius: "50%",
          background: i <= n ? "#6366F1" : "#E5E7EB"
        }} />
      ))}
      <span style={{ fontSize: 11, color: "#6B7280", marginLeft: 2 }}>
        {["","Dễ","","Trung bình","","Phức tạp"][n]}
      </span>
    </div>
  );
}

function CodeBlock({ code }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(()=>setCopied(false),2000); }}
        style={{ position:"absolute", top:8, right:8, background: copied?"#10B981":"#334155",
          color:"#fff", border:"none", borderRadius:6, padding:"3px 10px", fontSize:11, cursor:"pointer" }}>
        {copied ? "✓" : "Copy"}
      </button>
      <div style={{ background:"#0F172A", borderRadius:10, padding:"14px 16px",
        overflowX:"auto", maxHeight:280, overflowY:"auto", border:"1px solid #1E293B" }}>
        <pre style={{ margin:0, fontFamily:"monospace", fontSize:12,
          color:"#E2E8F0", lineHeight:1.65, whiteSpace:"pre" }}>{code}</pre>
      </div>
    </div>
  );
}

function FeatureCard({ f, color, dark }) {
  const [open, setOpen] = useState(false);
  const ps = PRIORITY_STYLES[f.priority];
  return (
    <div style={{ border:`1px solid #E5E7EB`, borderRadius:12,
      overflow:"hidden", marginBottom:10,
      boxShadow: open ? "0 4px 12px rgba(0,0,0,0.08)" : "none",
      transition: "box-shadow 0.2s" }}>
      <button onClick={() => setOpen(o=>!o)}
        style={{ width:"100%", textAlign:"left", background: open?"#FAFAFA":"#fff",
          border:"none", padding:"14px 18px", cursor:"pointer",
          display:"flex", alignItems:"flex-start", gap:12 }}>
        <span style={{ fontSize:22, flexShrink:0, marginTop:2 }}>{f.icon}</span>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
            <span style={{ fontSize:15, fontWeight:600, color:"#111827" }}>{f.name}</span>
            <span style={{ background:ps.bg, color:ps.text, fontSize:10,
              borderRadius:5, padding:"2px 7px", fontWeight:600 }}>{ps.label}</span>
          </div>
          <div style={{ fontSize:12, color:"#6B7280", marginTop:4 }}>{f.desc}</div>
          <div style={{ display:"flex", gap:6, marginTop:8, flexWrap:"wrap" }}>
            {f.cmds.map((c,i) => (
              <code key={i} style={{ background:"#F1F5F9", color:"#475569",
                fontSize:11, padding:"2px 7px", borderRadius:5 }}>{c}</code>
            ))}
          </div>
        </div>
        <span style={{ color:"#9CA3AF", fontSize:14, flexShrink:0, marginTop:2 }}>
          {open ? "▲" : "▼"}
        </span>
      </button>
      {open && (
        <div style={{ padding:"0 18px 18px", borderTop:"1px solid #F3F4F6" }}>
          <div style={{ display:"flex", gap:20, flexWrap:"wrap", margin:"14px 0 12px" }}>
            <div>
              <div style={{ fontSize:11, color:"#9CA3AF", marginBottom:4 }}>CÔNG NGHỆ</div>
              <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                {f.tech.map((t,i) => (
                  <span key={i} style={{ background:`${color}15`, color:dark,
                    fontSize:11, padding:"2px 8px", borderRadius:5, fontWeight:500 }}>{t}</span>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize:11, color:"#9CA3AF", marginBottom:4 }}>ĐỘ PHỨC TẠP</div>
              <ComplexityDots n={f.complexity} />
            </div>
          </div>
          {f.deps && (
            <div style={{ background:"#FFFBEB", border:"1px solid #FDE68A",
              borderRadius:8, padding:"8px 12px", marginBottom:12, fontSize:12 }}>
              <strong>📌 Phụ thuộc:</strong> {f.deps.join(", ")}
            </div>
          )}
          <CodeBlock code={f.code} />
        </div>
      )}
    </div>
  );
}

// ─── MAIN ───────────────────────────────────────────────────────────────────

export default function AllInOnePlan() {
  const [activePhase, setActivePhase] = useState("A");
  const phase = PHASES.find(p => p.id === activePhase);
  const totalWeeks = 10;

  return (
    <div style={{ fontFamily:"system-ui,sans-serif", maxWidth:900, margin:"0 auto",
      background:"#F8FAFC", minHeight:"100vh", padding:"0 0 40px" }}>

      {/* ── HERO ── */}
      <div style={{ background:"linear-gradient(135deg,#0F0E2B 0%,#1E1B4B 50%,#2D2460 100%)",
        padding:"28px 28px 24px", marginBottom:0 }}>
        <div style={{ fontSize:11, color:"#818CF8", letterSpacing:2, marginBottom:8 }}>
          EXAMHUB × DISCORD — ALL-IN-ONE MASTER PLAN
        </div>
        <div style={{ fontSize:24, fontWeight:800, color:"#fff", marginBottom:6 }}>
          🤖 Từ Bot Giám Sát → Sản Phẩm Toàn Diện
        </div>
        <div style={{ fontSize:13, color:"#A5B4FC", marginBottom:20, maxWidth:620 }}>
          6 phases · {totalWeeks} tuần · Biến Discord Bot thành hệ thống quản lý học tập
          độc quyền có thể thương mại hóa cho nhiều trường
        </div>

        {/* Timeline visual */}
        <div style={{ display:"flex", gap:2, alignItems:"stretch", flexWrap:"wrap" }}>
          {PHASES.map(p => (
            <button key={p.id} onClick={() => setActivePhase(p.id)}
              style={{ flex:"1 1 120px", background: activePhase===p.id ? p.color : "rgba(255,255,255,0.08)",
                border: activePhase===p.id ? `2px solid ${p.color}` : "2px solid transparent",
                borderRadius:10, padding:"10px 12px", cursor:"pointer", transition:"all 0.2s",
                color:"#fff", textAlign:"left" }}>
              <div style={{ fontSize:18 }}>{p.icon}</div>
              <div style={{ fontSize:12, fontWeight:700, marginTop:4 }}>Phase {p.id}</div>
              <div style={{ fontSize:11, opacity:.8 }}>{p.title}</div>
              <div style={{ fontSize:10, opacity:.6, marginTop:2 }}>{p.weeks}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ── PHASE CONTENT ── */}
      <div style={{ padding:"0 20px" }}>
        {/* Phase Header */}
        <div style={{ background:`linear-gradient(135deg,${phase.color}18,${phase.color}08)`,
          border:`1px solid ${phase.color}30`, borderRadius:14,
          padding:"20px 24px", margin:"20px 0 16px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:10 }}>
            <div style={{ background:phase.color, color:"#fff", width:50, height:50,
              borderRadius:14, display:"flex", alignItems:"center",
              justifyContent:"center", fontSize:24, flexShrink:0 }}>{phase.icon}</div>
            <div>
              <div style={{ fontSize:20, fontWeight:800, color:"#111827" }}>
                Phase {phase.id}: {phase.title}
              </div>
              <div style={{ fontSize:13, color:"#6B7280" }}>
                {phase.sub} · <span style={{ color:phase.dark, fontWeight:600 }}>{phase.weeks}</span>
                {" · "}{phase.features.length} tính năng
              </div>
            </div>
          </div>
          <div style={{ background:`${phase.color}12`, border:`1px solid ${phase.color}25`,
            borderRadius:9, padding:"10px 14px", fontSize:13.5,
            color:phase.dark, lineHeight:1.6 }}>
            🎯 {phase.summary}
          </div>

          {/* Feature summary pills */}
          <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:12 }}>
            {phase.features.map((f,i) => (
              <div key={i} style={{ background:"rgba(255,255,255,0.8)",
                border:`1px solid ${phase.color}30`, borderRadius:20,
                padding:"4px 12px", fontSize:12, color:"#374151",
                display:"flex", alignItems:"center", gap:5 }}>
                <span>{f.icon}</span><span>{f.name.split(" — ")[0]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Features */}
        {phase.features.map((f, i) => (
          <FeatureCard key={i} f={f} color={phase.color} dark={phase.dark} />
        ))}
      </div>

      {/* ── ROADMAP SUMMARY ── */}
      <div style={{ margin:"24px 20px 0", background:"#1E1B4B",
        borderRadius:14, padding:"20px 24px" }}>
        <div style={{ color:"#A5B4FC", fontSize:12, letterSpacing:1, marginBottom:12 }}>
          TỔNG QUAN ROADMAP — {totalWeeks} TUẦN
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:8 }}>
          {PHASES.map(p => (
            <div key={p.id} onClick={() => setActivePhase(p.id)}
              style={{ background:"rgba(255,255,255,0.07)", borderRadius:10,
                padding:"12px 14px", cursor:"pointer",
                border:`1px solid ${activePhase===p.id ? p.color : "transparent"}`,
                transition:"border 0.2s" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ fontSize:16 }}>{p.icon}</span>
                <span style={{ background:p.color, color:"#fff", fontSize:10,
                  borderRadius:5, padding:"2px 7px" }}>{p.weeks}</span>
              </div>
              <div style={{ color:"#fff", fontSize:13, fontWeight:600, marginTop:6 }}>
                Phase {p.id}: {p.title}
              </div>
              <div style={{ color:"#94A3B8", fontSize:11, marginTop:3 }}>
                {p.features.length} tính năng
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop:16, paddingTop:16, borderTop:"1px solid rgba(255,255,255,0.1)",
          display:"flex", gap:16, flexWrap:"wrap" }}>
          {[
            ["🤖","~50+ commands", "Slash commands"],
            ["🧠","6 AI features","Gemini powered"],
            ["🏫","Multi-school","B2B ready"],
            ["💎","3 tiers","Monetizable"],
          ].map(([ic, val, label]) => (
            <div key={label} style={{ color:"#fff" }}>
              <span style={{ fontSize:16 }}>{ic}</span>
              <div style={{ fontSize:15, fontWeight:700 }}>{val}</div>
              <div style={{ fontSize:11, color:"#94A3B8" }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Nav */}
      <div style={{ display:"flex", justifyContent:"space-between", padding:"16px 20px 0", gap:10 }}>
        <button onClick={() => {
          const idx = PHASES.findIndex(p=>p.id===activePhase);
          if(idx>0) setActivePhase(PHASES[idx-1].id);
        }} disabled={activePhase==="A"}
          style={{ padding:"10px 20px", borderRadius:10, border:"1px solid #E5E7EB",
            background: activePhase==="A"?"#F9FAFB":"#fff",
            color: activePhase==="A"?"#9CA3AF":"#374151",
            cursor: activePhase==="A"?"default":"pointer", fontSize:14 }}>
          ← Phase trước
        </button>
        <button onClick={() => {
          const idx = PHASES.findIndex(p=>p.id===activePhase);
          if(idx<PHASES.length-1) setActivePhase(PHASES[idx+1].id);
        }} disabled={activePhase==="F"}
          style={{ padding:"10px 24px", borderRadius:10,
            border:`1px solid ${activePhase==="F"?"#E5E7EB":phase.color}`,
            background: activePhase==="F"?"#F9FAFB":phase.color,
            color: activePhase==="F"?"#9CA3AF":"#fff",
            cursor: activePhase==="F"?"default":"pointer", fontSize:14, fontWeight:600 }}>
          Phase tiếp →
        </button>
      </div>
    </div>
  );
}
