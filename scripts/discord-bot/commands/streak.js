/**
 * /streak — Xem chuỗi ngày học liên tiếp
 */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const { activeSessions } = require('../utils/sessions');
const { BASE_URL } = require('../utils/constants');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('streak')
    .setDescription('Xem chuỗi ngày học liên tiếp của bạn'),

  async execute(interaction) {
    const userId = interaction.user.id;
    try {
      const resp = await axios.get(`${BASE_URL}/api/study-sessions/discord-heatmap`, {
        params: { student_id: userId }
      }).catch(() => null);

      const session = activeSessions.get(userId);
      let streakValue = resp?.data?.streak || 0;

      const embed = new EmbedBuilder()
        .setColor(0x6366F1)
        .setTitle('🔥 Chuỗi ngày học')
        .setDescription(streakValue > 0
          ? `Bạn đã học liên tiếp **${streakValue} ngày**! Tiếp tục duy trì nhé! 💪`
          : 'Bạn chưa có chuỗi ngày học nào. Hãy bắt đầu ngay hôm nay!')
        .setTimestamp();

      if (session) {
        let currentDuration = session.durationOffset;
        if (!session.deafened) {
          currentDuration += Math.floor((Date.now() - session.joinedAt) / 1000);
        }
        embed.addFields({ name: 'Hôm nay', value: `${Math.round(currentDuration / 60)} phút`, inline: true });
      }

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (err) {
      await interaction.reply({ content: '❌ Không thể lấy thông tin streak.', ephemeral: true });
    }
  }
};
