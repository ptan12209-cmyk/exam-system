/**
 * /hocsinh — Xem profile chi tiết một học sinh (GV only)
 * Subcommands: info, list, export
 */
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const supabase = require('../utils/supabase');
const { BASE_URL } = require('../utils/constants');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('hocsinh')
    .setDescription('Quản lý & xem profile học sinh')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand(sub => sub.setName('info').setDescription('Xem profile chi tiết một học sinh')
      .addUserOption(opt => opt.setName('student').setDescription('Học sinh cần xem profile').setRequired(true)))
    .addSubcommand(sub => sub.setName('list').setDescription('Danh sách tất cả học sinh đã liên kết')
      .addStringOption(opt => opt.setName('lop').setDescription('Lọc theo lớp (hoặc TSTD)').setRequired(false)))
    .addSubcommand(sub => sub.setName('export').setDescription('Xuất danh sách học sinh ra file CSV')),

  async execute(interaction) {
    if (!interaction.memberPermissions.has(PermissionFlagsBits.ModerateMembers)) {
      return interaction.reply({ content: '❌ Bạn không có quyền thực hiện lệnh này.', ephemeral: true });
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'info') return handleInfo(interaction);
    if (subcommand === 'list') return handleList(interaction);
    if (subcommand === 'export') return handleExport(interaction);
  }
};

async function handleInfo(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const targetMember = interaction.options.getMember('student');

  if (!supabase) {
    return interaction.followUp({ content: '❌ Cơ sở dữ liệu chưa sẵn sàng.', ephemeral: true });
  }

  const { data: profile, error: pErr } = await supabase
    .from('profiles').select('id, full_name, class').eq('discord_id', targetMember.id).maybeSingle();

  if (pErr || !profile) {
    return interaction.followUp({ content: `❌ Học sinh **${targetMember.user.username}** chưa liên kết tài khoản ExamHub.`, ephemeral: true });
  }

  const { data: stats } = await supabase
    .from('student_stats')
    .select('xp, level, streak_days, exams_completed, perfect_scores')
    .eq('user_id', profile.id).maybeSingle();

  const { data: logs } = await supabase
    .from('discord_attendance_logs')
    .select('total_active_seconds, total_afk_seconds')
    .eq('student_id', profile.id);

  let totalActiveSecs = 0, totalAfkSecs = 0;
  if (logs) {
    logs.forEach(l => {
      totalActiveSecs += l.total_active_seconds || 0;
      totalAfkSecs += l.total_afk_seconds || 0;
    });
  }

  const embed = new EmbedBuilder()
    .setColor(0x6366F1)
    .setTitle(`👤 Hồ sơ: ${profile.full_name}`)
    .setDescription(`Lớp: **${profile.class || 'Chưa rõ'}** · Discord: @${targetMember.user.username}`)
    .setThumbnail(targetMember.user.displayAvatarURL())
    .addFields(
      { name: '⭐ Level', value: `**Level ${stats?.level || 1}**`, inline: true },
      { name: '✨ Tổng XP', value: `**${(stats?.xp || 0).toLocaleString()} XP**`, inline: true },
      { name: '🔥 Streak', value: `**${stats?.streak_days || 0} ngày**`, inline: true },
      { name: '📝 Đề đã làm', value: `**${stats?.exams_completed || 0} đề**`, inline: true },
      { name: '💯 Điểm 10', value: `**${stats?.perfect_scores || 0} lần**`, inline: true },
      { name: '⏱️ Học Voice', value: `**${(totalActiveSecs / 3600).toFixed(1)}h** (AFK: ${Math.round(totalAfkSecs / 60)}p)`, inline: true },
      { name: '🔗 Xem chi tiết', value: `[Trang cá nhân](${BASE_URL}/student/profile/${profile.id})`, inline: false }
    )
    .setTimestamp();

  await interaction.followUp({ embeds: [embed], ephemeral: true });
}

