/**
 * Message Event Handler for conversational follow-ups (AI Tutor, etc.)
 */
const supabase = require('../utils/supabase');
const { askGemini } = require('../utils/ai');

/**
 * Handle conversational follow-up replies in AI Tutor threads
 * @param {Message} message - Discord message object
 */
async function handleThreadFollowUp(message) {
  const channel = message.channel;
  
  // 1. Get the thread owner ID (who created the thread)
  const threadOwnerId = channel.ownerId;
  if (!threadOwnerId) return;

  if (!supabase) return;

  // 2. Fetch the thread owner's profile to feed into the system prompt
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, class')
    .eq('discord_id', threadOwnerId)
    .maybeSingle();

  if (!profile) return;

  try {
    // Send typing indicator
    await channel.sendTyping();

    // 3. Fetch recent messages in the thread (limit to 15 to stay within token limits & context)
    const discordMsgs = await channel.messages.fetch({ limit: 15 });
    
    // Sort chronologically (oldest first)
    const sortedMsgs = Array.from(discordMsgs.values()).reverse();

    // 4. Map Discord messages to OpenAI-style messages for Gemini
    const messages = [];
    
    for (const msg of sortedMsgs) {
      // Ignore system embeds or commands, only process user text and bot text
      if (msg.author.bot) {
        if (msg.author.id === message.client.user.id && msg.content) {
          messages.push({ role: 'assistant', content: msg.content });
        }
      } else {
        if (msg.content) {
          messages.push({ role: 'user', content: msg.content });
        }
      }
    }

    if (messages.length === 0) return;

    // 5. Construct prompt & request Gemini
    const systemPrompt = `Bạn là AI Tutor của ExamHub — trợ lý học tập cho học sinh THPT Việt Nam.
Học sinh: ${profile.full_name}, Lớp: ${profile.class || 'Chưa rõ'}.
Hãy giải thích từng bước rõ ràng, khoa học bằng tiếng Việt. Nếu có công thức toán/lý/hóa, hãy định dạng bằng LaTeX inline (ví dụ: $E = mc^2$ hoặc $H_2SO_4$). Trả lời thân thiện, súc tích và dễ hiểu.`;

    const responseText = await askGemini(messages, systemPrompt, 0.3);

    // 6. Split & send chunks
    const chunks = splitText(responseText, 1950);
    for (const chunk of chunks) {
      await channel.send({ content: chunk });
    }
  } catch (err) {
    console.error('[FOLLOWUP ERROR]', err.message);
    await channel.send({ content: `❌ Có lỗi xảy ra khi gọi AI Tutor: ${err.message}` });
  }
}

/**
 * Helper to split text into chunks
 */
function splitText(text, limit) {
  const chunks = [];
  let str = text;
  while (str.length > limit) {
    let chunk = str.substring(0, limit);
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

module.exports = { handleThreadFollowUp };
