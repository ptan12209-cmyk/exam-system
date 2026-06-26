/**
 * /taode — Tạo đề thi qua Discord Modal (GV only)
 * Phase A2: Exam Builder via Discord Modal
 * 
 * Flow:
 * 1. /taode → Opens Modal Step 1 (exam info)
 * 2. Submit Step 1 → Buttons to add questions
 * 3. "Thêm câu" → Opens Modal Step 2 (question + 4 options + answer)
 * 4. Submit Step 2 → Buttons: [Thêm câu nữa] [Preview] [Publish]
 * 5. Preview → Shows all questions
 * 6. Publish → Inserts exam + questions into Supabase
 */
const { SlashCommandBuilder, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const supabase = require('../utils/supabase');
const { examDraftSessions } = require('../utils/sessions');
const { BASE_URL } = require('../utils/constants');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('taode')
    .setDescription('[GV] Tạo đề thi hoàn toàn từ Discord')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    if (!interaction.memberPermissions.has(PermissionFlagsBits.ModerateMembers)) {
      return interaction.reply({ content: '❌ Bạn không có quyền thực hiện lệnh này.', ephemeral: true });
    }

    const modal = new ModalBuilder()
      .setCustomId(`taode_step1_${interaction.user.id}`)
      .setTitle('Tạo Đề Thi — Bước 1/2: Thông Tin');

    const tenDe = new TextInputBuilder()
      .setCustomId('ten_de').setLabel('Tên đề thi').setStyle(TextInputStyle.Short).setMaxLength(100).setRequired(true);
    const monHoc = new TextInputBuilder()
      .setCustomId('mon_hoc').setLabel('Môn học').setStyle(TextInputStyle.Short).setRequired(true);
    const thoiGian = new TextInputBuilder()
      .setCustomId('thoi_gian').setLabel('Thời gian làm bài (phút)').setStyle(TextInputStyle.Short).setPlaceholder('60').setRequired(true);
    const moTa = new TextInputBuilder()
      .setCustomId('mo_ta').setLabel('Mô tả (tùy chọn)').setStyle(TextInputStyle.Paragraph).setRequired(false);
    const lopHoc = new TextInputBuilder()
      .setCustomId('lop_hoc').setLabel('Lớp (VD: 12, 11, TSTD)').setStyle(TextInputStyle.Short).setPlaceholder('12').setRequired(false);

    modal.addComponents(
      new ActionRowBuilder().addComponents(tenDe),
      new ActionRowBuilder().addComponents(monHoc),
      new ActionRowBuilder().addComponents(thoiGian),
      new ActionRowBuilder().addComponents(moTa),
      new ActionRowBuilder().addComponents(lopHoc)
    );

    await interaction.showModal(modal);
  }
};

// ── Modal Submit Handlers (called from handlers/modals.js) ──

/**
 * Handle Step 1 modal submit — save exam info, prompt to add questions
 */
async function handleStep1Submit(interaction) {
  const userId = interaction.user.id;
  const tenDe = interaction.fields.getTextInputValue('ten_de');
  const monHoc = interaction.fields.getTextInputValue('mon_hoc');
  const thoiGian = parseInt(interaction.fields.getTextInputValue('thoi_gian')) || 60;
  const moTa = interaction.fields.getTextInputValue('mo_ta') || '';
  const lopHoc = interaction.fields.getTextInputValue('lop_hoc') || '';

  examDraftSessions.set(userId, {
    title: tenDe,
    subject: monHoc,
    duration: thoiGian,
    description: moTa,
    grade: lopHoc,
    questions: []
  });

  const embed = new EmbedBuilder()
    .setColor(0x10B981)
    .setTitle('✅ Bước 1 hoàn tất!')
    .setDescription(`**${tenDe}** · ${monHoc} · ${thoiGian} phút`)
    .addFields({ name: '📝 Tiếp theo', value: 'Nhấn nút bên dưới để bắt đầu thêm câu hỏi trắc nghiệm.' });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`taode_add_q_${userId}`).setLabel('➕ Thêm câu hỏi').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`taode_cancel_${userId}`).setLabel('❌ Hủy').setStyle(ButtonStyle.Danger)
  );

  await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
}

/**
 * Handle Step 2 modal submit — save question, show continue/preview/publish
 */
