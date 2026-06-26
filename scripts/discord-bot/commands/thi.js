/**
 * /thi — Xem danh sách đề thi đang mở trên ExamHub
 */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const supabase = require('../utils/supabase');
const { BASE_URL } = require('../utils/constants');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('thi')
    .setDescription('Xem danh sách đề thi đang mở trên ExamHub'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    if (!supabase) {
      return interaction.followUp({ content: '❌ Cơ sở dữ liệu chưa sẵn sàng.', ephemeral: true });
    }

    const { data: exams, error: exErr } = await supabase
      .from('exams')
      .select('id, title, duration, total_questions, subject')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(5);

    if (exErr || !exams || exams.length === 0) {
      return interaction.followUp({ content: '📭 Hiện chưa có đề thi nào đang mở.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor(0x6366F1)
      .setTitle('📝 ĐỀ THI ĐANG MỞ TRÊN EXAMHUB')
      .setDescription('Nhấn vào tiêu đề đề thi dưới đây để làm bài:')
      .setTimestamp();

    exams.forEach(e => {
      embed.addFields({
        name: `📝 ${e.title}`,
        value: `Môn: **${e.subject || 'Chung'}** · ${e.total_questions || 0} câu · ${e.duration || 60} phút\n🔗 [Vào làm bài thi ngay tại đây](${BASE_URL}/student/exams/${e.id})`,
        inline: false
      });
    });

    await interaction.followUp({ embeds: [embed], ephemeral: true });
  }
};
