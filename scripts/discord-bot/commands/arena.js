/**
 * /arena — Tạo phòng thi đấu Arena (GV only)
 */
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, PermissionFlagsBits } = require('discord.js');
const supabase = require('../utils/supabase');
const { BASE_URL, CLASS_TEXT_CHANNEL_ID, ARENA_CHANNEL_ID } = require('../utils/constants');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('arena')
    .setDescription('Tạo phòng thi đấu Arena trên Discord')
    .addStringOption(opt => opt.setName('ten_de').setDescription('Từ khóa tên đề thi cần tìm').setRequired(true))
    .addRoleOption(opt => opt.setName('tag_lop').setDescription('Tag role lớp học để ping thông báo').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    if (!interaction.memberPermissions.has(PermissionFlagsBits.ModerateMembers)) {
      return interaction.reply({ content: '❌ Bạn không có quyền thực hiện lệnh này.', ephemeral: true });
    }

    await interaction.deferReply();
    const ten_de = interaction.options.getString('ten_de');
    const tag_lop = interaction.options.getRole('tag_lop');

    if (!supabase) {
      return interaction.followUp({ content: '❌ Cơ sở dữ liệu chưa sẵn sàng.' });
    }

    const { data: exams, error: searchErr } = await supabase
      .from('exams').select('id, title, duration, total_questions, subject').ilike('title', `%${ten_de}%`).limit(5);

    if (searchErr || !exams || exams.length === 0) {
      return interaction.followUp({ content: `❌ Không tìm thấy đề thi nào chứa từ khóa **${ten_de}**` });
    }

    if (exams.length === 1) {
      await executeCreateArena(interaction, exams[0], tag_lop);
    } else {
      const options = exams.map(e => ({
        label: e.title.substring(0, 100),
        description: `Môn: ${e.subject || 'Chung'} · ${e.total_questions} câu · ${e.duration}p`,
        value: `arena_create_${e.id}_${tag_lop ? tag_lop.id : 'none'}`
      }));

      const selectMenu = {
        type: 3, custom_id: `arena_select_menu_${interaction.user.id}`,
        placeholder: 'Chọn đề thi muốn tổ chức Arena...', options
      };

      const actionRow = new ActionRowBuilder().addComponents(selectMenu);
      await interaction.followUp({ content: '📝 Tìm thấy nhiều đề thi khớp. Vui lòng chọn đề bên dưới:', components: [actionRow] });
    }
  }
};

async function executeCreateArena(interactionOrSelect, exam, tagLop, teacherProfileId = null) {
  const authorId = interactionOrSelect.user.id;

  let profileId = teacherProfileId;
  if (!profileId) {
    const { data: profile } = await supabase
      .from('profiles').select('id').eq('discord_id', authorId).maybeSingle();

    if (!profile) {
      const msg = '❌ Bạn chưa liên kết tài khoản ExamHub. Vui lòng chạy lệnh **/lienket** trước.';
      if (interactionOrSelect.isRepliable()) await interactionOrSelect.followUp({ content: msg });
      return;
    }
    profileId = profile.id;
  }

  const start = new Date();
  const end = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const { data: session, error: insertError } = await supabase
    .from('arena_sessions')
    .insert({
      name: `Đấu trường Arena: ${exam.title}`,
      description: `Đấu trường được mở trực tiếp từ Discord bởi Giáo viên`,
      exam_id: exam.id,
      subject: exam.subject || 'other',
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      duration: exam.duration || 60,
      status: 'active',
      created_by: profileId
    })
    .select().single();

  if (insertError) {
    console.error('Error inserting arena session:', insertError);
    const msg = '❌ Lỗi hệ thống khi tạo đợt Arena trong cơ sở dữ liệu.';
    if (interactionOrSelect.isRepliable()) await interactionOrSelect.followUp({ content: msg });
    return;
  }

  const sessionUrl = `${BASE_URL}/arena/${session.id}`;
  const mention = tagLop ? `<@&${tagLop.id}>` : '@everyone';

  const embed = new EmbedBuilder()
    .setColor(0xEF4444)
    .setTitle('⚔️ ĐẤU TRƯỜNG ARENA ĐÃ MỞ!')
    .setDescription(`**${exam.title}**\nPhòng thi đấu Arena đã được kích hoạt thành công bởi Giáo viên!`)
    .setURL(sessionUrl)
    .addFields(
      { name: '🎯 Tham gia thi đấu', value: `[Nhấn vào đây để vào phòng thi](${sessionUrl})`, inline: false },
      { name: '❓ Số câu hỏi', value: `${exam.total_questions || 0} câu`, inline: true },
      { name: '⏱️ Thời gian làm bài', value: `${exam.duration || 60} phút`, inline: true }
    )
    .setTimestamp()
    .setFooter({ text: '⚡ Thi đấu realtime — ai làm nhanh và đúng nhiều nhất sẽ thắng!' });

  const arenaChannelId = ARENA_CHANNEL_ID || CLASS_TEXT_CHANNEL_ID;
  let announceSent = false;

  if (arenaChannelId) {
    const channel = interactionOrSelect.client.channels.cache.get(arenaChannelId);
    if (channel && channel.isTextBased()) {
      await channel.send({ content: `${mention} ⚔️ Đấu trường Arena mới đang mở!`, embeds: [embed] }).catch(() => null);
      announceSent = true;
    }
  }

  const replyMsg = `✅ Đã tạo đấu trường **${exam.title}** thành công! ${announceSent ? 'Đã gửi thông báo đến kênh Arena.' : 'Chưa cấu hình kênh thông báo Arena.'}`;

  if (interactionOrSelect.isRepliable()) {
    if (interactionOrSelect.deferred || interactionOrSelect.replied) {
      await interactionOrSelect.editReply({ content: replyMsg, components: [] });
    } else {
      await interactionOrSelect.reply({ content: replyMsg });
    }
  }
}

module.exports.executeCreateArena = executeCreateArena;