async function handleAddQuestionSubmit(interaction) {
  const userId = interaction.user.id;
  const session = examDraftSessions.get(userId);
  if (!session) {
    return interaction.reply({ content: '❌ Phiên tạo đề đã hết hạn. Vui lòng chạy /taode lại.', ephemeral: true });
  }

  const cauHoi = interaction.fields.getTextInputValue('cau_hoi');
  const luaChon = interaction.fields.getTextInputValue('lua_chon');
  const dapAn = interaction.fields.getTextInputValue('dap_an').toUpperCase().trim();
  const giaiThich = interaction.fields.getTextInputValue('giai_thich') || '';

  // Parse options (each line = one option)
  const options = luaChon.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  session.questions.push({
    content: cauHoi,
    options: options,
    correct_answer: dapAn,
    explanation: giaiThich,
    points: 1
  });

  examDraftSessions.set(userId, session);
  const qCount = session.questions.length;

  const embed = new EmbedBuilder()
    .setColor(0x6366F1)
    .setTitle(`✅ Đã thêm câu ${qCount}!`)
    .setDescription(`**${cauHoi.substring(0, 80)}${cauHoi.length > 80 ? '...' : ''}**`)
    .addFields(
      { name: 'Đáp án đúng', value: dapAn, inline: true },
      { name: 'Tổng câu hỏi', value: `${qCount} câu`, inline: true }
    );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`taode_add_q_${userId}`).setLabel(`➕ Thêm câu ${qCount + 1}`).setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`taode_preview_${userId}`).setLabel('👁️ Xem trước').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`taode_publish_${userId}`).setLabel('🚀 Phát hành').setStyle(ButtonStyle.Success).setDisabled(qCount < 1)
  );

  await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
}

/**
 * Handle "Thêm câu hỏi" button — open question modal
 */
async function handleAddQuestionButton(interaction) {
  const userId = interaction.user.id;
  const session = examDraftSessions.get(userId);
  if (!session) {
    return interaction.reply({ content: '❌ Phiên tạo đề đã hết hạn. Vui lòng chạy /taode lại.', ephemeral: true });
  }

  const qNum = session.questions.length + 1;
  const modal = new ModalBuilder()
    .setCustomId(`taode_add_question_${userId}`)
    .setTitle(`Thêm Câu Hỏi ${qNum}`);

  const cauHoi = new TextInputBuilder()
    .setCustomId('cau_hoi').setLabel('Nội dung câu hỏi').setStyle(TextInputStyle.Paragraph).setRequired(true);
  const luaChon = new TextInputBuilder()
    .setCustomId('lua_chon').setLabel('Các đáp án (mỗi dòng 1 đáp án)')
    .setStyle(TextInputStyle.Paragraph).setPlaceholder('A. Đáp án 1\nB. Đáp án 2\nC. Đáp án 3\nD. Đáp án 4').setRequired(true);
  const dapAn = new TextInputBuilder()
    .setCustomId('dap_an').setLabel('Đáp án đúng (A/B/C/D)').setStyle(TextInputStyle.Short).setMaxLength(1).setRequired(true);
  const giaiThich = new TextInputBuilder()
    .setCustomId('giai_thich').setLabel('Giải thích đáp án (tùy chọn)').setStyle(TextInputStyle.Paragraph).setRequired(false);

  modal.addComponents(
    new ActionRowBuilder().addComponents(cauHoi),
    new ActionRowBuilder().addComponents(luaChon),
    new ActionRowBuilder().addComponents(dapAn),
    new ActionRowBuilder().addComponents(giaiThich)
  );

  await interaction.showModal(modal);
}

/**
 * Handle "Xem trước" button — show preview of all questions
 */
async function handlePreviewButton(interaction) {
  const userId = interaction.user.id;
  const session = examDraftSessions.get(userId);
  if (!session) {
    return interaction.reply({ content: '❌ Phiên tạo đề đã hết hạn.', ephemeral: true });
  }

  const embed = new EmbedBuilder()
    .setColor(0x7C3AED)
    .setTitle(`👁️ Xem trước: ${session.title}`)
    .setDescription(`**${session.subject}** · ${session.duration} phút · ${session.questions.length} câu`);

  session.questions.forEach((q, idx) => {
    const optionsText = q.options.slice(0, 4).join('\n');
    embed.addFields({
      name: `Câu ${idx + 1}: ${q.content.substring(0, 50)}${q.content.length > 50 ? '...' : ''}`,
      value: `${optionsText}\n✅ Đáp án: **${q.correct_answer}**`,
      inline: false
    });
  });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`taode_add_q_${userId}`).setLabel('➕ Thêm câu nữa').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`taode_publish_${userId}`).setLabel('🚀 Phát hành').setStyle(ButtonStyle.Success)
  );

  await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
}

