/**
 * /topstudy — Bảng xếp hạng học tập chăm chỉ trong tuần
 */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const { BASE_URL, DISCORD_SYNC_SECRET } = require('../utils/constants');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('topstudy')
    .setDescription('Xem bảng xếp hạng học tập chăm chỉ trong tuần'),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      const resp = await axios.get(`${BASE_URL}/api/study-sessions/top-weekly`, {
        headers: { 'Authorization': `Bearer ${DISCORD_SYNC_SECRET}` }
      }).catch(err => {
        console.error('[TOPSTUDY FETCH ERROR]', err.message);
        return null;
      });

      const topList = resp?.data?.top_list || [];

      if (!topList || topList.length === 0) {
        return interaction.editReply('📭 Chưa ghi nhận thời gian tự học nào của học sinh trong tuần này.');
      }

      const embed = new EmbedBuilder()
        .setColor(0xF59E0B)
        .setTitle('🏆 BẢNG XẾP HẠNG HỌC TẬP CHĂM CHỈ (TUẦN NÀY)')
        .setDescription('Tổng hợp thời gian tự học hợp lệ của học sinh trên Discord tính từ Thứ 2 đầu tuần.')
        .setTimestamp()
        .setFooter({ text: 'ECODEx Learning System' });

      const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
      let descriptionText = '';

      topList.forEach((item, index) => {
        const medal = medals[index] || '👤';
        const hours = (item.total_seconds / 3600).toFixed(1);
        descriptionText += `${medal} **${item.full_name}** (${item.class || 'Chưa rõ lớp'}): **${hours} giờ** học\n`;
      });

      embed.setDescription(descriptionText || 'Chưa có dữ liệu.');
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('[TOPSTUDY ERROR]', error.message);
      await interaction.editReply('❌ Không thể lấy bảng xếp hạng tuần lúc này. Vui lòng thử lại sau.');
    }
  }
};
