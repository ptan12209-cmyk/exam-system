/**
 * /daily — Daily Challenge command and scheduler
 */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const supabase = require('../utils/supabase');
const { askGemini } = require('../utils/ai');
const { ANNOUNCE_CHANNEL_ID } = require('../utils/constants');

// Simple tracker to prevent multiple daily posts in a single process run
let lastPostedDate = null;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Trả lời câu hỏi hàng ngày để nhận XP!')
    .addStringOption(opt =>
      opt.setName('cau_1')
        .setDescription('Đáp án cho câu 1')
        .setRequired(true)
        .addChoices(
          { name: 'A', value: 'A' },
          { name: 'B', value: 'B' },
          { name: 'C', value: 'C' },
          { name: 'D', value: 'D' }
        )
    )
    .addStringOption(opt =>
      opt.setName('cau_2')
        .setDescription('Đáp án cho câu 2')
        .setRequired(true)
        .addChoices(
          { name: 'A', value: 'A' },
          { name: 'B', value: 'B' },
          { name: 'C', value: 'C' },
          { name: 'D', value: 'D' }
        )
    )
    .addStringOption(opt =>
      opt.setName('cau_3')
        .setDescription('Đáp án cho câu 3')
        .setRequired(true)
        .addChoices(
          { name: 'A', value: 'A' },
          { name: 'B', value: 'B' },
          { name: 'C', value: 'C' },
          { name: 'D', value: 'D' }
        )
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const userId = interaction.user.id;
    const ans1 = interaction.options.getString('cau_1');
    const ans2 = interaction.options.getString('cau_2');
    const ans3 = interaction.options.getString('cau_3');

    if (!supabase) {
      return interaction.followUp({ content: '❌ Kết nối cơ sở dữ liệu chưa sẵn sàng.', ephemeral: true });
    }

    // 1. Fetch profile
    const { data: profile } = await supabase
      .from('profiles').select('id, full_name').eq('discord_id', userId).maybeSingle();

    if (!profile) {
      return interaction.followUp({ content: '❌ Bạn chưa liên kết tài khoản ExamHub. Vui lòng sử dụng `/lienket` trước.', ephemeral: true });
    }

    // 2. Fetch today's challenge
    const todayStr = new Date().toISOString().slice(0, 10);
    const { data: challenge } = await supabase
      .from('daily_challenges')
      .select('*')
      .eq('challenge_date', todayStr)
      .maybeSingle();

    if (!challenge) {
      return interaction.followUp({ content: '⚠️ Thách đấu hôm nay chưa được công bố. Vui lòng quay lại sau!', ephemeral: true });
    }

    // 3. Check if already submitted
    const { data: existingSub } = await supabase
      .from('daily_challenge_submissions')
      .select('id')
      .eq('daily_challenge_id', challenge.id)
      .eq('student_id', profile.id)
      .maybeSingle();

    if (existingSub) {
      return interaction.followUp({ content: '❌ Bạn đã nộp đáp án thử thách hôm nay rồi!', ephemeral: true });
    }

    // 4. Grade answers
    const studentAnswers = [ans1, ans2, ans3];
    let correctCount = 0;
    const explanationFields = [];

    challenge.questions.forEach((q, idx) => {
      const isCorrect = studentAnswers[idx] === q.correct_answer;
      if (isCorrect) correctCount++;
      
      explanationFields.push({
        name: `Câu ${idx + 1}: ${isCorrect ? '✅ Đúng' : '❌ Sai'} (Đáp án đúng: ${q.correct_answer})`,
        value: `📖 *Giải thích:* ${q.explanation || 'Không có giải thích.'}`
      });
    });

    const xpEarned = correctCount * 10; // 10 XP per correct answer

    try {
      // 5. Save submission
      await supabase.from('daily_challenge_submissions').insert({
        daily_challenge_id: challenge.id,
        student_id: profile.id,
        answers: studentAnswers,
        score: correctCount,
        xp_rewarded: xpEarned
      });

      // 6. Update student stats
      if (xpEarned > 0) {
        const { data: stats } = await supabase
          .from('student_stats')
          .select('xp, streak_days')
          .eq('user_id', profile.id)
          .maybeSingle();

        if (stats) {
          const newXp = (stats.xp || 0) + xpEarned;
          // Increment streak on perfect score
          const streakIncrement = correctCount === 3 ? 1 : 0;
          await supabase.from('student_stats').update({
            xp: newXp,
            streak_days: (stats.streak_days || 0) + streakIncrement
          }).eq('user_id', profile.id);
        }
      }

      // 7. Send Results Embed
      const resultEmbed = new EmbedBuilder()
        .setColor(correctCount === 3 ? 0x10B981 : 0x3B82F6)
        .setTitle(`🏁 KẾT QUẢ THỬ THÁCH HÀNG NGÀY`)
        .setDescription(`Học sinh: **${profile.full_name}**\nĐúng: **${correctCount}/3** câu\nXP nhận được: **+${xpEarned} XP** ${correctCount === 3 ? '🔥 (Perfect +1 Ngày Streak!)' : ''}`)
        .addFields(explanationFields)
        .setTimestamp();

      await interaction.followUp({ embeds: [resultEmbed], ephemeral: true });

    } catch (err) {
      console.error('[DAILY SUBMISSION ERROR]', err);
      await interaction.followUp({ content: `❌ Lỗi khi lưu kết quả: ${err.message}`, ephemeral: true });
    }
  }
};

