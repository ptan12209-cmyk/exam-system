/**
 * /thongke — Xem thống kê học tập và thi cử (GV only)
 * Subcommands: bai, lop, diem
 */
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const supabase = require('../utils/supabase');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('thongke')
    .setDescription('Xem thống kê học tập và thi cử')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand(sub => sub.setName('bai').setDescription('Thống kê tổng quan đề thi')
      .addStringOption(opt => opt.setName('ten_de').setDescription('Từ khóa tên đề thi').setRequired(false)))
    .addSubcommand(sub => sub.setName('lop').setDescription('Thống kê lớp học (học sinh và thí sinh tự do)')
      .addStringOption(opt => opt.setName('lop').setDescription('Tên lớp học hoặc TSTD').setRequired(false)))
    .addSubcommand(sub => sub.setName('diem').setDescription('Danh sách điểm chi tiết của học sinh theo đề thi')
      .addStringOption(opt => opt.setName('ten_de').setDescription('Từ khóa tên đề thi').setRequired(true))),

  async execute(interaction) {
    if (!interaction.memberPermissions.has(PermissionFlagsBits.ModerateMembers)) {
      return interaction.reply({ content: '❌ Bạn không có quyền thực hiện lệnh này.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });
    const subcommand = interaction.options.getSubcommand();

    if (!supabase) {
      return interaction.followUp({ content: '❌ Cơ sở dữ liệu chưa sẵn sàng.', ephemeral: true });
    }

    if (subcommand === 'bai') {
      return handleBai(interaction);
    } else if (subcommand === 'lop') {
      return handleLop(interaction);
    } else if (subcommand === 'diem') {
      return handleDiem(interaction);
    }
  }
};

async function handleBai(interaction) {
  const ten_de = interaction.options.getString('ten_de');

  const { data: submissions, error: subError } = await supabase
    .from('submissions')
    .select('score, time_spent, exam:exams(title)');

  if (subError || !submissions || submissions.length === 0) {
    return interaction.followUp({ content: '📭 Chưa ghi nhận bài nộp nào trên hệ thống.', ephemeral: true });
  }

  let filteredSubmissions = submissions;
  if (ten_de) {
    filteredSubmissions = submissions.filter(s => s.exam?.title?.toLowerCase().includes(ten_de.toLowerCase()));
    if (filteredSubmissions.length === 0) {
      return interaction.followUp({ content: `📭 Không tìm thấy kết quả làm bài của đề thi có chứa từ khóa **${ten_de}**.`, ephemeral: true });
    }
  }

  const totalSubmissions = filteredSubmissions.length;
  const scores = filteredSubmissions.map(s => Number(s.score) || 0);
  const avgScore = scores.reduce((sum, s) => sum + s, 0) / totalSubmissions;
  const maxScore = Math.max(...scores);
  const minScore = Math.min(...scores);
  const avgTimeSpent = filteredSubmissions.reduce((sum, s) => sum + (s.time_spent || 0), 0) / totalSubmissions;

  const embed = new EmbedBuilder()
    .setColor(0x6366F1)
    .setTitle(`📊 Thống Kê Tổng Quan Đề Thi ${ten_de ? `(${ten_de})` : ''}`)
    .addFields(
      { name: '📝 Tổng bài nộp', value: `${totalSubmissions} bài`, inline: true },
      { name: '🎯 Điểm trung bình', value: `${avgScore.toFixed(1)}/10`, inline: true },
      { name: '⏱️ Thời gian TB', value: `${Math.round(avgTimeSpent / 60)} phút`, inline: true },
      { name: '🏆 Điểm cao nhất', value: `${maxScore.toFixed(1)}/10`, inline: true },
      { name: '📉 Điểm thấp nhất', value: `${minScore.toFixed(1)}/10`, inline: true }
    )
    .setTimestamp()
    .setFooter({ text: 'ECODEx Statistical Engine' });

  return interaction.followUp({ embeds: [embed], ephemeral: true });
}

async function handleLop(interaction) {
  const lopOption = interaction.options.getString('lop');

  let query = supabase.from('profiles').select('full_name, class, role').eq('role', 'student');

  if (lopOption) {
    if (lopOption.toUpperCase() === 'TSTD' || lopOption.toUpperCase() === 'THÍ SINH TỰ DO') {
      query = query.eq('class', 'TSTD');
    } else {
      query = query.eq('class', lopOption);
    }
  }

  const { data: students, error: err } = await query.order('class', { ascending: true });

  if (err || !students || students.length === 0) {
    return interaction.followUp({ content: `📭 Không tìm thấy học sinh nào ${lopOption ? `thuộc lớp **${lopOption}**` : ''}.`, ephemeral: true });
  }

  const hsLop = students.filter(s => s.class && s.class !== 'TSTD');
  const tstd = students.filter(s => s.class === 'TSTD');

  const embed = new EmbedBuilder()
    .setColor(0x10B981)
    .setTitle(`👥 Thống Kê Học Sinh ${lopOption ? `Lớp ${lopOption}` : '(Toàn bộ)'}`)
    .addFields(
      { name: '👤 Học sinh theo lớp', value: `${hsLop.length} học sinh`, inline: true },
      { name: '🎓 Thí sinh tự do (TSTD)', value: `${tstd.length} thí sinh`, inline: true }
    )
    .setTimestamp();

  let desc = '';
  if (hsLop.length > 0) {
    desc += `**HỌC SINH THEO LỚP:**\n`;
    hsLop.forEach((s, idx) => { desc += `${idx + 1}. **${s.full_name}** (${s.class || 'Chưa rõ'})\n`; });
  }
  if (tstd.length > 0) {
    if (desc) desc += '\n';
    desc += `**THÍ SINH TỰ DO (TSTD):**\n`;
    tstd.forEach((s, idx) => { desc += `${idx + 1}. **${s.full_name}**\n`; });
  }

  if (desc.length > 4000) desc = desc.substring(0, 3990) + '\n...(Còn tiếp)';
  embed.setDescription(desc || 'Không có dữ liệu chi tiết.');

  return interaction.followUp({ embeds: [embed], ephemeral: true });
}

async function handleDiem(interaction) {
  const ten_de = interaction.options.getString('ten_de');

  const { data: exams, error: exErr } = await supabase
    .from('exams').select('id, title').ilike('title', `%${ten_de}%`).limit(5);

  if (exErr || !exams || exams.length === 0) {
    return interaction.followUp({ content: `❌ Không tìm thấy đề thi nào khớp với từ khóa **${ten_de}**`, ephemeral: true });
  }

  const targetExam = exams[0];

  const { data: submissions, error: subError } = await supabase
    .from('submissions')
    .select('score, submitted_at, time_spent, profile:profiles(full_name, class)')
    .eq('exam_id', targetExam.id);

  if (subError || !submissions || submissions.length === 0) {
    return interaction.followUp({ content: `📭 Chưa ghi nhận bài nộp nào cho đề thi **${targetExam.title}**.`, ephemeral: true });
  }

  const studentBestMap = new Map();
  submissions.forEach(sub => {
    const studentName = sub.profile?.full_name || 'Học sinh';
    const studentClass = sub.profile?.class || 'Chưa rõ';
    const key = `${studentName} (${studentClass})`;
    const score = Number(sub.score) || 0;
    if (!studentBestMap.has(key) || score > studentBestMap.get(key).score) {
      studentBestMap.set(key, { score, timeSpent: sub.time_spent });
    }
  });

  const embed = new EmbedBuilder()
    .setColor(0xF59E0B)
    .setTitle(`💯 Điểm Chi Tiết: ${targetExam.title}`)
    .setDescription(`Tổng hợp điểm số cao nhất của từng học sinh:`)
    .setTimestamp();

  let desc = '';
  let idx = 1;
  for (const [studentInfo, data] of studentBestMap.entries()) {
    desc += `${idx}. **${studentInfo}**: **${data.score.toFixed(1)} / 10** (${Math.round((data.timeSpent || 0) / 60)} phút)\n`;
    idx++;
  }

  if (exams.length > 1) {
    desc += `\n*⚠️ Lưu ý: Có ${exams.length} đề thi khớp với từ khóa. Đang hiển thị điểm của đề "${targetExam.title}".*`;
  }

  if (desc.length > 4000) desc = desc.substring(0, 3990) + '\n...(Còn tiếp)';
  embed.setDescription(desc || 'Không có dữ liệu.');

  return interaction.followUp({ embeds: [embed], ephemeral: true });
}
