/**
 * /alert-ping — Ping nhắc nhở học sinh công khai trong kênh chat
 */
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { CLASS_TEXT_CHANNEL_ID } = require('../utils/constants');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('alert-ping')
    .setDescription('Ping nhắc nhở học sinh công khai trong kênh chat')
    .addUserOption(option =>
      option.setName('student').setDescription('Học sinh nhận nhắc nhở').setRequired(true))
    .addStringOption(option =>
      option.setName('message').setDescription('Nội dung tin nhắn nhắc nhở').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    if (!interaction.memberPermissions.has(PermissionFlagsBits.ModerateMembers)) {
      return interaction.reply({ content: '❌ Bạn không có quyền thực hiện lệnh này (yêu cầu quyền Moderate Members).', ephemeral: true });
    }

    const studentUser = interaction.options.getUser('student');
    const messageText = interaction.options.getString('message');

    try {
      let targetChannel = interaction.channel;

      if (CLASS_TEXT_CHANNEL_ID) {
        const configuredChannel = interaction.client.channels.cache.get(CLASS_TEXT_CHANNEL_ID);
        if (configuredChannel && configuredChannel.isTextBased()) {
          targetChannel = configuredChannel;
        }
      }

      if (!targetChannel) {
        return interaction.reply({ content: '❌ Không tìm thấy kênh chat để ping.', ephemeral: true });
      }

      await targetChannel.send(`<@${studentUser.id}> ${messageText}`);
      await interaction.reply({ content: `✅ Đã ping nhắc nhở thành công học sinh **${studentUser.username}** trong kênh <#${targetChannel.id}>.`, ephemeral: true });
      console.log(`[PING SENT] ${interaction.user.username} pinged ${studentUser.username} in #${targetChannel.name}: "${messageText}"`);
    } catch (error) {
      await interaction.reply({ content: `❌ Không thể gửi tin nhắn ping: ${error.message}`, ephemeral: true });
    }
  }
};
