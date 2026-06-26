/**
 * /thacdau — 1v1 Peer Challenge command and duel engine
 */
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const supabase = require('../utils/supabase');
const { askGemini } = require('../utils/ai');

// In-memory state of active duels
// challengeId -> { challengerId, opponentId, challengerDiscordId, opponentDiscordId, questions: [], currentQIndex: 0, answers: { challenger: {}, opponent: {} }, timerPromiseResolve: null, thread: null }
const activeDuels = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('thacdau')
    .setDescription('Thách đấu học tập 1v1 với bạn học')
    .addUserOption(opt =>
      opt.setName('doi_thu')
        .setDescription('Người bạn muốn thách đấu')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('mon')
        .setDescription('Môn học để thi đấu')
        .setRequired(true)
        .addChoices(
          { name: 'Toán học', value: 'math' },
          { name: 'Vật lý', value: 'physics' },
          { name: 'Hóa học', value: 'chemistry' }
        )
    ),

  async execute(interaction) {
    await interaction.deferReply();
    const challengerUser = interaction.user;
    const opponentUser = interaction.options.getUser('doi_thu');
    const subject = interaction.options.getString('mon');

    if (challengerUser.id === opponentUser.id) {
      return interaction.followUp({ content: '❌ Bạn không thể tự thách đấu chính mình!' });
    }

    if (opponentUser.bot) {
      return interaction.followUp({ content: '❌ Bạn không thể thách đấu với bot!' });
    }

    if (!supabase) {
      return interaction.followUp({ content: '❌ Kết nối cơ sở dữ liệu chưa sẵn sàng.' });
    }

    // 1. Fetch profiles
    const { data: challengerProfile } = await supabase
      .from('profiles').select('id, full_name').eq('discord_id', challengerUser.id).maybeSingle();

    const { data: opponentProfile } = await supabase
      .from('profiles').select('id, full_name').eq('discord_id', opponentUser.id).maybeSingle();

    if (!challengerProfile) {
      return interaction.followUp({ content: '❌ Bạn chưa liên kết tài khoản ExamHub. Sử dụng `/lienket` trước.' });
    }

    if (!opponentProfile) {
      return interaction.followUp({ content: `❌ Đối thủ **${opponentUser.username}** chưa liên kết tài khoản ExamHub.` });
    }

    try {
      // 2. Fetch or generate 5 questions
      let questions = [];
      const { data: dbQuestions } = await supabase
        .from('questions')
        .select('content, options, correct_answer, explanation')
        .eq('question_type', 'mc') // MC only
        .limit(10); // fetch some to random

      if (dbQuestions && dbQuestions.length >= 5) {
        // Randomly shuffle and take 5
        questions = dbQuestions.sort(() => 0.5 - Math.random()).slice(0, 5);
      } else {
        // Gemini fallback if not enough questions in DB
        const subjectName = subject === 'math' ? 'Toán học' : subject === 'physics' ? 'Vật lý' : 'Hóa học';
        const aiPrompt = `Tạo đúng 5 câu hỏi trắc nghiệm ngắn gọn cấp THPT về môn: "${subjectName}" (mỗi câu 4 lựa chọn A, B, C, D).
Trả về duy nhất định dạng JSON Array (không bọc trong tag code block) theo cấu trúc dưới đây:
[
  {
    "content": "Nội dung câu hỏi...",
    "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
    "correct_answer": "A",
    "explanation": "..."
  }
]`;
        const aiResponse = await askGemini([{ role: 'user', content: aiPrompt }], '', 0.4);
        let cleaned = aiResponse.trim();
        if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
        if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
        if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
        cleaned = cleaned.trim();
        
        const startIdx = cleaned.indexOf('[');
        const endIdx = cleaned.lastIndexOf(']');
        if (startIdx !== -1 && endIdx !== -1) {
          cleaned = cleaned.substring(startIdx, endIdx + 1);
        }
        
        questions = JSON.parse(cleaned);
      }

      if (questions.length < 5) {
        throw new Error('Could not compile 5 questions for the duel.');
      }

      // Format questions
      const formattedQuestions = questions.map(q => {
        let correct = (q.correct_answer || q.correct || 'A').toString().trim().toUpperCase();
        if (!['A', 'B', 'C', 'D'].includes(correct)) correct = 'A';
        return {
          content: q.content,
          options: Array.isArray(q.options) ? q.options : ['A. ', 'B. ', 'C. ', 'D. '],
          correct_answer: correct,
          explanation: q.explanation || ''
        };
      });

      // 3. Create peer_challenges record
      const { data: challenge, error: dbErr } = await supabase
        .from('peer_challenges')
        .insert({
          challenger_id: challengerProfile.id,
          opponent_id: opponentProfile.id,
          subject: subject,
          status: 'pending',
          questions: formattedQuestions,
          xp_stake: 50
        })
        .select('id')
        .single();

      if (dbErr) throw dbErr;

      // 4. Send Invite Message
      const subjectLabel = subject === 'math' ? 'Toán học' : subject === 'physics' ? 'Vật lý' : 'Hóa học';
      const embed = new EmbedBuilder()
        .setColor(0xEF4444)
        .setTitle('⚔️ THÁCH ĐẤU 1V1 HỌC TẬP')
        .setDescription(`${opponentUser.toString()}, bạn nhận được lời thách đấu từ ${challengerUser.toString()}!\n\n📚 **Môn thi:** ${subjectLabel}\n❓ **Số câu:** 5 câu trắc nghiệm\n⏱️ **Thời gian:** 30 giây mỗi câu\n🔥 **Cược:** **50 XP**`)
        .setFooter({ text: 'Nhấn nút bên dưới để phản hồi (Thời gian chờ: 5 phút)' })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`thacdau_accept_${challenge.id}_${opponentUser.id}`).setLabel('⚔️ Chấp nhận').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`thacdau_decline_${challenge.id}_${opponentUser.id}`).setLabel('❌ Từ chối').setStyle(ButtonStyle.Danger)
      );

      await interaction.followUp({
        content: `${opponentUser.toString()} ⚔️`,
        embeds: [embed],
        components: [row]
      });

    } catch (err) {
      console.error('[THACDAU INVITATION ERROR]', err);
      await interaction.followUp({ content: `❌ Không thể bắt đầu thách đấu: ${err.message}` });
    }
  }
};

