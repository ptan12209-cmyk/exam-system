/**
 * /xoacanhbao — Xóa toàn bộ tin nhắn cảnh báo trong kênh log
 */
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { TEACHER_LOG_CHANNEL_ID, CLASS_TEXT_CHANNEL_ID } = require('../utils/constants');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('xoacanhbao')
    .setDescription('Xóa toàn bộ tin nhắn cảnh báo trong các kênh học tập và kênh log')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });

      let totalDeleted = 0;
      const channelsToClean = [];
      if (TEACHER_LOG_CHANNEL_ID) channelsToClean.push({ id: TEACHER_LOG_CHANNEL_ID, cleanAll: true });
      if (CLASS_TEXT_CHANNEL_ID) channelsToClean.push({ id: CLASS_TEXT_CHANNEL_ID, cleanAll: false });

      for (const item of channelsToClean) {
        const channel = await interaction.client.channels.fetch(item.id).catch(() => null);
        if (!channel || !channel.isTextBased()) continue;

        // Fetch last 100 messages
        const messages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
        if (!messages || messages.size === 0) continue;

        // Filter messages to delete
        let toDelete;
        if (item.cleanAll) {
          // Clear everything in the dedicated teacher log channel
          toDelete = messages;
        } else {
          // In classroom text chat, only delete the bot's own warnings/announcements
          toDelete = messages.filter(m => m.author.id === interaction.client.user.id);
        }

        if (toDelete.size > 0) {
          try {
            // bulkDelete only supports messages under 14 days old
            const deleted = await channel.bulkDelete(toDelete, true);
            totalDeleted += deleted.size;

            // Delete remaining (older than 14 days) individually
            const remainingCount = toDelete.size - deleted.size;
            if (remainingCount > 0) {
              const oldMessages = toDelete.filter(m => !deleted.has(m.id));
              for (const m of oldMessages.values()) {
                await m.delete().catch(() => null);
                totalDeleted++;
              }
            }
          } catch (bulkErr) {
            // Fallback: Delete one by one if bulk delete fails entirely
            for (const m of toDelete.values()) {
              await m.delete().catch(() => null);
              totalDeleted++;
            }
          }
        }
      }

      await interaction.editReply(`✅ Đã dọn dẹp thành công **${totalDeleted}** tin nhắn cảnh báo trong hệ thống!`);
    } catch (error) {
      console.error('[XOACANHBAO ERROR]', error.message);
      await interaction.editReply('❌ Đã xảy ra lỗi khi thực hiện dọn dẹp tin nhắn cảnh báo.');
    }
  }
};