/**
 * Daily challenge generator and auto-poster scheduler
 */
async function startDailyScheduler(client) {
  // Check every 10 minutes
  setInterval(async () => {
    try {
      const now = new Date();
      
      // Auto-post only at 7:00 AM (between 7:00 and 7:15)
      if (now.getHours() !== 7 || now.getMinutes() > 15) return;
      
      const todayStr = now.toISOString().slice(0, 10);
      if (lastPostedDate === todayStr) return; // Already posted today

      if (!supabase) return;

      console.log(`[DAILY SCHEDULER] Running daily challenge check for ${todayStr}...`);

      // 1. Get or create today's questions
      let challenge;
      const { data: existingChallenge } = await supabase
        .from('daily_challenges')
        .select('*')
        .eq('challenge_date', todayStr)
        .maybeSingle();

      if (existingChallenge) {
        challenge = existingChallenge;
      } else {
        // Generate via AI
        console.log('[DAILY SCHEDULER] Generating new daily questions via Gemini...');
        const prompt = `Tạo đúng 3 câu hỏi trắc nghiệm ngắn gọn tổng hợp kiến thức THPT (Toán, Vật lý, Hóa học - mỗi môn 1 câu, mỗi câu có 4 đáp án A, B, C, D).
Trả về duy nhất định dạng JSON Object (không bọc trong tag code block) theo cấu trúc dưới đây:
{
  "questions": [
    {
      "content": "Nội dung câu hỏi môn...",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "correct_answer": "A",
      "explanation": "..."
    }
  ]
}`;
        const aiResponse = await askGemini([{ role: 'user', content: prompt }], '', 0.4);
        let cleaned = aiResponse.trim();
        if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
        if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
        if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
        cleaned = cleaned.trim();
        
        const startIdx = cleaned.indexOf('{');
        const endIdx = cleaned.lastIndexOf('}');
        if (startIdx !== -1 && endIdx !== -1) {
          cleaned = cleaned.substring(startIdx, endIdx + 1);
        }
        
        const data = JSON.parse(cleaned);
        
        const { data: newChallenge, error: insErr } = await supabase
          .from('daily_challenges')
          .insert({
            challenge_date: todayStr,
            questions: data.questions
          })
          .select('*')
          .single();

        if (insErr) throw insErr;
        challenge = newChallenge;
      }

      // 2. Post to Announce Channel
      if (!ANNOUNCE_CHANNEL_ID) {
        console.warn('[DAILY SCHEDULER] Warning: ANNOUNCE_CHANNEL_ID is not configured.');
        lastPostedDate = todayStr;
        return;
      }

      const channel = await client.channels.fetch(ANNOUNCE_CHANNEL_ID).catch(() => null);
      if (channel) {
        const embed = new EmbedBuilder()
          .setColor(0xF59E0B)
          .setTitle(`☀️ THỬ THÁCH HÀNG NGÀY: NGÀY ${now.toLocaleDateString('vi-VN')}`)
          .setDescription('Nhận tối đa **30 XP** và **+1 Ngày Streak** bằng cách trả lời đúng cả 3 câu hỏi dưới đây!\n*Sử dụng lệnh `/daily` để nộp đáp án của bạn.*')
          .setTimestamp();

        challenge.questions.forEach((q, idx) => {
          embed.addFields({
            name: `Câu ${idx + 1}: ${q.content}`,
            value: q.options.join('\n'),
            inline: false
          });
        });

        await channel.send({ embeds: [embed] });
        console.log(`[DAILY SCHEDULER] Successfully posted daily challenge for ${todayStr}.`);
        lastPostedDate = todayStr;
      }

    } catch (err) {
      console.error('[DAILY SCHEDULER ERROR]', err.message);
    }
  }, 600000); // 10 minutes check
}

module.exports.startDailyScheduler = startDailyScheduler;