/**
 * Handle Challenger/Opponent accepts duel button
 */
async function handleAcceptButton(interaction, challengeId, opponentDiscordId) {
  if (interaction.user.id !== opponentDiscordId) {
    return interaction.reply({ content: '❌ Bạn không phải là người được thách đấu!', ephemeral: true });
  }

  await interaction.deferUpdate();

  if (!supabase) return;

  // 1. Fetch challenge details
  const { data: challenge } = await supabase
    .from('peer_challenges')
    .select('*, challenger:challenger_id(discord_id, full_name), opponent:opponent_id(discord_id, full_name)')
    .eq('id', challengeId)
    .single();

  if (!challenge || challenge.status !== 'pending') {
    return interaction.editReply({ content: '❌ Thử thách này không còn hiệu lực.', embeds: [], components: [] });
  }

  // 2. Create discussion thread
  try {
    const thread = await interaction.channel.threads.create({
      name: `⚔️ 1v1-${challenge.challenger.full_name}-vs-${challenge.opponent.full_name}`,
      autoArchiveDuration: 60,
      reason: '1v1 Study Duel'
    });

    // Join both users to the thread
    await thread.join();
    const challengerMember = await interaction.guild.members.fetch(challenge.challenger.discord_id).catch(() => null);
    if (challengerMember) await thread.members.add(challengerMember.id).catch(() => null);
    await thread.members.add(opponentDiscordId).catch(() => null);

    // Update challenge status
    await supabase.from('peer_challenges').update({ status: 'accepted' }).eq('id', challengeId);

    // Update invitation message
    const acceptedEmbed = new EmbedBuilder()
      .setColor(0x10B981)
      .setTitle('✅ THÁCH ĐẤU ĐÃ ĐƯỢC CHẤP NHẬN')
      .setDescription(`Cuộc đấu 1v1 giữa <@${challenge.challenger.discord_id}> và <@${challenge.opponent.discord_id}> đã bắt đầu!\n\n👉 **Vào phòng đấu:** ${thread.toString()}`);

    await interaction.editReply({ embeds: [acceptedEmbed], components: [] });

    // Store in activeDuels Map
    activeDuels.set(challengeId, {
      challengerDiscordId: challenge.challenger.discord_id,
      opponentDiscordId: challenge.opponent.discord_id,
      challengerId: challenge.challenger_id,
      opponentId: challenge.opponent_id,
      questions: challenge.questions,
      currentQIndex: 0,
      answers: { challenger: {}, opponent: {} },
      timerPromiseResolve: null,
      thread: thread
    });

    // Start duel loop in background
    runDuel(interaction.client, challengeId);

  } catch (err) {
    console.error('[THACDAU ACCEPT ERROR]', err);
    await interaction.followUp({ content: '❌ Lỗi khi khởi tạo phòng đấu 1v1.' });
  }
}

/**
 * Handle decline challenge button
 */
