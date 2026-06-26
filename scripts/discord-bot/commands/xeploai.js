/**
 * /xeploai — Bảng xếp hạng XP học tập cao nhất
 */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const supabase = require('../utils/supabase');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('xeploai')
    .setDescription('Xem bảng xếp hạng XP học tập cao nhất toàn Server'),

  async execute(interaction) {
    await interaction.deferReply();

    if (!supabase) {
      return interaction.followUp({ content: '❌ Cơ sở dữ liệu chưa sẵn sàng.' });
    }

    const { data: leaderboard, error: leadError } = await supabase
      .from('student_stats')
      .select('xp, level, profile:profiles(full_name)')
      .order('xp', { ascending: false })
      .limit(10);

    if (leadError || !leaderboard || leaderboard.length === 0) {
      return interaction.followUp({ content: '📭 Chưa có dữ liệu bảng xếp hạng XP.' });
    }

    const embed = new EmbedBuilder()
      .setColor(0xF59E0B)
      .setTitle('🏆 BẢNG XẾP HẠNG XP HỌC TẬP')
      .setDescription('Danh sách học sinh tích lũy nhiều XP nhất từ học tập và thi cử.')
      .setTimestamp()
      .setFooter({ text: 'ECODEx Gamification System' });

    const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    let desc = '';

    leaderboard.forEach((item, index) => {
      const profile = Array.isArray(item.profile) ? item.profile[0] : item.profile;
      const name = profile?.full_name || 'Học sinh';
      const medal = medals[index] || '👤';
      desc += `${medal} **${index + 1}.** ${name} — Level **${item.level}** · **${(item.xp || 0).toLocaleString()}** XP\n`;
    });

    embed.setDescription(desc || 'Không có dữ liệu.');
    await interaction.followUp({ embeds: [embed] });
  }
};
