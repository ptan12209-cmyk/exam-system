/**
 * /baocao — Xem báo cáo chuyên cần phòng học hôm nay (GV only)
 */
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const axios = require('axios');
const { BASE_URL, DISCORD_SYNC_SECRET } = require('../utils/constants');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('baocao')
    .setDescription('Xem báo cáo chuyên cần phòng học hôm nay')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    if (!interaction.memberPermissions.has(PermissionFlagsBits.ModerateMembers)) {
      return interaction.reply({ content: '❌ Bạn không có quyền thực hiện lệnh này.', ephemeral: true });
    }

    await interaction.deferReply();

    try {
      const response = await axios.get(`${BASE_URL}/api/discord/report`, {
        params: { secret_token: DISCORD_SYNC_SECRET }
      });

      const report = response.data;
      const dateFormatted = new Date(report.date).toLocaleDateString('vi-VN');

      const embed = new EmbedBuilder()
        .setColor(0x6366F1)
        .setTitle(`📋 BÁO CÁO CHUYÊN CẦN DISCORD — HÔM NAY (${dateFormatted})`)
        .addFields(
          { name: '👥 Học sinh tham gia', value: `**${report.active_students_count}**`, inline: true },
          { name: '⏱️ Học trung bình', value: `**${report.avg_duration_minutes} phút/phiên**`, inline: true },
          { name: '📝 Tổng số ca học', value: `**${report.total_sessions} ca**`, inline: true }
        );

      const students = report.students || [];
      if (students.length === 0) {
        embed.setDescription('📭 Chưa ghi nhận phiên tự học nào hôm nay.');
      } else {
        const listLines = students.map(s => {
          const activeH = (s.active_seconds / 3600).toFixed(1);
          const afkM = Math.round(s.afk_seconds / 60);
          const alertMarker = s.afk_violations > 0 ? '⚠️' : '✅';
          return `${alertMarker} **${s.full_name}**: **${activeH} giờ** học thực chất ${s.afk_violations > 0 ? `(AFK ${afkM}p)` : ''}`;
        });
        embed.setDescription(listLines.join('\n'));
      }

      await interaction.followUp({ embeds: [embed] });
    } catch (err) {
      console.error('Report command error:', err.response?.data || err.message);
      await interaction.followUp({ content: '❌ Không thể tải báo cáo từ máy chủ.', ephemeral: true });
    }
  }
};
