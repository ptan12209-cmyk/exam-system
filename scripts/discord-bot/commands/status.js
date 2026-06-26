/**
 * /status — Xem trạng thái học tập hiện tại trên Discord
 */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { activeSessions, getMutedDuration, getSharingScreenDuration, getCameraDuration } = require('../utils/sessions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('Xem trạng thái học tập hiện tại của bạn trên Discord'),

  async execute(interaction) {
    const userId = interaction.user.id;
    const session = activeSessions.get(userId);
    if (!session) {
      return interaction.reply({ content: '❌ Bạn chưa tham gia kênh voice học tập.', ephemeral: true });
    }

    let currentDuration = session.durationOffset;
    if (!session.deafened) {
      currentDuration += Math.floor((Date.now() - session.joinedAt) / 1000);
    }
    const mutedTotal = getMutedDuration(session);
    const screenShareTotal = getSharingScreenDuration(session);
    const cameraTotal = getCameraDuration(session);
    const statusLabel = session.deafened ? '🔇 AFK / Tắt tiếng' : session.muted ? '🔕 Tắt mic' : '🎧 Đang học';

    const embed = new EmbedBuilder()
      .setColor(session.deafened ? 0xF59E0B : 0x10B981)
      .setTitle('📊 Trạng thái học Discord')
      .addFields(
        { name: 'Trạng thái', value: statusLabel, inline: true },
        { name: 'Thời gian học', value: `${Math.round(currentDuration / 60)} phút`, inline: true },
        { name: 'Thời gian tắt mic', value: `${Math.round(mutedTotal / 60)} phút`, inline: true },
        { name: 'Chia sẻ màn hình', value: `${session.sharingScreen ? '🟢 Đang bật' : '🔴 Đang tắt'} (${Math.round(screenShareTotal / 60)} phút)`, inline: true },
        { name: 'Webcam/Camera', value: `${session.cameraOn ? '🟢 Đang bật' : '🔴 Đang tắt'} (${Math.round(cameraTotal / 60)} phút)`, inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
