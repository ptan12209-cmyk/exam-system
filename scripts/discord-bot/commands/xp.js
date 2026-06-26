/**
 * /xp — Xem cấp độ, điểm kinh nghiệm và tiến trình học tập
 */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const supabase = require('../utils/supabase');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('xp')
    .setDescription('Xem cấp độ, điểm kinh nghiệm và tiến trình học tập của bạn'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const userId = interaction.user.id;

    if (!supabase) {
      return interaction.followUp({ content: '❌ Cơ sở dữ liệu chưa sẵn sàng.', ephemeral: true });
    }

    const { data: profile } = await supabase
      .from('profiles').select('id, full_name').eq('discord_id', userId).maybeSingle();

    if (!profile) {
      return interaction.followUp({ content: '❌ Bạn chưa liên kết tài khoản! Sử dụng lệnh **/lienket** nhé.', ephemeral: true });
    }

    const { data: stats } = await supabase
      .from('student_stats').select('xp, level').eq('user_id', profile.id).maybeSingle();

    const level = stats?.level || 1;
    const xp = stats?.xp || 0;
    const nextLevelXp = Math.pow(level, 2) * 100;
    const prevLevelXp = Math.pow(level - 1, 2) * 100;
    const percent = Math.min(Math.max(((xp - prevLevelXp) / (nextLevelXp - prevLevelXp)) * 100, 0), 100);

    const barFilled = Math.round(percent / 10);
    const bar = '█'.repeat(barFilled) + '░'.repeat(Math.max(10 - barFilled, 0));

    const embed = new EmbedBuilder()
      .setColor(0xF59E0B)
      .setTitle(`⭐ Cấp độ học tập: ${profile.full_name}`)
      .setDescription(`Cấp độ hiện tại: **Level ${level}**`)
      .addFields(
        { name: 'Kinh nghiệm (XP)', value: `**${xp.toLocaleString()} XP**`, inline: true },
        { name: 'Cần thêm lên cấp', value: `**${(nextLevelXp - xp).toLocaleString()} XP**`, inline: true },
        { name: `Tiến độ lên Level ${level + 1}`, value: `\`${bar}\` ${Math.round(percent)}%`, inline: false }
      )
      .setTimestamp()
      .setFooter({ text: 'ECODEx Gamification System' });

    await interaction.followUp({ embeds: [embed], ephemeral: true });
  }
};
