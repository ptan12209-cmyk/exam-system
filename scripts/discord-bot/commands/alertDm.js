/**
 * /alert-dm — Gửi nhắc nhở trực tiếp (DM) đến học sinh
 */
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('alert-dm')
    .setDescription('Gửi nhắc nhở trực tiếp (DM) đến học sinh qua Bot')
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
      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('📢 Nhắc nhở từ Giáo viên')
        .setDescription(messageText)
        .setTimestamp()
        .setFooter({ text: 'ECODEx Learning System' });

      await studentUser.send({ embeds: [embed] });
      await interaction.reply({ content: `✅ Đã gửi DM nhắc nhở thành công đến **${studentUser.username}**.`, ephemeral: true });
      console.log(`[DM SENT] ${interaction.user.username} sent DM to ${studentUser.username}: "${messageText}"`);
    } catch (error) {
      await interaction.reply({ content: `❌ Không thể gửi DM: ${error.message}`, ephemeral: true });
    }
  }
};