/**
 * Handle "Phát hành" button — insert exam + questions into Supabase
 */
async function handlePublishButton(interaction) {
  const userId = interaction.user.id;
  const session = examDraftSessions.get(userId);
  if (!session || session.questions.length === 0) {
    return interaction.reply({ content: '❌ Không có dữ liệu đề thi để phát hành.', ephemeral: true });
  }

  if (!supabase) {
    return interaction.reply({ content: '❌ Cơ sở dữ liệu chưa sẵn sàng.', ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: true });

  // Get teacher profile
  const { data: profile } = await supabase
    .from('profiles').select('id').eq('discord_id', userId).maybeSingle();

  if (!profile) {
    return interaction.followUp({ content: '❌ Bạn chưa liên kết tài khoản ExamHub.', ephemeral: true });
  }

  // Insert exam
  const { data: exam, error: examError } = await supabase
    .from('exams')
    .insert({
      title: session.title,
      subject: session.subject,
      duration: session.duration,
      description: session.description || null,
      grade: session.grade || null,
      total_questions: session.questions.length,
      status: 'published',
      created_by: profile.id,
      assigned_to: session.grade?.toUpperCase() === 'TSTD' ? 'x' : 'normal'
    })
    .select('id')
    .single();

  if (examError) {
    console.error('[TAODE PUBLISH ERROR] Exam insert:', examError);
    return interaction.followUp({ content: '❌ Lỗi khi tạo đề thi: ' + examError.message, ephemeral: true });
  }

  // Insert questions
  const questionsToInsert = session.questions.map((q, idx) => ({
    exam_id: exam.id,
    question_text: q.content,
    question_type: 'multiple_choice',
    options: q.options,
    correct_answer: q.correct_answer,
    explanation: q.explanation || null,
    points: q.points || 1,
    order_index: idx + 1
  }));

  const { error: qError } = await supabase.from('questions').insert(questionsToInsert);

  if (qError) {
    console.error('[TAODE PUBLISH ERROR] Questions insert:', qError);
    return interaction.followUp({ content: `⚠️ Đề thi đã tạo nhưng lỗi khi thêm câu hỏi: ${qError.message}`, ephemeral: true });
  }

  // Cleanup draft session
  examDraftSessions.delete(userId);

  const embed = new EmbedBuilder()
    .setColor(0x10B981)
    .setTitle('🎉 Đề Thi Đã Được Tạo Thành Công!')
    .addFields(
      { name: '📝 Tên đề', value: session.title, inline: true },
      { name: '📚 Môn học', value: session.subject, inline: true },
      { name: '❓ Số câu', value: `${session.questions.length} câu`, inline: true },
      { name: '⏱️ Thời gian', value: `${session.duration} phút`, inline: true },
      { name: '🔗 Link', value: `[Xem đề thi](${BASE_URL}/student/exams/${exam.id})`, inline: false }
    )
    .setTimestamp()
    .setFooter({ text: 'ECODEx Exam Builder' });

  await interaction.followUp({ embeds: [embed], ephemeral: true });
}

/**
 * Handle "Hủy" button
 */
async function handleCancelButton(interaction) {
  const userId = interaction.user.id;
  examDraftSessions.delete(userId);
  await interaction.reply({ content: '❌ Đã hủy phiên tạo đề thi.', ephemeral: true });
}

module.exports.handleStep1Submit = handleStep1Submit;
module.exports.handleAddQuestionSubmit = handleAddQuestionSubmit;
module.exports.handleAddQuestionButton = handleAddQuestionButton;
module.exports.handlePreviewButton = handlePreviewButton;
module.exports.handlePublishButton = handlePublishButton;
module.exports.handleCancelButton = handleCancelButton;