async function handleDeclineButton(interaction, challengeId, opponentDiscordId) {
  if (interaction.user.id !== opponentDiscordId) {
    return interaction.reply({ content: '❌ Bạn không phải là người được thách đấu!', ephemeral: true });
  }

  if (!supabase) return;

  await supabase.from('peer_challenges').update({ status: 'declined' }).eq('id', challengeId);

  const declinedEmbed = new EmbedBuilder()
    .setColor(0x6B7280)
    .setTitle('❌ THÁCH ĐẤU BỊ TỪ CHỐI')
    .setDescription(`<@${opponentDiscordId}> đã từ chối lời thách đấu.`);

  await interaction.update({ embeds: [declinedEmbed], components: [] });
}

/**
 * Handle MCQ answer selection button inside the duel thread
 */
async function handleDuelAnswerButton(interaction, challengeId, qIndex, choice, userDiscordId) {
  if (interaction.user.id !== userDiscordId) {
    return interaction.reply({ content: '❌ Nút này chỉ dành cho bạn.', ephemeral: true });
  }

  const duel = activeDuels.get(challengeId);
  if (!duel || duel.currentQIndex !== qIndex) {
    return interaction.reply({ content: '❌ Câu hỏi này đã hết hạn.', ephemeral: true });
  }

  const role = interaction.user.id === duel.challengerDiscordId ? 'challenger' : 'opponent';
  
  if (duel.answers[role][qIndex] !== undefined) {
    return interaction.reply({ content: '❌ Bạn đã trả lời câu hỏi này rồi.', ephemeral: true });
  }

  // Save answer
  duel.answers[role][qIndex] = choice;
  activeDuels.set(challengeId, duel);

  await interaction.reply({ content: `✅ Bạn đã chọn đáp án **${choice}**! Chờ đối thủ trả lời...`, ephemeral: true });

  // If both answered, break the sleep timer early!
  const hasChallenger = duel.answers.challenger[qIndex] !== undefined;
  const hasOpponent = duel.answers.opponent[qIndex] !== undefined;

  if (hasChallenger && hasOpponent) {
    if (duel.timerPromiseResolve) {
      duel.timerPromiseResolve(); // Resolve countdown promise
    }
  }
}

/**
 * The main duel loop orchestrator
 */