async function handleList(interaction) {
  await interaction.deferReply({ ephemeral: true });

  if (!supabase) {
    return interaction.followUp({ content: '❌ Cơ sở dữ liệu chưa sẵn sàng.', ephemeral: true });
  }

  const lopFilter = interaction.options.getString('lop');
  let query = supabase.from('profiles').select('full_name, class, discord_id, email').eq('role', 'student');

  if (lopFilter) {
    if (lopFilter.toUpperCase() === 'TSTD') {
      query = query.eq('class', 'TSTD');
    } else {
      query = query.eq('class', lopFilter);
    }
  }

  const { data: students, error } = await query.order('class').order('full_name');

  if (error || !students || students.length === 0) {
    return interaction.followUp({ content: `📭 Không tìm thấy học sinh nào ${lopFilter ? `thuộc lớp **${lopFilter}**` : ''}.`, ephemeral: true });
  }

  // Paginate: 10 students per page
  const pageSize = 10;
  const totalPages = Math.ceil(students.length / pageSize);
  const page = 0;

  const embed = buildListEmbed(students, page, pageSize, totalPages, lopFilter);
  const row = buildListButtons(page, totalPages, interaction.user.id);

  await interaction.followUp({ embeds: [embed], components: totalPages > 1 ? [row] : [], ephemeral: true });
}

function buildListEmbed(students, page, pageSize, totalPages, lopFilter) {
  const start = page * pageSize;
  const pageStudents = students.slice(start, start + pageSize);

  let desc = '';
  pageStudents.forEach((s, idx) => {
    const linkedIcon = s.discord_id ? '🔗' : '⚪';
    desc += `${start + idx + 1}. ${linkedIcon} **${s.full_name}** · Lớp: ${s.class || 'Chưa rõ'}\n`;
  });

  return new EmbedBuilder()
    .setColor(0x6366F1)
    .setTitle(`👥 Danh Sách Học Sinh ${lopFilter ? `Lớp ${lopFilter}` : '(Toàn bộ)'}`)
    .setDescription(desc || 'Trống')
    .setFooter({ text: `Trang ${page + 1}/${totalPages} · Tổng: ${students.length} học sinh` })
    .setTimestamp();
}

function buildListButtons(page, totalPages, userId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`hocsinh_list_prev_${page}_${userId}`).setLabel('◀ Trước').setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
    new ButtonBuilder().setCustomId(`hocsinh_list_next_${page}_${userId}`).setLabel('Tiếp ▶').setStyle(ButtonStyle.Secondary).setDisabled(page >= totalPages - 1)
  );
}

async function handleExport(interaction) {
  await interaction.deferReply({ ephemeral: true });

  if (!supabase) {
    return interaction.followUp({ content: '❌ Cơ sở dữ liệu chưa sẵn sàng.', ephemeral: true });
  }

  const { data: students, error } = await supabase
    .from('profiles')
    .select('full_name, email, class, discord_id, created_at')
    .eq('role', 'student')
    .order('class').order('full_name');

  if (error || !students || students.length === 0) {
    return interaction.followUp({ content: '📭 Không có dữ liệu học sinh để xuất.', ephemeral: true });
  }

  // Build CSV
  const header = 'STT,Họ tên,Email,Lớp,Discord ID,Ngày tạo\n';
  const rows = students.map((s, idx) =>
    `${idx + 1},"${s.full_name || ''}","${s.email || ''}","${s.class || ''}","${s.discord_id || ''}","${s.created_at ? new Date(s.created_at).toLocaleDateString('vi-VN') : ''}"`
  ).join('\n');

  const csvContent = '\uFEFF' + header + rows; // BOM for Excel UTF-8
  const buffer = Buffer.from(csvContent, 'utf-8');
  const attachment = new AttachmentBuilder(buffer, { name: `hocsinh_export_${new Date().toISOString().slice(0, 10)}.csv` });

  await interaction.followUp({
    content: `📊 Xuất **${students.length} học sinh** thành công!`,
    files: [attachment],
    ephemeral: true
  });
}

module.exports.buildListEmbed = buildListEmbed;
module.exports.buildListButtons = buildListButtons;
