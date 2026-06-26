/**
 * /phantich — Smart Analytics command (GV only)
 */
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const supabase = require('../utils/supabase');
const { askGemini } = require('../utils/ai');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('phantich')
    .setDescription('[GV] Phân tích điểm mạnh, điểm yếu và kế hoạch học tập của học sinh bằng AI')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(opt =>
      opt.setName('hoc_sinh')
        .setDescription('Học sinh cần phân tích kết quả học tập')
        .setRequired(true)
    ),

  async execute(interaction) {
    if (!interaction.memberPermissions.has(PermissionFlagsBits.ModerateMembers)) {
      return interaction.reply({ content: '❌ Bạn không có quyền thực hiện lệnh này.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });
    const targetUser = interaction.options.getUser('hoc_sinh');

    if (!supabase) {
      return interaction.followUp({ content: '❌ Kết nối cơ sở dữ liệu chưa sẵn sàng.', ephemeral: true });
    }

    // 1. Fetch user profile
    const { data: profile, error: pErr } = await supabase
      .from('profiles')
      .select('id, full_name, class')
      .eq('discord_id', targetUser.id)
      .maybeSingle();

    if (pErr || !profile) {
      return interaction.followUp({
        content: `❌ Học sinh **${targetUser.username}** chưa liên kết tài khoản ExamHub.`,
        ephemeral: true
      });
    }

    // 2. Fetch student stats (gamification)
    const { data: stats } = await supabase
      .from('student_stats')
      .select('xp, level, streak_days')
      .eq('user_id', profile.id)
      .maybeSingle();

    // 3. Fetch recent submissions (last 15 submissions)
    const { data: submissions, error: subError } = await supabase
      .from('submissions')
      .select('score, time_spent, submitted_at, exams(title, subject)')
      .eq('student_id', profile.id)
      .order('submitted_at', { ascending: false })
      .limit(15);

    if (subError) {
      console.error('[PHANTICH ERROR] Fetching submissions:', subError);
    }

    // 4. Aggregate data for the prompt
    let totalScore = 0;
    let submissionsListText = '';
    const subjectScores = {};

    if (submissions && submissions.length > 0) {
      submissions.forEach((sub, idx) => {
        const title = sub.exams?.title || 'Đề kiểm tra';
        const subject = sub.exams?.subject || 'Chung';
        const score = Number(sub.score) || 0;
        const timeMin = Math.round(sub.time_spent / 60) || 1;

        totalScore += score;
        submissionsListText += `- Đề ${idx + 1}: "${title}" (Môn: ${subject}) - Điểm: ${score}/10, làm trong ${timeMin} phút\n`;

        if (!subjectScores[subject]) {
          subjectScores[subject] = [];
        }
        subjectScores[subject].push(score);
      });
    }

    const avgScore = submissions && submissions.length > 0 ? (totalScore / submissions.length).toFixed(2) : 'Chưa có';

    let subjectSummary = '';
    Object.keys(subjectScores).forEach(sub => {
      const avgSubScore = (subjectScores[sub].reduce((a, b) => a + b, 0) / subjectScores[sub].length).toFixed(2);
      subjectSummary += `  + Môn ${sub}: Điểm TB ${avgSubScore}/10 (${subjectScores[sub].length} bài)\n`;
    });

    // 5. Ask Gemini for analysis
    try {
      const prompt = `Phân tích kết quả học tập của học sinh dưới đây và đưa ra nhận xét giáo dục thông minh (điểm mạnh, điểm yếu) và một lộ trình ôn tập cá nhân hóa 2 tuần tới:
Tên học sinh: ${profile.full_name}
Lớp: ${profile.class || 'Chưa rõ'}
Cấp độ: Level ${stats?.level || 1} (Streak: ${stats?.streak_days || 0} ngày)
Điểm trung bình tất cả các môn: ${avgScore}/10

Thống kê theo môn học:
${subjectSummary || '  + Chưa thực hiện đề thi nào.'}

Lịch sử 15 bài kiểm tra gần nhất:
${submissionsListText || '- Chưa thực hiện đề thi nào.'}

Yêu cầu đầu ra:
Trả về nhận xét chi tiết bằng tiếng Việt, phân bổ thành 3 mục rõ ràng:
1. 🎯 **Phân tích học tập** (Đánh giá chi tiết điểm mạnh và điểm yếu thông qua phổ điểm & môn học).
2. 💡 **Giải pháp cải thiện** (Học sinh cần làm gì đối với các môn học hoặc kỹ năng còn yếu).
3. 📅 **Lộ trình ôn tập 2 tuần** (Kế hoạch hành động chi tiết từng ngày/tuần để học sinh bám theo).

Hãy phản hồi súc tích, chuyên nghiệp, mang tinh thần giáo dục tích cực và truyền động lực.`;

      const analysisResult = await askGemini([{ role: 'user', content: prompt }], '', 0.3);

      // Create Embed Report
      const embed = new EmbedBuilder()
        .setColor(0x6366F1)
        .setTitle(`📊 BÁO CÁO PHÂN TÍCH AI: ${profile.full_name}`)
        .setDescription(`**Lớp:** ${profile.class || 'Chưa rõ'} · **Level:** ${stats?.level || 1} · **Điểm TB:** ${avgScore}/10\n*Dữ liệu dựa trên 15 bài làm gần nhất trên hệ thống ExamHub.*`)
        .setThumbnail(targetUser.displayAvatarURL())
        .setTimestamp()
        .setFooter({ text: 'Báo cáo thông minh AI - ExamHub' });

      // Embed description limits might be reached if analysis is too long,
      // so we will split the output into fields or just set it in description if safe.
      // A safe way is to split it by headers into fields.
      const sections = analysisResult.split(/(?=\d\.\s+\*\*)/g);

      if (sections.length >= 3) {
        sections.forEach(sec => {
          const match = sec.match(/\d\.\s+\*\*(.*?)\*\*(.*)/s);
          if (match) {
            const fieldTitle = match[1].trim();
            const fieldValue = match[2].trim().substring(0, 1024);
            embed.addFields({ name: `👉 ${fieldTitle}`, value: fieldValue });
          } else {
            // Fallback
            const cleanSec = sec.trim().substring(0, 1024);
            if (cleanSec) {
              embed.addFields({ name: '📝 Nhận xét', value: cleanSec });
            }
          }
        });
      } else {
        // Fallback to description
        embed.setDescription(analysisResult.substring(0, 4000));
      }

      await interaction.followUp({ embeds: [embed], ephemeral: true });

    } catch (err) {
      console.error('[PHANTICH AI ERROR]', err);
      await interaction.followUp({
        content: `❌ Có lỗi khi tạo báo cáo phân tích AI: ${err.message}`,
        ephemeral: true
      });
    }
  }
};