async function runDuel(client, challengeId) {
  const duel = activeDuels.get(challengeId);
  if (!duel) return;

  const thread = duel.thread;
  const questions = duel.questions;

  await thread.send('🏁 **Trận đấu sẽ bắt đầu sau 5 giây! Chuẩn bị...**');
  await sleep(5000);

  for (let i = 0; i < questions.length; i++) {
    duel.currentQIndex = i;
    activeDuels.set(challengeId, duel);

    const question = questions[i];
    
    // Embed question
    const embed = new EmbedBuilder()
      .setColor(0x3B82F6)
      .setTitle(`Câu ${i + 1}/${questions.length} ⏱️ 30 giây`)
      .setDescription(question.content)
      .addFields({ name: 'Lựa chọn', value: question.options.join('\n') });

    // Buttons
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`duel_ans_${challengeId}_${i}_A_${duel.challengerDiscordId}`).setLabel('A').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`duel_ans_${challengeId}_${i}_B_${duel.challengerDiscordId}`).setLabel('B').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`duel_ans_${challengeId}_${i}_C_${duel.challengerDiscordId}`).setLabel('C').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`duel_ans_${challengeId}_${i}_D_${duel.challengerDiscordId}`).setLabel('D').setStyle(ButtonStyle.Primary)
    );

    const rowOpponent = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`duel_ans_${challengeId}_${i}_A_${duel.opponentDiscordId}`).setLabel('A').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`duel_ans_${challengeId}_${i}_B_${duel.opponentDiscordId}`).setLabel('B').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`duel_ans_${challengeId}_${i}_C_${duel.opponentDiscordId}`).setLabel('C').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`duel_ans_${challengeId}_${i}_D_${duel.opponentDiscordId}`).setLabel('D').setStyle(ButtonStyle.Secondary)
    );

    const msg = await thread.send({
      content: `⚡ **Câu hỏi cho cả hai:**\n<@${duel.challengerDiscordId}> (Nút xanh dương) vs <@${duel.opponentDiscordId}> (Nút xám)`,
      embeds: [embed],
      components: [row, rowOpponent]
    });

    // Countdown with early break if both answered
    let timeLeft = 30;
    while (timeLeft > 0) {
      // Check if both answered
      const hasChallenger = duel.answers.challenger[i] !== undefined;
      const hasOpponent = duel.answers.opponent[i] !== undefined;
      if (hasChallenger && hasOpponent) {
        break;
      }

      // Sleep 5 seconds or until resolved early
      await new Promise(resolve => {
        duel.timerPromiseResolve = resolve;
        setTimeout(resolve, 5000);
      });

      timeLeft -= 5;
      if (timeLeft > 0) {
        embed.setTitle(`Câu ${i + 1}/${questions.length} ⏱️ ${timeLeft} giây`);
        await msg.edit({ embeds: [embed] }).catch(() => null);
      }
    }

    // Disable buttons
    await msg.edit({ components: [] }).catch(() => null);

    // Show correct answer
    const feedbackEmbed = new EmbedBuilder()
      .setColor(0x10B981)
      .setTitle(`📢 Hết giờ câu ${i + 1}!`)
      .setDescription(`✅ **Đáp án đúng:** **${question.correct_answer}**\n\n📖 *Giải thích:* ${question.explanation || 'Không có giải thích'}`);
    
    await thread.send({ embeds: [feedbackEmbed] });
    await sleep(3000); // 3s buffer between questions
  }

  // End of duel - compute results
  let challengerScore = 0;
  let opponentScore = 0;

  questions.forEach((q, idx) => {
    if (duel.answers.challenger[idx] === q.correct_answer) challengerScore++;
    if (duel.answers.opponent[idx] === q.correct_answer) opponentScore++;
  });

  let resultDescription = '';
  let winnerId = null;
  let xpChangeChallenger = 0;
  let xpChangeOpponent = 0;

  if (challengerScore > opponentScore) {
    resultDescription = `🎉 **Chiến thắng thuộc về <@${duel.challengerDiscordId}>!**\n\n🏆 <@${duel.challengerDiscordId}>: ${challengerScore}/${questions.length} câu đúng (+50 XP)\n💀 <@${duel.opponentDiscordId}>: ${opponentScore}/${questions.length} câu đúng (-50 XP)`;
    winnerId = duel.challengerId;
    xpChangeChallenger = 50;
    xpChangeOpponent = -50;
  } else if (opponentScore > challengerScore) {
    resultDescription = `🎉 **Chiến thắng thuộc về <@${duel.opponentDiscordId}>!**\n\n🏆 <@${duel.opponentDiscordId}>: ${opponentScore}/${questions.length} câu đúng (+50 XP)\n💀 <@${duel.challengerDiscordId}>: ${challengerScore}/${questions.length} câu đúng (-50 XP)`;
    winnerId = duel.opponentId;
    xpChangeChallenger = -50;
    xpChangeOpponent = 50;
  } else {
    resultDescription = `🤝 **Kết quả: HÒA!**\n\n⚖️ Cả hai đều đạt ${challengerScore}/${questions.length} câu đúng. Không có thay đổi XP.`;
  }

  // Update Database Challenge Record
  if (supabase) {
    await supabase.from('peer_challenges').update({
      status: 'completed',
      challenger_score: challengerScore,
      opponent_score: opponentScore,
      challenger_answers: duel.answers.challenger,
      opponent_answers: duel.answers.opponent,
      winner_id: winnerId,
      completed_at: new Date().toISOString()
    }).eq('id', challengeId);

    // Update Challenger stats
    if (xpChangeChallenger !== 0) {
      const { data: statsC } = await supabase.from('student_stats').select('xp').eq('user_id', duel.challengerId).maybeSingle();
      if (statsC) {
        await supabase.from('student_stats').update({ xp: Math.max(0, (statsC.xp || 0) + xpChangeChallenger) }).eq('user_id', duel.challengerId);
      }
    }

    // Update Opponent stats
    if (xpChangeOpponent !== 0) {
      const { data: statsO } = await supabase.from('student_stats').select('xp').eq('user_id', duel.opponentId).maybeSingle();
      if (statsO) {
        await supabase.from('student_stats').update({ xp: Math.max(0, (statsO.xp || 0) + xpChangeOpponent) }).eq('user_id', duel.opponentId);
      }
    }
  }

  // Send result embed
  const resultEmbed = new EmbedBuilder()
    .setColor(0xF59E0B)
    .setTitle('🏁 TRẬN ĐẤU KẾT THÚC!')
    .setDescription(resultDescription)
    .setTimestamp();

  await thread.send({ embeds: [resultEmbed] });

  // Clean up
  activeDuels.delete(challengeId);

  // Archive thread in 2 minutes
  setTimeout(async () => {
    await thread.setArchived(true).catch(() => null);
  }, 120000);
}

/**
 * Utility sleep
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports.handleAcceptButton = handleAcceptButton;
module.exports.handleDeclineButton = handleDeclineButton;
module.exports.handleDuelAnswerButton = handleDuelAnswerButton;
