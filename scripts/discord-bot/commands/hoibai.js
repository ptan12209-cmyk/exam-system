/**
 * /hoibai — AI Tutor command for students
 */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const supabase = require('../utils/supabase');
const { askGemini } = require('../utils/ai');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('hoibai')
    .setDescription('Hỏi AI Tutor để được giải thích bài học, lời giải chi tiết')
    .addStringOption(opt => 
      opt.setName('cau_hoi')
        .setDescription('Câu hỏi hoặc nội dung cần AI giải thích')
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const userId = interaction.user.id;
    const cauHoi = interaction.options.getString('cau_hoi');

    if (!supabase) {
      return interaction.followUp({ content: '❌ Kết nối cơ sở dữ liệu chưa sẵn sàng.', ephemeral: true });
    }

    // 1. Fetch student profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, full_name, class')
      .eq('discord_id', userId)
      .maybeSingle();

    if (error || !profile) {
      return interaction.followUp({ 
        content: '❌ Bạn chưa liên kết tài khoản ExamHub. Vui lòng sử dụng lệnh `/lienket` trước.', 
        ephemeral: true 
      });
    }

    try {
      // 2. Create discussion thread
      if (!interaction.channel.threads) {
        return interaction.followUp({ 
          content: '❌ Kênh hiện tại không hỗ trợ tạo luồng thảo luận (Thread). Vui lòng dùng lệnh ở kênh chat thông thường.', 
          ephemeral: true 
        });
      }

      const thread = await interaction.channel.threads.create({
        name: `🤖 hoibai-${interaction.user.username}`,
        autoArchiveDuration: 60,
        reason: `AI Tutor session for ${profile.full_name}`
      });

      // Join the thread
      await thread.join();

      // Send initial acknowledgement
      await interaction.followUp({ 
        content: `💬 Đã tạo luồng học tập AI Tutor cho bạn: ${thread.toString()}`, 
        ephemeral: true 
      });

      // Post the initial user question in the thread
      const userEmbed = new EmbedBuilder()
        .setColor(0x7C3AED)
        .setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
        .setDescription(`❓ **Câu hỏi:** ${cauHoi}`)
        .setTimestamp();

      await thread.send({ embeds: [userEmbed] });

      // Show typing status in the thread
      await thread.sendTyping();

      // 3. Ask Gemini
      const systemPrompt = `Bạn là AI Tutor của ExamHub — trợ lý học tập cho học sinh THPT Việt Nam.
Học sinh: ${profile.full_name}, Lớp: ${profile.class || 'Chưa rõ'}.
Hãy giải thích từng bước rõ ràng, khoa học bằng tiếng Việt. Nếu có công thức toán/lý/hóa, hãy định dạng bằng LaTeX inline (ví dụ: $E = mc^2$ hoặc $H_2SO_4$). Trả lời thân thiện, súc tích và dễ hiểu.`;

      const aiResponse = await askGemini([{ role: 'user', content: cauHoi }], systemPrompt, 0.3);

      // Split responses if they are too long for a single Discord message (limit 2000 chars)
      const chunks = splitText(aiResponse, 1950);
      for (const chunk of chunks) {
        await thread.send({ content: chunk });
      }

    } catch (err) {
      console.error('[HOIBAI ERROR]', err);
      await interaction.followUp({ 
        content: `❌ Có lỗi xảy ra khi tạo luồng AI Tutor: ${err.message}`, 
        ephemeral: true 
      });
    }
  }
};

/**
 * Helper to split text into chunks of specified length
 */
function splitText(text, limit) {
  const chunks = [];
  let str = text;
  while (str.length > limit) {
    let chunk = str.substring(0, limit);
    // Try to split at a newline if possible
    const lastNewline = chunk.lastIndexOf('\n');
    if (lastNewline > limit * 0.7) {
      chunk = str.substring(0, lastNewline);
    }
    chunks.push(chunk);
    str = str.substring(chunk.length);
  }
  if (str.length > 0) {
    chunks.push(str);
  }
  return chunks;
}
