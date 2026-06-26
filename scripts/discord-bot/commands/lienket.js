/**
 * /lienket — Liên kết tài khoản Discord với ExamHub
 */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const supabase = require('../utils/supabase');
const { BASE_URL } = require('../utils/constants');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lienket')
    .setDescription('Liên kết tài khoản Discord của bạn với tài khoản ExamHub'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const userId = interaction.user.id;
    const discordUsername = interaction.user.username;

    if (!supabase) {
      return interaction.followUp({ content: '❌ Kết nối cơ sở dữ liệu chưa sẵn sàng.', ephemeral: true });
    }

    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('discord_id', userId)
      .maybeSingle();

    if (existingProfile) {
      const embed = new EmbedBuilder()
        .setColor(0x10B981)
        .setTitle('✅ Đã liên kết rồi!')
        .setDescription(`Tài khoản Discord này đã liên kết với học sinh **${existingProfile.full_name}** trên ExamHub.`)
        .setTimestamp();
      return interaction.followUp({ embeds: [embed], ephemeral: true });
    }

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let token = '';
    for (let i = 0; i < 8; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const { error: insertError } = await supabase
      .from('discord_link_tokens')
      .insert({ token, discord_id: userId, discord_username: discordUsername, expires_at: expiresAt });

    if (insertError) {
      console.error('Failed to create link token:', insertError);
      return interaction.followUp({ content: '❌ Lỗi hệ thống khi tạo mã xác thực. Vui lòng thử lại sau.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor(0x7C3AED)
      .setTitle('🔗 LIÊN KẾT TÀI KHOẢN EXAMHUB')
      .setDescription('Vui lòng làm theo hướng dẫn dưới đây để hoàn tất liên kết tài khoản:')
      .addFields(
        { name: 'Mã xác thực của bạn (nhấp để copy)', value: `\`\`\`${token}\`\`\``, inline: false },
        { name: 'Các bước tiếp theo', value: `1. Vào trang web ExamHub: [Bấm vào đây](${BASE_URL}/settings/discord)\n2. Nhập mã xác thực ở trên\n3. Nhấn **Xác nhận liên kết**`, inline: false }
      )
      .setFooter({ text: '⚠️ Mã xác thực sẽ hết hạn sau 10 phút.' })
      .setTimestamp();

    await interaction.followUp({ embeds: [embed], ephemeral: true });
  }
};
