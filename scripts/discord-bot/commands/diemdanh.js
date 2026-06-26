/**
 * /diemdanh — Điểm danh nhận thưởng XP hàng ngày
 */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const { BASE_URL, DISCORD_SYNC_SECRET } = require('../utils/constants');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('diemdanh')
    .setDescription('Điểm danh nhận thưởng XP hàng ngày'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const userId = interaction.user.id;

    try {
      const response = await axios.post(`${BASE_URL}/api/discord/daily-checkin`, {
        discord_id: userId,
        secret_token: DISCORD_SYNC_SECRET
      });

      const result = response.data;

      if (result.already_checked) {
        const embed = new EmbedBuilder()
          .setColor(0xF59E0B)
          .setTitle('✅ Bạn đã điểm danh hôm nay!')
          .setDescription(`Bạn đã nhận phần thưởng điểm danh hàng ngày rồi.\nStreak hiện tại: 🔥 **${result.streak} ngày**`)
          .setTimestamp()
          .setFooter({ text: 'ECODEx Learning System' });
        return interaction.followUp({ embeds: [embed], ephemeral: true });
      }

      const level = result.level || 1;
      const xp = result.xp || 0;
      const nextLevelXp = result.next_level_xp || 100;
      const prevLevelXp = Math.pow(level - 1, 2) * 100;
      const percent = Math.min(Math.max(((xp - prevLevelXp) / (nextLevelXp - prevLevelXp)) * 100, 0), 100);

      const barFilled = Math.round(percent / 10);
      const bar = '█'.repeat(barFilled) + '░'.repeat(Math.max(10 - barFilled, 0));

      const embed = new EmbedBuilder()
        .setColor(0x10B981)
        .setTitle('🎉 ĐIỂM DANH THÀNH CÔNG!')
        .setDescription(`Cảm ơn bạn đã tự giác điểm danh hôm nay!`)
        .addFields(
          { name: 'XP nhận được', value: `**+${result.xp_earned} XP**`, inline: true },
          { name: 'Chuỗi ngày (Streak)', value: `🔥 **${result.streak} ngày**`, inline: true }
        );

      if (result.newAchievements && result.newAchievements.length > 0) {
        embed.addFields({ name: '🏆 Thành tựu mới mở khóa', value: result.newAchievements.map(a => `• **${a}**`).join('\n') + `\n(Thưởng thêm **+${result.achievementXp} XP**!)`, inline: false });
      }

      embed.addFields(
        { name: `Cấp độ hiện tại: Level ${level}`, value: `\`${bar}\` ${Math.round(percent)}%\nXP: **${xp} / ${nextLevelXp}**`, inline: false }
      )
      .setTimestamp()
      .setFooter({ text: 'ECODEx Gamification System' });

      await interaction.followUp({ embeds: [embed], ephemeral: true });
    } catch (err) {
      console.error('Checkin command error:', err.response?.data || err.message);
      const errMsg = err.response?.data?.error || 'Có lỗi xảy ra khi thực hiện điểm danh. Bạn đã liên kết tài khoản chưa?';
      await interaction.followUp({ content: `❌ ${errMsg}`, ephemeral: true });
    }
  }
};
