/**
 * /taode-ai — AI Exam Generator (GV only)
 */
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const supabase = require('../utils/supabase');
const { examDraftSessions } = require('../utils/sessions');
const { askGemini } = require('../utils/ai');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('taode-ai')
    .setDescription('[GV] Tạo đề thi trắc nghiệm tự động bằng AI')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addStringOption(opt =>
      opt.setName('chu_de')
        .setDescription('Chủ đề bài kiểm tra (Ví dụ: Động lượng và định luật bảo toàn động lượng)')
        .setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName('so_cau')
        .setDescription('Số lượng câu hỏi cần tạo (từ 3 đến 10)')
        .setRequired(false)
        .setMinValue(3)
        .setMaxValue(10)
    )
    .addStringOption(opt =>
      opt.setName('do_kho')
        .setDescription('Mức độ khó của câu hỏi')
        .setRequired(false)
        .addChoices(
          { name: 'Dễ', value: 'Dễ' },
          { name: 'Trung bình', value: 'Trung bình' },
          { name: 'Khó', value: 'Khó' }
        )
    )
    .addStringOption(opt =>
      opt.setName('lop')
        .setDescription('Lớp học áp dụng (10, 11, 12, hoặc TSTD)')
        .setRequired(false)
        .addChoices(
          { name: 'Lớp 10', value: '10' },
          { name: 'Lớp 11', value: '11' },
          { name: 'Lớp 12', value: '12' },
          { name: 'Thí sinh tự do (TSTD)', value: 'TSTD' }
        )
    ),

  async execute(interaction) {
    if (!interaction.memberPermissions.has(PermissionFlagsBits.ModerateMembers)) {
      return interaction.reply({ content: '❌ Bạn không có quyền thực hiện lệnh này.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });
    const userId = interaction.user.id;
    const chuDe = interaction.options.getString('chu_de');
    const soCau = interaction.options.getInteger('so_cau') || 5;
    const doKho = interaction.options.getString('do_kho') || 'Trung bình';
    const lop = interaction.options.getString('lop') || '12';

    if (!supabase) {
      return interaction.followUp({ content: '❌ Kết nối cơ sở dữ liệu chưa sẵn sàng.', ephemeral: true });
    }

    // Check if linked
    const { data: profile } = await supabase
      .from('profiles').select('id').eq('discord_id', userId).maybeSingle();

    if (!profile) {
      return interaction.followUp({ content: '❌ Bạn chưa liên kết tài khoản ExamHub. Dùng lệnh `/lienket` trước.', ephemeral: true });
    }

    try {
      const prompt = `Tạo đề thi trắc nghiệm gồm đúng ${soCau} câu hỏi (mỗi câu 4 lựa chọn A, B, C, D) về chủ đề: "${chuDe}" với độ khó: "${doKho}".
Trả về duy nhất định dạng JSON thuần túy (không bọc trong tag code block \`\`\`json hay bất kỳ văn bản nào khác) theo cấu trúc chính xác dưới đây:
{
  "title": "Tên đề thi khoa học phù hợp",
  "subject": "Môn học tiếng Việt (Ví dụ: Toán, Vật lý, Hóa học, Sinh học, Lịch sử, Địa lý)",
  "questions": [
    {
      "content": "Nội dung câu hỏi...",
      "options": ["A. Lựa chọn 1", "B. Lựa chọn 2", "C. Lựa chọn 3", "D. Lựa chọn 4"],
      "correct_answer": "A",
      "explanation": "Giải thích chi tiết..."
    }
  ]
}
Lưu ý:
- correct_answer bắt buộc phải là một chữ cái in hoa 'A', 'B', 'C' hoặc 'D'.
- options phải chứa đúng 4 đáp án dạng "A. ", "B. ", "C. ", "D. ".`;

      const aiResponse = await askGemini([{ role: 'user', content: prompt }], '', 0.3);

      // Clean AI response to ensure valid JSON
      let jsonText = aiResponse.trim();
      if (jsonText.startsWith('```json')) jsonText = jsonText.slice(7);
      if (jsonText.startsWith('```')) jsonText = jsonText.slice(3);
      if (jsonText.endsWith('```')) jsonText = jsonText.slice(0, -3);
      jsonText = jsonText.trim();

      const startIdx = jsonText.indexOf('{');
      const endIdx = jsonText.lastIndexOf('}');
      if (startIdx === -1 || endIdx === -1) {
        throw new Error('AI response does not contain a valid JSON object.');
      }
      jsonText = jsonText.substring(startIdx, endIdx + 1);

      const examData = JSON.parse(jsonText);
      if (!examData.title || !examData.questions || !Array.isArray(examData.questions)) {
        throw new Error('AI response missing title or questions list.');
      }

      // Format questions for consistency
      const questions = examData.questions.map(q => {
        let correct = q.correct_answer || q.correct || 'A';
        correct = correct.toString().trim().toUpperCase();
        if (!['A', 'B', 'C', 'D'].includes(correct)) correct = 'A';
        
        return {
          content: q.content || q.question || 'Câu hỏi trắc nghiệm',
          options: Array.isArray(q.options) ? q.options : ['A. ', 'B. ', 'C. ', 'D. '],
          correct_answer: correct,
          explanation: q.explanation || '',
          points: 1
        };
      });

      // Store in session
      examDraftSessions.set(userId, {
        title: examData.title,
        subject: examData.subject || 'Chung',
        duration: soCau * 2, // 2 mins per question
        description: `Đề thi tự động tạo bằng AI cho chủ đề: ${chuDe} (${doKho})`,
        grade: lop,
        questions: questions
      });

      // Preview (first 3 questions)
      const previewEmbed = new EmbedBuilder()
        .setColor(0x059669)
        .setTitle(`🤖 AI Exam Generator: ${examData.title}`)
        .setDescription(`**Môn học:** ${examData.subject || 'Chung'} · **Lớp:** ${lop} · **Thời gian:** ${soCau * 2} phút · **Số câu:** ${soCau} câu\n\n👁️ **Xem trước 3 câu đầu:**`);

      questions.slice(0, 3).forEach((q, idx) => {
        previewEmbed.addFields({
          name: `Câu ${idx + 1}: ${q.content.substring(0, 150)}`,
          value: `${q.options.join('\n')}\n👉 **Đáp án đúng:** ${q.correct_answer}`,
          inline: false
        });
      });

      if (questions.length > 3) {
        previewEmbed.setFooter({ text: `... và ${questions.length - 3} câu hỏi khác. Nhấn nút bên dưới để phát hành.` });
      }

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`taode_publish_${userId}`).setLabel('🚀 Phát hành đề thi').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`taode_cancel_${userId}`).setLabel('❌ Hủy').setStyle(ButtonStyle.Danger)
      );

      await interaction.followUp({
        embeds: [previewEmbed],
        components: [row],
        ephemeral: true
      });

    } catch (err) {
      console.error('[TAODE-AI ERROR]', err);
      await interaction.followUp({
        content: `❌ Lỗi phát sinh từ AI hoặc lỗi phân tích cú pháp: ${err.message}`,
        ephemeral: true
      });
    }
  }
};
