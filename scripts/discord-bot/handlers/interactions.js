/**
 * Button interaction handler — checkin confirm, arena select, taode buttons, hocsinh list pagination
 */
const supabase = require('../utils/supabase');
const { activeCheckins, activeSessions } = require('../utils/sessions');
const { EmbedBuilder } = require('discord.js');
const { executeCreateArena } = require('../commands/arena');
const taode = require('../commands/taode');
const thacdau = require('../commands/thacdau');

async function handleButtonInteraction(interaction) {
  const customId = interaction.customId;

  // ── Checkin confirm ──
  if (customId.startsWith('checkin_confirm_')) {
    const userId = customId.replace('checkin_confirm_', '');
    if (interaction.user.id !== userId) {
      return interaction.reply({ content: '❌ Bạn không phải là người nhận điểm danh này.', ephemeral: true });
    }

    const checkin = activeCheckins.get(userId);
    if (!checkin) {
      return interaction.reply({ content: '❌ Yêu cầu điểm danh này đã hết hạn hoặc không tồn tại.', ephemeral: true });
    }

    clearTimeout(checkin.timeoutId);
    activeCheckins.delete(userId);

    const successEmbed = new EmbedBuilder()
      .setColor(0x10B981)
      .setTitle('✅ Xác nhận thành công')
      .setDescription('Cảm ơn bạn đã xác nhận! Chúc bạn học tập tốt và tập trung nhé! 💪')
      .setTimestamp()
      .setFooter({ text: 'ECODEx Learning System' });

    try {
      await interaction.update({ embeds: [successEmbed], components: [] });
      const session = activeSessions.get(userId);
      if (session) session.lastCheckinTime = Date.now();
      console.log(`[CHECKIN CONFIRMED] User ${interaction.user.username} successfully confirmed attention check.`);
    } catch (e) {
      console.error(`[CHECKIN CONFIRM ERROR]`, e.message);
    }
    return;
  }

  // ── Thacdau buttons ──
  if (customId.startsWith('thacdau_accept_')) {
    const parts = customId.split('_');
    const challengeId = parts[2];
    const opponentDiscordId = parts[3];
    return thacdau.handleAcceptButton(interaction, challengeId, opponentDiscordId);
  }
  if (customId.startsWith('thacdau_decline_')) {
    const parts = customId.split('_');
    const challengeId = parts[2];
    const opponentDiscordId = parts[3];
    return thacdau.handleDeclineButton(interaction, challengeId, opponentDiscordId);
  }
  if (customId.startsWith('duel_ans_')) {
    const parts = customId.split('_');
    const challengeId = parts[2];
    const qIndex = parseInt(parts[3], 10);
    const choice = parts[4];
    const userDiscordId = parts[5];
    return thacdau.handleDuelAnswerButton(interaction, challengeId, qIndex, choice, userDiscordId);
  }

  // ── Taode buttons ──
  if (customId.startsWith('taode_add_q_')) {
    return taode.handleAddQuestionButton(interaction);
  }
  if (customId.startsWith('taode_preview_')) {
    return taode.handlePreviewButton(interaction);
  }
  if (customId.startsWith('taode_publish_')) {
    return taode.handlePublishButton(interaction);
  }
  if (customId.startsWith('taode_cancel_')) {
    return taode.handleCancelButton(interaction);
  }

  // ── Hocsinh list pagination ──
  if (customId.startsWith('hocsinh_list_prev_') || customId.startsWith('hocsinh_list_next_')) {
    // Pagination buttons are handled inline for simplicity
    // Format: hocsinh_list_prev_{currentPage}_{authorUserId}
    // or:     hocsinh_list_next_{currentPage}_{authorUserId}
    const parts = customId.split('_');
    const direction = parts[2]; // 'prev' or 'next'
    const currentPage = parseInt(parts[3]);
    const authorId = parts[4];

    if (interaction.user.id !== authorId) {
      return interaction.reply({ content: '❌ Bạn không phải là người gọi lệnh này.', ephemeral: true });
    }

    // Re-fetch students (we don't cache them to keep it simple)
    if (!supabase) return;
    const { data: students } = await supabase
      .from('profiles').select('full_name, class, discord_id, email')
      .eq('role', 'student').order('class').order('full_name');

    if (!students) return;

    const pageSize = 10;
    const totalPages = Math.ceil(students.length / pageSize);
    const newPage = direction === 'next' ? currentPage + 1 : currentPage - 1;

    const { buildListEmbed, buildListButtons } = require('../commands/hocsinh');
    const embed = buildListEmbed(students, newPage, pageSize, totalPages, null);
    const row = buildListButtons(newPage, totalPages, authorId);

    await interaction.update({ embeds: [embed], components: [row] });
    return;
  }
}

async function handleSelectMenuInteraction(interaction) {
  const customId = interaction.customId;

  // ── Arena select menu ──
  if (customId.startsWith('arena_select_menu_')) {
    const selectMenuAuthorId = customId.replace('arena_select_menu_', '');
    if (interaction.user.id !== selectMenuAuthorId) {
      return interaction.reply({ content: '❌ Bạn không phải là người gọi lệnh này.', ephemeral: true });
    }

    await interaction.deferUpdate();
    const selectedValue = interaction.values[0];
    const parts = selectedValue.replace('arena_create_', '').split('_');
    const examId = parts[0];
    const tagLopId = parts[1];

    const tagLop = tagLopId !== 'none' ? interaction.guild.roles.cache.get(tagLopId) : null;

    if (!supabase) {
      return interaction.editReply({ content: '❌ Cơ sở dữ liệu chưa sẵn sàng.', components: [] });
    }

    const { data: exam } = await supabase
      .from('exams').select('id, title, duration, total_questions, subject').eq('id', examId).single();

    if (!exam) {
      return interaction.editReply({ content: '❌ Đề thi đã chọn không tồn tại.', components: [] });
    }

    await executeCreateArena(interaction, exam, tagLop);
  }
}

module.exports = { handleButtonInteraction, handleSelectMenuInteraction };
