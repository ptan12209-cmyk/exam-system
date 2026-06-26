/**
 * Discord Bot - Real-time Voice Study Tracker
 * Monitors voice state changes (join, leave, deafen, mute) and syncs status/duration to the Next.js Web API.
 * Includes Express server for receiving DM requests from Web UI.
 * 
 * Dependencies:
 *   npm install discord.js axios dotenv express
 * 
 * Run using:
 *   node scripts/discord-bot/tracker.js
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios');
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

// Configuration
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || "YOUR_DISCORD_BOT_TOKEN";
const CLASS_VOICE_CHANNEL_ID = process.env.CLASS_VOICE_CHANNEL_ID || "YOUR_CLASS_VOICE_CHANNEL_ID";
const CLASS_TEXT_CHANNEL_ID = process.env.CLASS_TEXT_CHANNEL_ID || "";
const WEB_API_URL = process.env.WEB_API_URL || "http://localhost:3000/api/study-sessions/discord-sync";
const DISCORD_SYNC_SECRET = process.env.DISCORD_SYNC_SECRET || "discord_sync_secret_token_2026";
const BOT_API_PORT = parseInt(process.env.BOT_API_PORT || process.env.PORT || "8080", 10);

const AFK_VOICE_CHANNEL_ID = process.env.AFK_VOICE_CHANNEL_ID || "";
const AFK_DEAFEN_TIMEOUT_SECONDS = parseInt(process.env.AFK_DEAFEN_TIMEOUT_SECONDS || "600", 10);
const AFK_MUTE_TIMEOUT_SECONDS = parseInt(process.env.AFK_MUTE_TIMEOUT_SECONDS || "1800", 10);
const AFK_SCREENSHARE_TIMEOUT_SECONDS = parseInt(process.env.AFK_SCREENSHARE_TIMEOUT_SECONDS || "600", 10);
const CHECKIN_INTERVAL_SECONDS = parseInt(process.env.CHECKIN_INTERVAL_SECONDS || "2700", 10);
const AFK_REJOIN_COOLDOWN_SECONDS = parseInt(process.env.AFK_REJOIN_COOLDOWN_SECONDS || "300", 10);
const TEACHER_LOG_CHANNEL_ID = process.env.TEACHER_LOG_CHANNEL_ID || "";

const ANNOUNCE_CHANNEL_ID = process.env.ANNOUNCE_CHANNEL_ID || "";
const ARENA_CHANNEL_ID = process.env.ARENA_CHANNEL_ID || "";
const LIVE_CHANNEL_ID = process.env.LIVE_CHANNEL_ID || "";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = (SUPABASE_URL && SUPABASE_KEY) ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers
  ]
});

// Map to store active study sessions:
// userId -> { joinedAt, durationOffset, lastSyncedAt, deafened, deafenedSince, muted, mutedSince, mutedDuration, sharingScreen, sharingScreenSince, sharingScreenDuration, cameraOn, cameraSince, cameraDuration, screenShareReminderSent, joinTime, noScreenshareSince, lastCheckinTime }
const activeSessions = new Map();
const activeCheckins = new Map();
const afkCooldowns = new Map(); // userId -> cooldownExpiresAt (timestamp)

// Helper to send sync update to Next.js API
async function syncSession(userId, status, durationSeconds, deafened, mutedSeconds, sharingScreen, cameraOn, sharingScreenSeconds, cameraSeconds) {
  try {
    const response = await axios.post(WEB_API_URL, {
      discord_id: userId,
      status: status,
      duration_seconds: durationSeconds,
      deafened: !!deafened,
      muted_seconds: mutedSeconds || 0,
      sharing_screen: !!sharingScreen,
      camera_on: !!cameraOn,
      sharing_screen_seconds: sharingScreenSeconds || 0,
      camera_seconds: cameraSeconds || 0,
      secret_token: DISCORD_SYNC_SECRET
    });
    console.log(`[SYNC] ${userId}: status=${status}, duration=${Math.round(durationSeconds / 60)}m, muted=${Math.round((mutedSeconds || 0) / 60)}m, screenShare=${!!sharingScreen} (${Math.round((sharingScreenSeconds || 0) / 60)}m), camera=${!!cameraOn} (${Math.round((cameraSeconds || 0) / 60)}m)`);
    return response.data;
  } catch (error) {
    console.error(`[SYNC ERROR] Failed to sync user ${userId}:`, error.response?.data || error.message);
  }
}

// Gửi thông báo vi phạm real-time vào kênh log dành cho giáo viên
async function notifyTeacher(title, description, color = 0xF59E0B) {
  if (!TEACHER_LOG_CHANNEL_ID) return;
  try {
    const channel = client.channels.cache.get(TEACHER_LOG_CHANNEL_ID);
    if (!channel || !channel.isTextBased()) return;
    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setDescription(description)
      .setTimestamp()
      .setFooter({ text: 'ECODEx Learning System' });
    await channel.send({ embeds: [embed] });
  } catch (e) {
    console.error('[TEACHER LOG ERROR]', e.message);
  }
}

// Set cooldown khi học sinh bị move sang AFK
function setAfkCooldown(userId) {
  afkCooldowns.set(userId, Date.now() + AFK_REJOIN_COOLDOWN_SECONDS * 1000);
}

// Tính thời gian mute lũy kế cho một session
function getMutedDuration(session) {
  let total = session.mutedDuration || 0;
  if (session.muted && session.mutedSince) {
    total += Math.floor((Date.now() - session.mutedSince) / 1000);
  }
  return total;
}

// Tính thời gian chia sẻ màn hình lũy kế
function getSharingScreenDuration(session) {
  let total = session.sharingScreenDuration || 0;
  if (session.sharingScreen && session.sharingScreenSince) {
    total += Math.floor((Date.now() - session.sharingScreenSince) / 1000);
  }
  return total;
}

// Tính thời gian bật camera lũy kế
function getCameraDuration(session) {
  let total = session.cameraDuration || 0;
  if (session.cameraOn && session.cameraSince) {
    total += Math.floor((Date.now() - session.cameraSince) / 1000);
  }
  return total;
}

// ──────────────────── Express Server (nhận DM requests từ Web) ────────────────────

const app = express();
app.use(express.json());

app.post('/api/send-dm', async (req, res) => {
  const { discord_id, message, secret_token } = req.body;

  if (secret_token !== DISCORD_SYNC_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!discord_id || !message) {
    return res.status(400).json({ error: 'Missing discord_id or message' });
  }

  try {
    const user = await client.users.fetch(discord_id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('📢 Nhắc nhở từ Giáo viên')
      .setDescription(message)
      .setTimestamp()
      .setFooter({ text: 'ECODEx Learning System' });

    await user.send({ embeds: [embed] });
    console.log(`[DM SENT] Sent reminder to ${user.username}: "${message}"`);
    res.json({ success: true });
  } catch (error) {
    console.error('[DM ERROR]', error.message);
    res.status(500).json({ error: 'Failed to send DM: ' + error.message });
  }
});

app.post('/api/send-ping', async (req, res) => {
  const { discord_id, message, secret_token } = req.body;

  if (secret_token !== DISCORD_SYNC_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!discord_id || !message) {
    return res.status(400).json({ error: 'Missing discord_id or message' });
  }

  try {
    let targetChannel = null;
    
    if (CLASS_TEXT_CHANNEL_ID) {
      targetChannel = client.channels.cache.get(CLASS_TEXT_CHANNEL_ID);
    }

    if (!targetChannel) {
      // Fallback: Tìm kênh text trong cùng Server chứa kênh voice học tập
      const voiceChannel = client.channels.cache.get(CLASS_VOICE_CHANNEL_ID);
      if (voiceChannel && voiceChannel.guild) {
        const textChannels = voiceChannel.guild.channels.cache.filter(c => c.type === 0); // 0 = GuildText
        targetChannel = textChannels.find(c => 
          c.name.includes('classroom') || 
          c.name.includes('study') || 
          c.name.includes('general')
        ) || textChannels.first();
      }
    }

    if (!targetChannel) {
      return res.status(404).json({ error: 'Không tìm thấy kênh text để ping' });
    }

    await targetChannel.send(`<@${discord_id}> ${message}`);
    console.log(`[PING SENT] Pinged user <@${discord_id}> in #${targetChannel.name}: "${message}"`);
    res.json({ success: true, channel_name: targetChannel.name });
  } catch (error) {
    console.error('[PING ERROR]', error.message);
    res.status(500).json({ error: 'Failed to send ping: ' + error.message });
  }
});

app.post('/api/bot-control', async (req, res) => {
  const { command, discord_id, secret_token } = req.body;

  if (secret_token !== DISCORD_SYNC_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    if (command === 'status') {
      const activeMembers = [];
      const channel = client.channels.cache.get(CLASS_VOICE_CHANNEL_ID);
      if (channel && channel.isVoiceBased()) {
        for (const [memberId, member] of channel.members.entries()) {
          const session = activeSessions.get(memberId);
          activeMembers.push({
            username: member.user.username,
            discord_id: memberId,
            status: session?.deafened ? 'AFK' : session?.muted ? 'Muted' : 'Studying',
            joined_at: session?.joinedAt ? new Date(session.joinedAt).toISOString() : null
          });
        }
      }

      return res.json({
        online: true,
        bot_user: client.user?.tag || 'Unknown Bot',
        uptime: client.uptime,
        ping: client.ws.ping,
        voice_channel_id: CLASS_VOICE_CHANNEL_ID,
        voice_channel_name: channel?.name || 'Unknown',
        active_members: activeMembers
      });
    }

    if (command === 'move_to_afk') {
      if (!discord_id) {
        return res.status(400).json({ error: 'Missing discord_id' });
      }
      if (!AFK_VOICE_CHANNEL_ID) {
        return res.status(400).json({ error: 'AFK channel not configured' });
      }

      const channel = client.channels.cache.get(CLASS_VOICE_CHANNEL_ID);
      if (channel && channel.isVoiceBased()) {
        const member = channel.members.get(discord_id);
        if (member) {
          await member.voice.setChannel(AFK_VOICE_CHANNEL_ID);
          // #2 Set rejoin cooldown
          setAfkCooldown(discord_id);
          // Gửi tin nhắn thông báo
          const embed = new EmbedBuilder()
            .setColor(0xEF4444)
            .setTitle('🔇 Bạn đã bị chuyển sang phòng AFK')
            .setDescription(`Giáo viên đã chuyển bạn sang phòng AFK từ bảng điều khiển trên Web.\n\n⏳ Bạn cần đợi **${Math.round(AFK_REJOIN_COOLDOWN_SECONDS / 60)} phút** trước khi có thể quay lại phòng học.`)
            .setTimestamp()
            .setFooter({ text: 'ECODEx Learning System' });
          await member.send({ embeds: [embed] }).catch(() => null);

          return res.json({ success: true, message: `Moved user to AFK channel` });
        } else {
          return res.status(404).json({ error: 'Học sinh hiện không ở trong phòng học Discord' });
        }
      } else {
        return res.status(404).json({ error: 'Không tìm thấy phòng học hoặc phòng trống' });
      }
    } // Closes move_to_afk block

    if (command === 'start_class') {
      if (!CLASS_TEXT_CHANNEL_ID) {
        return res.status(400).json({ error: 'Chưa cấu hình CLASS_TEXT_CHANNEL_ID trong Bot' });
      }
      const channel = client.channels.cache.get(CLASS_TEXT_CHANNEL_ID);
      if (!channel) {
        return res.status(404).json({ error: 'Không tìm thấy kênh text để thông báo' });
      }

      const voiceChannel = client.channels.cache.get(CLASS_VOICE_CHANNEL_ID);
      const voiceChannelLink = voiceChannel ? `discord://discordapp.com/channels/${voiceChannel.guild.id}/${CLASS_VOICE_CHANNEL_ID}` : '';

      const embed = new EmbedBuilder()
        .setColor(0x10B981)
        .setTitle('📢 THÔNG BÁO: BẮT ĐẦU BUỔI HỌC CHUNG!')
        .setDescription(`Giáo viên đã bắt đầu buổi học chung. Các em hãy tham gia phòng học ngay nhé!\n\n🎙️ **Kênh Voice**: <#${CLASS_VOICE_CHANNEL_ID}>\n🔗 **Link tham gia nhanh**: [Bấm vào đây để vào phòng](${voiceChannelLink || 'https://discord.com'})`)
        .setTimestamp()
        .setFooter({ text: 'ECODEx Learning System' });

      await channel.send({ content: '@everyone 📢 Buổi học chung đã bắt đầu!', embeds: [embed] });
      return res.json({ success: true, message: 'Đã gửi thông báo bắt đầu buổi học chung thành công' });
    }

    return res.status(400).json({ error: 'Unknown command' });
  } catch (error) {
    console.error('[BOT CONTROL ERROR]', error.message);
    res.status(500).json({ error: 'Failed to execute command: ' + error.message });
  }
});

app.listen(BOT_API_PORT, () => {
  console.log(`[EXPRESS] DM API server listening on port ${BOT_API_PORT}`);
});

// ──────────────────── Slash Commands ────────────────────

const commands = [
  new SlashCommandBuilder()
    .setName('status')
    .setDescription('Xem trạng thái học tập hiện tại của bạn trên Discord'),
  new SlashCommandBuilder()
    .setName('streak')
    .setDescription('Xem chuỗi ngày học liên tiếp của bạn'),
  new SlashCommandBuilder()
    .setName('topstudy')
    .setDescription('Xem bảng xếp hạng học tập chăm chỉ trong tuần'),
  new SlashCommandBuilder()
    .setName('alert-dm')
    .setDescription('Gửi nhắc nhở trực tiếp (DM) đến học sinh qua Bot')
    .addUserOption(option => 
      option.setName('student')
        .setDescription('Học sinh nhận nhắc nhở')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('message')
        .setDescription('Nội dung tin nhắn nhắc nhở')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  new SlashCommandBuilder()
    .setName('alert-ping')
    .setDescription('Ping nhắc nhở học sinh công khai trong kênh chat')
    .addUserOption(option => 
      option.setName('student')
        .setDescription('Học sinh nhận nhắc nhở')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('message')
        .setDescription('Nội dung tin nhắn nhắc nhở')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  new SlashCommandBuilder()
    .setName('lienket')
    .setDescription('Liên kết tài khoản Discord của bạn với tài khoản ExamHub'),
  new SlashCommandBuilder()
    .setName('diemdanh')
    .setDescription('Điểm danh nhận thưởng XP hàng ngày'),
  new SlashCommandBuilder()
    .setName('baocao')
    .setDescription('Xem báo cáo chuyên cần phòng học hôm nay')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  new SlashCommandBuilder()
    .setName('arena')
    .setDescription('Tạo phòng thi đấu Arena trên Discord')
    .addStringOption(option => 
      option.setName('ten_de')
        .setDescription('Từ khóa tên đề thi cần tìm')
        .setRequired(true))
    .addRoleOption(option => 
      option.setName('tag_lop')
        .setDescription('Tag role lớp học để ping thông báo')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  new SlashCommandBuilder()
    .setName('thongke')
    .setDescription('Xem thống kê học tập và thi cử của cả lớp')
    .addStringOption(option => 
      option.setName('ten_de')
        .setDescription('Xem điểm cụ thể của một đề thi')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  new SlashCommandBuilder()
    .setName('xeploai')
    .setDescription('Xem bảng xếp hạng XP học tập cao nhất toàn Server'),
  new SlashCommandBuilder()
    .setName('hocsinh')
    .setDescription('Xem profile chi tiết một học sinh')
    .addUserOption(option => 
      option.setName('student')
        .setDescription('Học sinh cần xem profile')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  new SlashCommandBuilder()
    .setName('thi')
    .setDescription('Xem danh sách đề thi đang mở trên ExamHub'),
  new SlashCommandBuilder()
    .setName('xp')
    .setDescription('Xem cấp độ, điểm kinh nghiệm và tiến trình học tập của bạn')
].map(cmd => cmd.toJSON());

// ──────────────────── Bot Events ────────────────────

client.once('ready', async () => {
  console.log(`=============================================`);
  console.log(`Discord voice tracker bot is logged in as ${client.user.tag}`);
  console.log(`Target voice channel ID: ${CLASS_VOICE_CHANNEL_ID}`);
  console.log(`API Target URL: ${WEB_API_URL}`);
  console.log(`=============================================`);

  // Đăng ký slash commands
  try {
    const rest = new REST({ version: '10' }).setToken(DISCORD_BOT_TOKEN);
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('[COMMANDS] Registered Discord Bot slash commands.');
  } catch (err) {
    console.error('[COMMANDS ERROR]', err.message);
  }

  // Khởi chạy các listener Realtime kết nối database
  if (supabase) {
    setupRealtimeSubscriptions();
    console.log('[SUPABASE] Connected to Realtime Database.');
  } else {
    console.warn('[SUPABASE] Warning: Supabase client is not configured.');
  }
});

// Xử lý slash command interactions
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const userId = interaction.user.id;

  if (interaction.commandName === 'status') {
    const session = activeSessions.get(userId);
    if (!session) {
      await interaction.reply({ content: '❌ Bạn chưa tham gia kênh voice học tập.', ephemeral: true });
      return;
    }

    let currentDuration = session.durationOffset;
    if (!session.deafened) {
      currentDuration += Math.floor((Date.now() - session.joinedAt) / 1000);
    }
    const mutedTotal = getMutedDuration(session);
    const screenShareTotal = getSharingScreenDuration(session);
    const cameraTotal = getCameraDuration(session);
    const statusLabel = session.deafened ? '🔇 AFK / Tắt tiếng' : session.muted ? '🔕 Tắt mic' : '🎧 Đang học';

    const embed = new EmbedBuilder()
      .setColor(session.deafened ? 0xF59E0B : 0x10B981)
      .setTitle('📊 Trạng thái học Discord')
      .addFields(
        { name: 'Trạng thái', value: statusLabel, inline: true },
        { name: 'Thời gian học', value: `${Math.round(currentDuration / 60)} phút`, inline: true },
        { name: 'Thời gian tắt mic', value: `${Math.round(mutedTotal / 60)} phút`, inline: true },
        { name: 'Chia sẻ màn hình', value: `${session.sharingScreen ? '🟢 Đang bật' : '🔴 Đang tắt'} (${Math.round(screenShareTotal / 60)} phút)`, inline: true },
        { name: 'Webcam/Camera', value: `${session.cameraOn ? '🟢 Đang bật' : '🔴 Đang tắt'} (${Math.round(cameraTotal / 60)} phút)`, inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }

  if (interaction.commandName === 'streak') {
    try {
      const baseUrl = process.env.WEB_API_URL?.replace('/api/study-sessions/discord-sync', '') || 'http://localhost:3000';
      const resp = await axios.get(`${baseUrl}/api/study-sessions/discord-heatmap`, {
        params: { student_id: userId }
      }).catch(() => null);

      const session = activeSessions.get(userId);
      let streakValue = resp?.data?.streak || 0;

      const embed = new EmbedBuilder()
        .setColor(0x6366F1)
        .setTitle('🔥 Chuỗi ngày học')
        .setDescription(streakValue > 0
          ? `Bạn đã học liên tiếp **${streakValue} ngày**! Tiếp tục duy trì nhé! 💪`
          : 'Bạn chưa có chuỗi ngày học nào. Hãy bắt đầu ngay hôm nay!')
        .setTimestamp();

      if (session) {
        let currentDuration = session.durationOffset;
        if (!session.deafened) {
          currentDuration += Math.floor((Date.now() - session.joinedAt) / 1000);
        }
        embed.addFields({ name: 'Hôm nay', value: `${Math.round(currentDuration / 60)} phút`, inline: true });
      }

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (err) {
      await interaction.reply({ content: '❌ Không thể lấy thông tin streak.', ephemeral: true });
    }
  }

  if (interaction.commandName === 'topstudy') {
    try {
      await interaction.deferReply();

      const baseUrl = process.env.WEB_API_URL?.replace('/api/study-sessions/discord-sync', '') || 'http://localhost:3000';
      const resp = await axios.get(`${baseUrl}/api/study-sessions/top-weekly`, {
        headers: {
          'Authorization': `Bearer ${DISCORD_SYNC_SECRET}`
        }
      }).catch(err => {
        console.error('[TOPSTUDY FETCH ERROR]', err.message);
        return null;
      });

      const topList = resp?.data?.top_list || [];

      if (!topList || topList.length === 0) {
        await interaction.editReply('📭 Chưa ghi nhận thời gian tự học nào của học sinh trong tuần này.');
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(0xF59E0B)
        .setTitle('🏆 BẢNG XẾP HẠNG HỌC TẬP CHĂM CHỈ (TUẦN NÀY)')
        .setDescription('Tổng hợp thời gian tự học hợp lệ của học sinh trên Discord tính từ Thứ 2 đầu tuần.')
        .setTimestamp()
        .setFooter({ text: 'ECODEx Learning System' });

      const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
      let descriptionText = '';

      topList.forEach((item, index) => {
        const medal = medals[index] || '👤';
        const hours = (item.total_seconds / 3600).toFixed(1);
        descriptionText += `${medal} **${item.full_name}** (${item.class || 'Chưa rõ lớp'}): **${hours} giờ** học\n`;
      });

      embed.setDescription(descriptionText || 'Chưa có dữ liệu.');

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('[TOPSTUDY ERROR]', error.message);
      await interaction.editReply('❌ Không thể lấy bảng xếp hạng tuần lúc này. Vui lòng thử lại sau.');
    }
  }

  if (interaction.commandName === 'alert-dm') {
    if (!interaction.memberPermissions.has(PermissionFlagsBits.ModerateMembers)) {
      await interaction.reply({ content: '❌ Bạn không có quyền thực hiện lệnh này (yêu cầu quyền Moderate Members).', ephemeral: true });
      return;
    }

    const studentUser = interaction.options.getUser('student');
    const messageText = interaction.options.getString('message');

    try {
      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('📢 Nhắc nhở từ Giáo viên')
        .setDescription(messageText)
        .setTimestamp()
        .setFooter({ text: 'ECODEx Learning System' });

      await studentUser.send({ embeds: [embed] });
      await interaction.reply({ content: `✅ Đã gửi DM nhắc nhở thành công đến **${studentUser.username}**.`, ephemeral: true });
      console.log(`[DM SENT] ${interaction.user.username} sent DM to ${studentUser.username}: "${messageText}"`);
    } catch (error) {
      await interaction.reply({ content: `❌ Không thể gửi DM: ${error.message}`, ephemeral: true });
    }
  }

  if (interaction.commandName === 'alert-ping') {
    if (!interaction.memberPermissions.has(PermissionFlagsBits.ModerateMembers)) {
      await interaction.reply({ content: '❌ Bạn không có quyền thực hiện lệnh này (yêu cầu quyền Moderate Members).', ephemeral: true });
      return;
    }

    const studentUser = interaction.options.getUser('student');
    const messageText = interaction.options.getString('message');

    try {
      let targetChannel = interaction.channel;
      
      if (CLASS_TEXT_CHANNEL_ID) {
        const configuredChannel = client.channels.cache.get(CLASS_TEXT_CHANNEL_ID);
        if (configuredChannel && configuredChannel.isTextBased()) {
          targetChannel = configuredChannel;
        }
      }

      if (!targetChannel) {
        await interaction.reply({ content: '❌ Không tìm thấy kênh chat để ping.', ephemeral: true });
        return;
      }

      await targetChannel.send(`<@${studentUser.id}> ${messageText}`);
      await interaction.reply({ content: `✅ Đã ping nhắc nhở thành công học sinh **${studentUser.username}** trong kênh <#${targetChannel.id}>.`, ephemeral: true });
      console.log(`[PING SENT] ${interaction.user.username} pinged ${studentUser.username} in #${targetChannel.name}: "${messageText}"`);
    } catch (error) {
      await interaction.reply({ content: `❌ Không thể gửi tin nhắn ping: ${error.message}`, ephemeral: true });
    }
  }

  if (interaction.commandName === 'lienket') {
    await interaction.deferReply({ ephemeral: true });
    const discordUsername = interaction.user.username;
    
    if (!supabase) {
      return await interaction.followup.send({ content: '❌ Kết nối cơ sở dữ liệu chưa sẵn sàng.', ephemeral: true });
    }
    
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('discord_id', userId)
      .maybeSingle();
      
    if (existingProfile) {
      const embed = new EmbedBuilder()
        .setColor(0x10B981)
        .setTitle('✅ Đã liên kết rồi!')
        .setDescription(`Tài khoản Discord này đã liên kết với học sinh **${existingProfile.full_name}** trên ExamHub.`)
        .setTimestamp();
      return await interaction.followup.send({ embeds: [embed], ephemeral: true });
    }
    
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let token = '';
    for (let i = 0; i < 8; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const { error: insertError } = await supabase
      .from('discord_link_tokens')
      .insert({
        token: token,
        discord_id: userId,
        discord_username: discordUsername,
        expires_at: expiresAt
      });
      
    if (insertError) {
      console.error('Failed to create link token:', insertError);
      return await interaction.followup.send({ content: '❌ Lỗi hệ thống khi tạo mã xác thực. Vui lòng thử lại sau.', ephemeral: true });
    }
    
    const baseUrl = process.env.WEB_API_URL?.replace('/api/study-sessions/discord-sync', '') || 'https://luyende.id.vn';
    const embed = new EmbedBuilder()
      .setColor(0x7C3AED)
      .setTitle('🔗 LIÊN KẾT TÀI KHOẢN EXAMHUB')
      .setDescription('Vui lòng làm theo hướng dẫn dưới đây để hoàn tất liên kết tài khoản:')
      .addFields(
        { name: 'Mã xác thực của bạn (nhấp để copy)', value: `\`\`\`${token}\`\`\``, inline: false },
        { name: 'Các bước tiếp theo', value: `1. Vào trang web ExamHub: [Bấm vào đây](${baseUrl}/settings/discord)\n2. Nhập mã xác thực ở trên\n3. Nhấn **Xác nhận liên kết**`, inline: false }
      )
      .setFooter({ text: '⚠️ Mã xác thực sẽ hết hạn sau 10 phút.' })
      .setTimestamp();
      
    await interaction.followup.send({ embeds: [embed], ephemeral: true });
  }

  if (interaction.commandName === 'diemdanh') {
    await interaction.deferReply({ ephemeral: true });
    const baseUrl = process.env.WEB_API_URL?.replace('/api/study-sessions/discord-sync', '') || 'http://localhost:3000';
    
    try {
      const response = await axios.post(`${baseUrl}/api/discord/daily-checkin`, {
        discord_id: userId,
        secret_token: DISCORD_SYNC_SECRET
      });
      
      const result = response.data;
      
      if (result.already_checked) {
        const embed = new EmbedBuilder()
          .setColor(0xF59E0B)
          .setTitle('✅ Bạn đã điểm danh hôm nay!')
          .setDescription(`Bạn đã nhận phần thưởng điểm danh hàng ngày rồi.\nStreak hiện tại: 🔥 **${result.streak} ngày**`)
          .setTimestamp()
          .setFooter({ text: 'ECODEx Learning System' });
        return await interaction.followup.send({ embeds: [embed], ephemeral: true });
      }
      
      const level = result.level || 1;
      const xp = result.xp || 0;
      const nextLevelXp = result.next_level_xp || 100;
      const prevLevelXp = Math.pow(level - 1, 2) * 100;
      const percent = Math.min(Math.max(((xp - prevLevelXp) / (nextLevelXp - prevLevelXp)) * 100, 0), 100);
      
      const barFilled = Math.round(percent / 10);
      const bar = '█'.repeat(barFilled) + '░'.repeat(Math.max(10 - barFilled, 0));
      
      const embed = new EmbedBuilder()
        .setColor(0x10B981)
        .setTitle('🎉 ĐIỂM DANH THÀNH CÔNG!')
        .setDescription(`Cảm ơn bạn đã tự giác điểm danh hôm nay!`)
        .addFields(
          { name: 'XP nhận được', value: `**+${result.xp_earned} XP**`, inline: true },
          { name: 'Chuỗi ngày (Streak)', value: `🔥 **${result.streak} ngày**`, inline: true }
        );
        
      if (result.newAchievements && result.newAchievements.length > 0) {
        embed.addFields({ name: '🏆 Thành tựu mới mở khóa', value: result.newAchievements.map(a => `• **${a}**`).join('\n') + `\n(Thưởng thêm **+${result.achievementXp} XP**!)`, inline: false });
      }
      
      embed.addFields(
        { name: `Cấp độ hiện tại: Level ${level}`, value: `\`${bar}\` ${Math.round(percent)}%\nXP: **${xp} / ${nextLevelXp}**`, inline: false }
      )
      .setTimestamp()
      .setFooter({ text: 'ECODEx Gamification System' });
      
      await interaction.followup.send({ embeds: [embed], ephemeral: true });
    } catch (err) {
      console.error('Checkin command error:', err.response?.data || err.message);
      const errMsg = err.response?.data?.error || 'Có lỗi xảy ra khi thực hiện điểm danh. Bạn đã liên kết tài khoản chưa?';
      await interaction.followup.send({ content: `❌ ${errMsg}`, ephemeral: true });
    }
  }

  if (interaction.commandName === 'baocao') {
    if (!interaction.memberPermissions.has(PermissionFlagsBits.ModerateMembers)) {
      return await interaction.reply({ content: '❌ Bạn không có quyền thực hiện lệnh này.', ephemeral: true });
    }
    
    await interaction.deferReply();
    const baseUrl = process.env.WEB_API_URL?.replace('/api/study-sessions/discord-sync', '') || 'http://localhost:3000';
    
    try {
      const response = await axios.get(`${baseUrl}/api/discord/report`, {
        params: { secret_token: DISCORD_SYNC_SECRET }
      });
      
      const report = response.data;
      const dateFormatted = new Date(report.date).toLocaleDateString('vi-VN');
      
      const embed = new EmbedBuilder()
        .setColor(0x6366F1)
        .setTitle(`📋 BÁO CÁO CHUYÊN CẦN DISCORD — HÔM NAY (${dateFormatted})`)
        .addFields(
          { name: '👥 Học sinh tham gia', value: `**${report.active_students_count}**`, inline: true },
          { name: '⏱️ Học trung bình', value: `**${report.avg_duration_minutes} phút/phiên**`, inline: true },
          { name: '📝 Tổng số ca học', value: `**${report.total_sessions} ca**`, inline: true }
        );
        
      const students = report.students || [];
      if (students.length === 0) {
        embed.setDescription('📭 Chưa ghi nhận phiên tự học nào hôm nay.');
      } else {
        const listLines = students.map(s => {
          const activeH = (s.active_seconds / 3600).toFixed(1);
          const afkM = Math.round(s.afk_seconds / 60);
          const alertMarker = s.afk_violations > 0 ? '⚠️' : '✅';
          return `${alertMarker} **${s.full_name}**: **${activeH} giờ** học thực chất ${s.afk_violations > 0 ? `(AFK ${afkM}p)` : ''}`;
        });
        
        embed.setDescription(listLines.join('\n'));
      }
      
      await interaction.followup.send({ embeds: [embed] });
    } catch (err) {
      console.error('Report command error:', err.response?.data || err.message);
      await interaction.followup.send({ content: '❌ Không thể tải báo cáo từ máy chủ.', ephemeral: true });
    }
  }

  if (interaction.commandName === 'arena') {
    if (!interaction.memberPermissions.has(PermissionFlagsBits.ModerateMembers)) {
      return await interaction.reply({ content: '❌ Bạn không có quyền thực hiện lệnh này.', ephemeral: true });
    }
    
    await interaction.deferReply();
    const ten_de = interaction.options.getString('ten_de');
    const tag_lop = interaction.options.getRole('tag_lop');
    
    if (!supabase) {
      return await interaction.followup.send({ content: '❌ Cơ sở dữ liệu chưa sẵn sàng.' });
    }
    
    // Search exams in Supabase
    const { data: exams, error: searchErr } = await supabase
      .from('exams')
      .select('id, title, duration, total_questions, subject')
      .ilike('title', `%${ten_de}%`)
      .limit(5);
      
    if (searchErr || !exams || exams.length === 0) {
      return await interaction.followup.send({ content: `❌ Không tìm thấy đề thi nào chứa từ khóa **${ten_de}**` });
    }
    
    if (exams.length === 1) {
      // Create arena session directly
      await executeCreateArena(interaction, exams[0], tag_lop);
    } else {
      // Let teacher select which exam
      const options = exams.map(e => ({
        label: e.title.substring(0, 100),
        description: `Môn: ${e.subject || 'Chung'} · ${e.total_questions} câu · ${e.duration}p`,
        value: `arena_create_${e.id}_${tag_lop ? tag_lop.id : 'none'}`
      }));
      
      const selectMenu = {
        type: 3, // StringSelect
        custom_id: `arena_select_menu_${interaction.user.id}`,
        placeholder: 'Chọn đề thi muốn tổ chức Arena...',
        options: options
      };
      
      const actionRow = new ActionRowBuilder().addComponents(selectMenu);
      await interaction.followup.send({ content: '📝 Tìm thấy nhiều đề thi khớp. Vui lòng chọn đề bên dưới:', components: [actionRow] });
    }
  }

  if (interaction.commandName === 'thongke') {
    if (!interaction.memberPermissions.has(PermissionFlagsBits.ModerateMembers)) {
      return await interaction.reply({ content: '❌ Bạn không có quyền thực hiện lệnh này.', ephemeral: true });
    }
    
    await interaction.deferReply({ ephemeral: true });
    const ten_de = interaction.options.getString('ten_de');
    
    if (!supabase) {
      return await interaction.followup.send({ content: '❌ Cơ sở dữ liệu chưa sẵn sàng.', ephemeral: true });
    }
    
    // Query statistics of exams and submissions
    const { data: submissions, error: subError } = await supabase
      .from('submissions')
      .select('score, time_spent, student_id, exam:exams(title)');
      
    if (subError || !submissions || submissions.length === 0) {
      return await interaction.followup.send({ content: '📭 Chưa ghi nhận bài nộp nào trên hệ thống.', ephemeral: true });
    }
    
    let filteredSubmissions = submissions;
    if (ten_de) {
      filteredSubmissions = submissions.filter(s => s.exam?.title?.toLowerCase().includes(ten_de.toLowerCase()));
      if (filteredSubmissions.length === 0) {
        return await interaction.followup.send({ content: `📭 Không tìm thấy kết quả làm bài của đề thi có chứa từ khóa **${ten_de}**.`, ephemeral: true });
      }
    }
    
    // Process stats
    const totalSubmissions = filteredSubmissions.length;
    const scores = filteredSubmissions.map(s => Number(s.score) || 0);
    const avgScore = scores.reduce((sum, s) => sum + s, 0) / totalSubmissions;
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);
    const avgTimeSpent = filteredSubmissions.reduce((sum, s) => sum + (s.time_spent || 0), 0) / totalSubmissions;
    
    const embed = new EmbedBuilder()
      .setColor(0x6366F1)
      .setTitle(`📊 Thống Kê Lớp Học ${ten_de ? `(${ten_de})` : ''}`)
      .addFields(
        { name: '📝 Tổng bài nộp', value: `${totalSubmissions} bài`, inline: true },
        { name: '🎯 Điểm trung bình', value: `${avgScore.toFixed(1)}/10`, inline: true },
        { name: '⏱️ Thời gian TB', value: `${Math.round(avgTimeSpent / 60)} phút`, inline: true },
        { name: '🏆 Điểm cao nhất', value: `${maxScore.toFixed(1)}/10`, inline: true },
        { name: '📉 Điểm thấp nhất', value: `${minScore.toFixed(1)}/10`, inline: true }
      )
      .setTimestamp()
      .setFooter({ text: 'ECODEx Statistical Engine' });
      
    await interaction.followup.send({ embeds: [embed], ephemeral: true });
  }

  if (interaction.commandName === 'xeploai') {
    await interaction.deferReply();
    
    if (!supabase) {
      return await interaction.followup.send({ content: '❌ Cơ sở dữ liệu chưa sẵn sàng.' });
    }
    
    const { data: leaderboard, error: leadError } = await supabase
      .from('student_stats')
      .select('xp, level, profile:profiles(full_name)')
      .order('xp', { ascending: false })
      .limit(10);
      
    if (leadError || !leaderboard || leaderboard.length === 0) {
      return await interaction.followup.send({ content: '📭 Chưa có dữ liệu bảng xếp hạng XP.' });
    }
    
    const embed = new EmbedBuilder()
      .setColor(0xF59E0B)
      .setTitle('🏆 BẢNG XẾP HẠNG XP HỌC TẬP')
      .setDescription('Danh sách học sinh tích lũy nhiều XP nhất từ học tập và thi cử.')
      .setTimestamp()
      .setFooter({ text: 'ECODEx Gamification System' });
      
    const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    let desc = '';
    
    leaderboard.forEach((item, index) => {
      const profile = Array.isArray(item.profile) ? item.profile[0] : item.profile;
      const name = profile?.full_name || 'Học sinh';
      const medal = medals[index] || '👤';
      desc += `${medal} **${index + 1}.** ${name} — Level **${item.level}** · **${(item.xp || 0).toLocaleString()}** XP\n`;
    });
    
    embed.setDescription(desc || 'Không có dữ liệu.');
    await interaction.followup.send({ embeds: [embed] });
  }

  if (interaction.commandName === 'hocsinh') {
    if (!interaction.memberPermissions.has(PermissionFlagsBits.ModerateMembers)) {
      return await interaction.reply({ content: '❌ Bạn không có quyền thực hiện lệnh này.', ephemeral: true });
    }
    
    await interaction.deferReply({ ephemeral: true });
    const targetMember = interaction.options.getMember('student');
    
    if (!supabase) {
      return await interaction.followup.send({ content: '❌ Cơ sở dữ liệu chưa sẵn sàng.', ephemeral: true });
    }
    
    const { data: profile, error: pErr } = await supabase
      .from('profiles')
      .select('id, full_name, class, discord_username')
      .eq('discord_id', targetMember.id)
      .maybeSingle();
      
    if (pErr || !profile) {
      return await interaction.followup.send({ content: `❌ Học sinh **${targetMember.user.username}** chưa liên kết tài khoản ExamHub.`, ephemeral: true });
    }
    
    const { data: stats } = await supabase
      .from('student_stats')
      .select('xp, level, streak_days, exams_completed, perfect_scores')
      .eq('user_id', profile.id)
      .maybeSingle();
      
    const { data: logs } = await supabase
      .from('discord_attendance_logs')
      .select('total_active_seconds, total_afk_seconds')
      .eq('student_id', profile.id);
      
    let totalActiveSecs = 0;
    let totalAfkSecs = 0;
    if (logs) {
      logs.forEach(l => {
        totalActiveSecs += l.total_active_seconds || 0;
        totalAfkSecs += l.total_afk_seconds || 0;
      });
    }
    
    const examhubUrl = process.env.WEB_API_URL?.replace('/api/study-sessions/discord-sync', '') || 'https://luyende.id.vn';
    
    const embed = new EmbedBuilder()
      .setColor(0x6366F1)
      .setTitle(`👤 Hồ sơ: ${profile.full_name}`)
      .setDescription(`Lớp: **${profile.class || 'Chưa rõ'}** · Discord: @${profile.discord_username || targetMember.user.username}`)
      .setThumbnail(targetMember.user.displayAvatarURL())
      .addFields(
        { name: '⭐ Level', value: `**Level ${stats?.level || 1}**`, inline: true },
        { name: '✨ Tổng XP', value: `**${(stats?.xp || 0).toLocaleString()} XP**`, inline: true },
        { name: '🔥 Streak', value: `**${stats?.streak_days || 0} ngày**`, inline: true },
        { name: '📝 Đề đã làm', value: `**${stats?.exams_completed || 0} đề**`, inline: true },
        { name: '💯 Điểm 10', value: `**${stats?.perfect_scores || 0} lần**`, inline: true },
        { name: '⏱️ Học Voice', value: `**${(totalActiveSecs / 3600).toFixed(1)}h** (AFK: ${Math.round(totalAfkSecs / 60)}p)`, inline: true },
        { name: '🔗 Xem chi tiết', value: `[Trang cá nhân](${examhubUrl}/student/profile/${profile.id})`, inline: false }
      )
      .setTimestamp();
      
    await interaction.followup.send({ embeds: [embed], ephemeral: true });
  }

  if (interaction.commandName === 'thi') {
    await interaction.deferReply({ ephemeral: true });
    
    if (!supabase) {
      return await interaction.followup.send({ content: '❌ Cơ sở dữ liệu chưa sẵn sàng.', ephemeral: true });
    }
    
    const { data: exams, error: exErr } = await supabase
      .from('exams')
      .select('id, title, duration, total_questions, subject')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(5);
      
    if (exErr || !exams || exams.length === 0) {
      return await interaction.followup.send({ content: '📭 Hiện chưa có đề thi nào đang mở.', ephemeral: true });
    }
    
    const examhubUrl = process.env.WEB_API_URL?.replace('/api/study-sessions/discord-sync', '') || 'https://luyende.id.vn';
    const embed = new EmbedBuilder()
      .setColor(0x6366F1)
      .setTitle('📝 ĐỀ THI ĐANG MỞ TRÊN EXAMHUB')
      .setDescription('Nhấn vào tiêu đề đề thi dưới đây để làm bài:')
      .setTimestamp();
      
    exams.forEach(e => {
      embed.addFields({
        name: `📝 ${e.title}`,
        value: `Môn: **${e.subject || 'Chung'}** · ${e.total_questions || 0} câu · ${e.duration || 60} phút\n🔗 [Vào làm bài thi ngay tại đây](${examhubUrl}/student/exams/${e.id})`,
        inline: false
      });
    });
    
    await interaction.followup.send({ embeds: [embed], ephemeral: true });
  }

  if (interaction.commandName === 'xp') {
    await interaction.deferReply({ ephemeral: true });
    
    if (!supabase) {
      return await interaction.followup.send({ content: '❌ Cơ sở dữ liệu chưa sẵn sàng.', ephemeral: true });
    }
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('discord_id', userId)
      .maybeSingle();
      
    if (!profile) {
      return await interaction.followup.send({ content: '❌ Bạn chưa liên kết tài khoản! Sử dụng lệnh **/lienket** nhé.', ephemeral: true });
    }
    
    const { data: stats } = await supabase
      .from('student_stats')
      .select('xp, level')
      .eq('user_id', profile.id)
      .maybeSingle();
      
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
      
    await interaction.followup.send({ embeds: [embed], ephemeral: true });
  }
});

// Event listener: voiceStateUpdate
client.on('voiceStateUpdate', async (oldState, newState) => {
  const userId = newState.id;
  const username = newState.member?.user?.username || userId;
  const isDeafened = newState.selfDeaf || newState.serverDeaf;
  const isMuted = newState.selfMute || newState.serverMute;
  const isSharingScreen = newState.streaming;
  const isCameraOn = newState.selfVideo;

  // Case 1: Joined the classroom voice channel
  if (newState.channelId === CLASS_VOICE_CHANNEL_ID && oldState.channelId !== CLASS_VOICE_CHANNEL_ID) {
    // #2 Rejoin Cooldown: Kiểm tra cooldown trước khi cho phép tham gia
    const cooldownExpires = afkCooldowns.get(userId);
    if (cooldownExpires && Date.now() < cooldownExpires) {
      const remainingSeconds = Math.ceil((cooldownExpires - Date.now()) / 1000);
      console.log(`[COOLDOWN BLOCKED] ${username} tried to rejoin but cooldown active (${remainingSeconds}s remaining).`);
      
      try {
        if (AFK_VOICE_CHANNEL_ID) {
          await newState.member.voice.setChannel(AFK_VOICE_CHANNEL_ID);
        } else {
          await newState.member.voice.disconnect();
        }
        const embed = new EmbedBuilder()
          .setColor(0xEF4444)
          .setTitle('⏳ Bạn đang trong thời gian chờ')
          .setDescription(`Bạn đã bị chuyển sang phòng AFK trước đó. Vui lòng đợi thêm **${Math.ceil(remainingSeconds / 60)} phút** trước khi quay lại phòng học.`)
          .setTimestamp()
          .setFooter({ text: 'ECODEx Learning System' });
        await newState.member.send({ embeds: [embed] }).catch(() => null);
      } catch (e) {
        console.error(`[COOLDOWN ERROR] Failed to enforce cooldown for ${userId}:`, e.message);
      }
      return;
    }
    // Xóa cooldown đã hết hạn
    afkCooldowns.delete(userId);

    console.log(`[JOIN] ${username} entered the classroom.`);
    activeSessions.set(userId, {
      joinedAt: Date.now(),
      durationOffset: 0,
      lastSyncedAt: Date.now(),
      deafened: isDeafened,
      deafenedSince: isDeafened ? Date.now() : null,
      muted: isMuted,
      mutedSince: isMuted ? Date.now() : null,
      mutedDuration: 0,
      sharingScreen: isSharingScreen,
      sharingScreenSince: isSharingScreen ? Date.now() : null,
      sharingScreenDuration: 0,
      cameraOn: isCameraOn,
      cameraSince: isCameraOn ? Date.now() : null,
      cameraDuration: 0,
      screenShareReminderSent: isSharingScreen,
      joinTime: Date.now(),
      noScreenshareSince: isSharingScreen ? null : Date.now(),
      lastCheckinTime: Date.now(),
      // #1 Escalation Warning: Tracking warning levels per violation type
      deafenWarningLevel: 0,
      muteWarningLevel: 0,
      screenshareWarningLevel: 0
    });

    const status = isDeafened ? 'discord_afk' : 'discord_class';
    await syncSession(
      userId, status, 0, isDeafened, 0,
      isSharingScreen, isCameraOn, 0, 0
    );

    // #6 Join-Mute Detection: Cảnh báo ngay nếu join với mic tắt
    if (isMuted && !isDeafened) {
      console.log(`[JOIN-MUTE] ${username} joined with mic already muted!`);
      try {
        const embed = new EmbedBuilder()
          .setColor(0xF59E0B)
          .setTitle('⚠️ Cảnh báo: Mic đang tắt')
          .setDescription('Bạn đã vào phòng học với mic bị tắt. Vui lòng bật mic để thầy cô có thể tương tác với bạn. Nếu tiếp tục tắt mic, bạn sẽ bị chuyển sang phòng AFK.')
          .setTimestamp()
          .setFooter({ text: 'ECODEx Learning System' });
        await newState.member.send({ embeds: [embed] }).catch(() => null);
      } catch (e) {
        console.error(`[JOIN-MUTE DM ERROR]`, e.message);
      }
      // #3 Thông báo cho giáo viên
      await notifyTeacher(
        '⚠️ Học sinh vào phòng với mic tắt',
        `**${username}** (<@${userId}>) đã tham gia phòng học với mic đã tắt sẵn. Có thể cần theo dõi thêm.`,
        0xF59E0B
      );
    }
  }

  // Case 2: Left the classroom voice channel
  else if (oldState.channelId === CLASS_VOICE_CHANNEL_ID && newState.channelId !== CLASS_VOICE_CHANNEL_ID) {
    console.log(`[LEAVE] ${username} left the classroom.`);
    const session = activeSessions.get(userId);
    if (session) {
      // Calculate final duration
      let finalDuration = session.durationOffset;
      if (!session.deafened) {
        finalDuration += Math.floor((Date.now() - session.joinedAt) / 1000);
      }
      
      // Calculate screen share and camera final times
      if (session.sharingScreen && session.sharingScreenSince) {
        session.sharingScreenDuration += Math.floor((Date.now() - session.sharingScreenSince) / 1000);
        session.sharingScreenSince = null;
      }
      if (session.cameraOn && session.cameraSince) {
        session.cameraDuration += Math.floor((Date.now() - session.cameraSince) / 1000);
        session.cameraSince = null;
      }

      const finalMuted = getMutedDuration(session);
      
      // Clear any pending checkins
      const checkin = activeCheckins.get(userId);
      if (checkin) {
        clearTimeout(checkin.timeoutId);
        activeCheckins.delete(userId);
      }

      activeSessions.delete(userId);

      // Sync offline state and final duration
      await syncSession(
        userId, 'offline', finalDuration, false, finalMuted,
        false, false, session.sharingScreenDuration, session.cameraDuration
      );
    }
  }

  // Case 3: Status change (Mute/Deafen/Streaming/Camera) while in the channel
  else if (newState.channelId === CLASS_VOICE_CHANNEL_ID && oldState.channelId === CLASS_VOICE_CHANNEL_ID) {
    const session = activeSessions.get(userId);
    if (!session) return;

    const oldDeafened = session.deafened;
    const oldMuted = session.muted;
    const oldSharingScreen = session.sharingScreen;
    const oldCameraOn = session.cameraOn;

    // Xử lý thay đổi Deafen (AFK)
    if (oldDeafened !== isDeafened) {
      console.log(`[DEAFEN] ${username}: ${oldDeafened} -> ${isDeafened}`);

      if (!oldDeafened) {
        session.durationOffset += Math.floor((Date.now() - session.joinedAt) / 1000);
      }
      session.joinedAt = Date.now();
      session.deafened = isDeafened;
      session.deafenedSince = isDeafened ? Date.now() : null;
      // #1 Reset deafen warning level khi un-deafen
      if (!isDeafened) {
        session.deafenWarningLevel = 0;
      }

      const status = isDeafened ? 'discord_afk' : 'discord_class';
      await syncSession(
        userId, status, session.durationOffset, isDeafened, getMutedDuration(session),
        session.sharingScreen, session.cameraOn, getSharingScreenDuration(session), getCameraDuration(session)
      );
    }

    // Xử lý thay đổi Mute (tắt mic) — chỉ tracking, không đổi status
    if (oldMuted !== isMuted) {
      console.log(`[MUTE] ${username}: ${oldMuted} -> ${isMuted}`);

      if (isMuted) {
        session.mutedSince = Date.now();
      } else {
        if (session.mutedSince) {
          session.mutedDuration += Math.floor((Date.now() - session.mutedSince) / 1000);
          session.mutedSince = null;
        }
      }
      session.muted = isMuted;
      // #1 Reset mute warning level khi un-mute
      if (!isMuted) {
        session.muteWarningLevel = 0;
      }
    }

    // Xử lý thay đổi Screen Share
    if (oldSharingScreen !== isSharingScreen) {
      console.log(`[SCREENSHARE] ${username}: ${oldSharingScreen} -> ${isSharingScreen}`);
      if (isSharingScreen) {
        session.sharingScreenSince = Date.now();
        session.screenShareReminderSent = true;
        session.noScreenshareSince = null;
        // #1 Reset screenshare warning level khi bật share
        session.screenshareWarningLevel = 0;
      } else {
        if (session.sharingScreenSince) {
          session.sharingScreenDuration += Math.floor((Date.now() - session.sharingScreenSince) / 1000);
          session.sharingScreenSince = null;
        }
        session.noScreenshareSince = Date.now();
      }
      session.sharingScreen = isSharingScreen;

      const status = session.deafened ? 'discord_afk' : 'discord_class';
      await syncSession(
        userId, status, session.deafened ? session.durationOffset : (session.durationOffset + Math.floor((Date.now() - session.joinedAt) / 1000)), 
        session.deafened, getMutedDuration(session),
        isSharingScreen, session.cameraOn, getSharingScreenDuration(session), getCameraDuration(session)
      );
    }

    // Xử lý thay đổi Camera
    if (oldCameraOn !== isCameraOn) {
      console.log(`[CAMERA] ${username}: ${oldCameraOn} -> ${isCameraOn}`);
      if (isCameraOn) {
        session.cameraSince = Date.now();
      } else {
        if (session.cameraSince) {
          session.cameraDuration += Math.floor((Date.now() - session.cameraSince) / 1000);
          session.cameraSince = null;
        }
      }
      session.cameraOn = isCameraOn;

      const status = session.deafened ? 'discord_afk' : 'discord_class';
      await syncSession(
        userId, status, session.deafened ? session.durationOffset : (session.durationOffset + Math.floor((Date.now() - session.joinedAt) / 1000)), 
        session.deafened, getMutedDuration(session),
        session.sharingScreen, isCameraOn, getSharingScreenDuration(session), getCameraDuration(session)
      );
    }
  }
});

// Periodic timer (every 30 seconds) to tick accumulated active time and push updates
setInterval(async () => {
  const now = Date.now();
  for (const [userId, session] of activeSessions.entries()) {
    // If not deafened, calculate accumulated time
    let currentDuration = session.durationOffset;
    if (!session.deafened) {
      currentDuration += Math.floor((now - session.joinedAt) / 1000);
    }

    const status = session.deafened ? 'discord_afk' : 'discord_class';
    const mutedTotal = getMutedDuration(session);
    const sharingScreenTotal = getSharingScreenDuration(session);
    const cameraTotal = getCameraDuration(session);

    // 1. Sync to Next.js API
    await syncSession(
      userId, status, currentDuration, session.deafened, mutedTotal,
      session.sharingScreen, session.cameraOn, sharingScreenTotal, cameraTotal
    );
    session.lastSyncedAt = now;

    // 2. Kiểm tra Nhắc nhở chia sẻ màn hình (sau 3 phút không share screen)
    if (!session.sharingScreen && !session.screenShareReminderSent) {
      const elapsedMinutes = (now - session.joinTime) / 1000 / 60;
      if (elapsedMinutes >= 3) {
        session.screenShareReminderSent = true;
        try {
          const user = await client.users.fetch(userId);
          if (user) {
            const embed = new EmbedBuilder()
              .setColor(0xF59E0B)
              .setTitle('🖥️ Nhắc nhở: Chia sẻ màn hình')
              .setDescription('Bạn đã tham gia phòng học Discord được 3 phút nhưng chưa chia sẻ màn hình. Vui lòng bật chia sẻ màn hình để được tính giờ học hiệu quả nhé! Thầy cô cần theo dõi màn hình học tập của bạn.')
              .setTimestamp()
              .setFooter({ text: 'ECODEx Learning System' });
            await user.send({ embeds: [embed] });
            console.log(`[REMINDER SENT] Sent screen share reminder to ${user.username}`);
          }
        } catch (e) {
          console.error(`[REMINDER ERROR] Failed to send screen share reminder to ${userId}:`, e.message);
        }
      }
    }

    // 2.5. Điểm danh ngẫu nhiên (Random Check-in / Captcha)
    if (!session.deafened && !activeCheckins.has(userId)) {
      const timeSinceLastCheckin = now - (session.lastCheckinTime || session.joinTime);
      if (timeSinceLastCheckin >= CHECKIN_INTERVAL_SECONDS * 1000) {
        try {
          const userObj = await client.users.fetch(userId);
          if (userObj) {
            const confirmBtn = new ButtonBuilder()
              .setCustomId(`checkin_confirm_${userId}`)
              .setLabel('Xác nhận tôi vẫn đang học 🙋‍♂️')
              .setStyle(ButtonStyle.Success);
              
            const row = new ActionRowBuilder().addComponents(confirmBtn);
            
            const embed = new EmbedBuilder()
              .setColor(0x3B82F6)
              .setTitle('🎯 Điểm danh ngẫu nhiên (Random Check-in)')
              .setDescription('Hệ thống kiểm tra sự tập trung của học sinh. Vui lòng click vào nút bên dưới trong vòng **3 phút** để xác nhận bạn vẫn đang học tập.')
              .setTimestamp()
              .setFooter({ text: 'ECODEx Learning System' });

            const dmMessage = await userObj.send({ embeds: [embed], components: [row] });
            
            const timeoutId = setTimeout(async () => {
              activeCheckins.delete(userId);
              
              const expiredEmbed = new EmbedBuilder()
                .setColor(0xEF4444)
                .setTitle('❌ Điểm danh thất bại')
                .setDescription('Bạn đã không xác nhận điểm danh đúng hạn (3 phút). Bạn đã bị chuyển sang phòng AFK.')
                .setTimestamp()
                .setFooter({ text: 'ECODEx Learning System' });
              
              await dmMessage.edit({ embeds: [expiredEmbed], components: [] }).catch(() => null);
              
              const voiceChannel = client.channels.cache.get(CLASS_VOICE_CHANNEL_ID);
              if (voiceChannel && voiceChannel.isVoiceBased()) {
                const member = voiceChannel.members.get(userId);
                if (member && AFK_VOICE_CHANNEL_ID) {
                  await member.voice.setChannel(AFK_VOICE_CHANNEL_ID).catch(() => null);
                  console.log(`[AUTO-AFK] Moved ${member.user.username} to AFK due to check-in timeout.`);
                  // #2 Set rejoin cooldown
                  setAfkCooldown(userId);
                  // #3 Thông báo cho giáo viên
                  await notifyTeacher(
                    '❌ Học sinh không xác nhận điểm danh',
                    `**${member.user.username}** (<@${userId}>) đã không xác nhận điểm danh trong 3 phút và bị chuyển sang phòng AFK.\nCooldown: ${Math.round(AFK_REJOIN_COOLDOWN_SECONDS / 60)} phút.`,
                    0xEF4444
                  );
                }
              }
            }, 180000); // 3 minutes

            activeCheckins.set(userId, {
              messageId: dmMessage.id,
              timeoutId: timeoutId,
              triggeredAt: now
            });
            
            session.lastCheckinTime = now;
            console.log(`[CHECKIN TRIGGERED] Sent check-in request to student ${userObj.username}`);
          }
        } catch (e) {
          console.error(`[CHECKIN TRIGGER ERROR] Failed to send check-in to user ${userId}:`, e.message);
          session.lastCheckinTime = now; // reset to avoid infinite retries
        }
      }
    }

    // 3. #1 Escalation Warning System — Cảnh báo phân cấp thay vì sút thẳng
    //    Level 0 → DM cảnh báo (33% timeout)
    //    Level 1 → Ping công khai (66% timeout)
    //    Level 2 → Move to AFK (100% timeout)
    const escalationChecks = [];

    // 3a. Kiểm tra Deafen
    if (session.deafened && session.deafenedSince) {
      const elapsedDeafen = Math.floor((now - session.deafenedSince) / 1000);
      escalationChecks.push({
        type: 'deafen',
        elapsed: elapsedDeafen,
        timeout: AFK_DEAFEN_TIMEOUT_SECONDS,
        warningKey: 'deafenWarningLevel',
        reason: 'tắt tai nghe',
        reasonFull: `tắt tai nghe quá ${Math.round(AFK_DEAFEN_TIMEOUT_SECONDS / 60)} phút`
      });
    }

    // 3b. Kiểm tra Mute
    if (session.muted && session.mutedSince) {
      const elapsedMute = Math.floor((now - session.mutedSince) / 1000);
      escalationChecks.push({
        type: 'mute',
        elapsed: elapsedMute,
        timeout: AFK_MUTE_TIMEOUT_SECONDS,
        warningKey: 'muteWarningLevel',
        reason: 'tắt tiếng mic',
        reasonFull: `tắt tiếng mic quá ${Math.round(AFK_MUTE_TIMEOUT_SECONDS / 60)} phút`
      });
    }

    // 3c. Kiểm tra No-Screenshare
    if (!session.sharingScreen && session.noScreenshareSince) {
      const elapsedNoScreenshare = Math.floor((now - session.noScreenshareSince) / 1000);
      escalationChecks.push({
        type: 'screenshare',
        elapsed: elapsedNoScreenshare,
        timeout: AFK_SCREENSHARE_TIMEOUT_SECONDS,
        warningKey: 'screenshareWarningLevel',
        reason: 'không chia sẻ màn hình',
        reasonFull: `không chia sẻ màn hình quá ${Math.round(AFK_SCREENSHARE_TIMEOUT_SECONDS / 60)} phút`
      });
    }

    let shouldMove = false;
    let moveReason = "";

    for (const check of escalationChecks) {
      const currentLevel = session[check.warningKey] || 0;
      const threshold33 = Math.floor(check.timeout / 3);
      const threshold66 = Math.floor((check.timeout * 2) / 3);

      // Level 0 → DM cảnh báo tại 33% timeout
      if (currentLevel === 0 && check.elapsed >= threshold33) {
        session[check.warningKey] = 1;
        const remainingMin = Math.ceil((check.timeout - check.elapsed) / 60);
        try {
          const user = await client.users.fetch(userId);
          if (user) {
            const embed = new EmbedBuilder()
              .setColor(0xF59E0B)
              .setTitle('⚠️ Cảnh báo lần 1')
              .setDescription(`Bạn đã **${check.reason}** được ${Math.round(check.elapsed / 60)} phút. Nếu tiếp tục, bạn sẽ bị chuyển sang phòng AFK sau khoảng **${remainingMin} phút** nữa.`)
              .setTimestamp()
              .setFooter({ text: 'ECODEx Learning System' });
            await user.send({ embeds: [embed] }).catch(() => null);
            console.log(`[ESCALATION L1] DM warning sent to ${user.username} for: ${check.reason}`);
          }
        } catch (e) {
          console.error(`[ESCALATION L1 ERROR]`, e.message);
        }
      }

      // Level 1 → Ping công khai tại 66% timeout
      if (currentLevel === 1 && check.elapsed >= threshold66) {
        session[check.warningKey] = 2;
        const remainingMin = Math.ceil((check.timeout - check.elapsed) / 60);
        try {
          let textChannel = null;
          if (CLASS_TEXT_CHANNEL_ID) {
            textChannel = client.channels.cache.get(CLASS_TEXT_CHANNEL_ID);
          }
          if (!textChannel) {
            const voiceChannel = client.channels.cache.get(CLASS_VOICE_CHANNEL_ID);
            if (voiceChannel && voiceChannel.guild) {
              const textChannels = voiceChannel.guild.channels.cache.filter(c => c.type === 0);
              textChannel = textChannels.find(c => c.name.includes('classroom') || c.name.includes('study') || c.name.includes('general')) || textChannels.first();
            }
          }
          if (textChannel) {
            await textChannel.send(`<@${userId}> ⚠️ **Cảnh báo lần 2**: Bạn đã **${check.reason}** được ${Math.round(check.elapsed / 60)} phút. Bạn sẽ bị chuyển sang phòng AFK sau **${remainingMin} phút** nữa nếu không hành động!`);
            console.log(`[ESCALATION L2] Public ping sent for ${userId}: ${check.reason}`);
          }
        } catch (e) {
          console.error(`[ESCALATION L2 ERROR]`, e.message);
        }
        // #3 Thông báo cho giáo viên ở mức cảnh báo 2
        await notifyTeacher(
          '⚠️ Cảnh báo lần 2 — Sắp bị AFK',
          `Học sinh <@${userId}> đã **${check.reason}** được **${Math.round(check.elapsed / 60)} phút** và đã nhận 2 cảnh báo. Sẽ tự động chuyển AFK sau **${Math.ceil((check.timeout - check.elapsed) / 60)} phút**.`,
          0xEF4444
        );
      }

      // Level 2 → Move to AFK tại 100% timeout
      if (currentLevel >= 2 && check.elapsed >= check.timeout) {
        shouldMove = true;
        moveReason = check.reasonFull;
        break; // Chỉ cần 1 lý do để move
      }
    }

    if (shouldMove && AFK_VOICE_CHANNEL_ID) {
      const channel = client.channels.cache.get(CLASS_VOICE_CHANNEL_ID);
      if (channel && channel.isVoiceBased()) {
        const member = channel.members.get(userId);
        if (member) {
          try {
            await member.voice.setChannel(AFK_VOICE_CHANNEL_ID);
            console.log(`[AUTO-AFK] Moved ${member.user.username} to AFK channel due to: ${moveReason}.`);
            
            // #2 Set rejoin cooldown
            setAfkCooldown(userId);
            
            // Gửi tin nhắn DM thông báo
            const embed = new EmbedBuilder()
              .setColor(0xEF4444)
              .setTitle('🔇 Bạn đã bị chuyển sang phòng AFK')
              .setDescription(`Hệ thống đã tự động chuyển bạn sang phòng AFK vì bạn đã **${moveReason}**.\n\n⏳ Bạn cần đợi **${Math.round(AFK_REJOIN_COOLDOWN_SECONDS / 60)} phút** trước khi có thể quay lại phòng học.`)
              .setTimestamp()
              .setFooter({ text: 'ECODEx Learning System' });
            await member.send({ embeds: [embed] }).catch(() => null);
            
            // #3 Thông báo cho giáo viên
            await notifyTeacher(
              '🚫 Học sinh bị chuyển sang AFK',
              `**${member.user.username}** (<@${userId}>) đã bị tự động chuyển sang phòng AFK vì: **${moveReason}**.\nCooldown: ${Math.round(AFK_REJOIN_COOLDOWN_SECONDS / 60)} phút.`,
              0xEF4444
            );
          } catch (e) {
            console.error(`[AUTO-AFK ERROR] Failed to move user ${userId} to AFK channel:`, e.message);
          }
        }
      }
    }

    // Cleanup expired cooldowns
    for (const [cooldownUserId, expiresAt] of afkCooldowns.entries()) {
      if (now >= expiresAt) {
        afkCooldowns.delete(cooldownUserId);
      }
    }
  }
}, 30000);

// Xử lý button interactions (xác nhận điểm danh)
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  const customId = interaction.customId;
  if (customId.startsWith('checkin_confirm_')) {
    const userId = customId.replace('checkin_confirm_', '');

    if (interaction.user.id !== userId) {
      await interaction.reply({ content: '❌ Bạn không phải là người nhận điểm danh này.', ephemeral: true });
      return;
    }

    const checkin = activeCheckins.get(userId);
    if (!checkin) {
      await interaction.reply({ content: '❌ Yêu cầu điểm danh này đã hết hạn hoặc không tồn tại.', ephemeral: true });
      return;
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
      if (session) {
        session.lastCheckinTime = Date.now();
      }
      console.log(`[CHECKIN CONFIRMED] User ${interaction.user.username} successfully confirmed attention check.`);
    } catch (e) {
      console.error(`[CHECKIN CONFIRM ERROR] Failed to update button message for ${userId}:`, e.message);
    }
  }
});

// Xử lý String Select Menu (chọn đề thi làm Arena)
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isStringSelectMenu()) return;
  
  if (interaction.customId.startsWith('arena_select_menu_')) {
    const selectMenuAuthorId = interaction.customId.replace('arena_select_menu_', '');
    if (interaction.user.id !== selectMenuAuthorId) {
      return await interaction.reply({ content: '❌ Bạn không phải là người gọi lệnh này.', ephemeral: true });
    }
    
    await interaction.deferUpdate();
    const selectedValue = interaction.values[0]; // arena_create_{examId}_{tagLopId}
    const parts = selectedValue.replace('arena_create_', '').split('_');
    const examId = parts[0];
    const tagLopId = parts[1];
    
    const tagLop = tagLopId !== 'none' ? interaction.guild.roles.cache.get(tagLopId) : null;
    
    if (!supabase) {
      return await interaction.editReply({ content: '❌ Cơ sở dữ liệu chưa sẵn sàng.', components: [] });
    }
    
    const { data: exam } = await supabase
      .from('exams')
      .select('id, title, duration, total_questions, subject')
      .eq('id', examId)
      .single();
      
    if (!exam) {
      return await interaction.editReply({ content: '❌ Đề thi đã chọn không tồn tại.', components: [] });
    }
    
    await executeCreateArena(interaction, exam, tagLop);
  }
});

// Helper: Tạo phòng Arena trong DB và phát thông báo
async function executeCreateArena(interactionOrSelect, exam, tagLop, teacherProfileId = null) {
  const authorId = interactionOrSelect.user.id;
  
  let profileId = teacherProfileId;
  if (!profileId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('discord_id', authorId)
      .maybeSingle();
      
    if (!profile) {
      const msg = '❌ Bạn chưa liên kết tài khoản ExamHub. Vui lòng chạy lệnh **/lienket** trước.';
      if (interactionOrSelect.isRepliable()) {
        await interactionOrSelect.followup.send({ content: msg });
      }
      return;
    }
    profileId = profile.id;
  }
  
  const start = new Date();
  const end = new Date(Date.now() + 24 * 60 * 60 * 1000); // Đóng sau 24 giờ
  
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
    .select()
    .single();
    
  if (insertError) {
    console.error('Error inserting arena session:', insertError);
    const msg = '❌ Lỗi hệ thống khi tạo đợt Arena trong cơ sở dữ liệu.';
    if (interactionOrSelect.isRepliable()) {
      await interactionOrSelect.followup.send({ content: msg });
    }
    return;
  }
  
  const examhubUrl = process.env.WEB_API_URL?.replace('/api/study-sessions/discord-sync', '') || 'https://luyende.id.vn';
  const sessionUrl = `${examhubUrl}/arena/${session.id}`;
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
    
  const arenaChannelId = process.env.ARENA_CHANNEL_ID || CLASS_TEXT_CHANNEL_ID;
  let announceSent = false;
  
  if (arenaChannelId) {
    const channel = client.channels.cache.get(arenaChannelId);
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

// Helper: Cấu hình listener realtime Supabase
function setupRealtimeSubscriptions() {
  // 1. Listen to exams table (published)
  supabase.channel('exams-published')
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'exams',
      filter: 'status=eq.published'
    }, async (payload) => {
      const exam = payload.new;
      const announceChannelId = process.env.ANNOUNCE_CHANNEL_ID || CLASS_TEXT_CHANNEL_ID;
      if (!announceChannelId) return;
      
      const channel = client.channels.cache.get(announceChannelId);
      if (!channel || !channel.isTextBased()) return;
      
      const examhubUrl = process.env.WEB_API_URL?.replace('/api/study-sessions/discord-sync', '') || 'https://luyende.id.vn';
      
      const embed = new EmbedBuilder()
        .setColor(0x6366F1)
        .setTitle('📝 Đề Thi Mới Vừa Được Mở!')
        .setDescription(`**${exam.title}**`)
        .setURL(`${examhubUrl}/student/exams/${exam.id}`)
        .addFields(
          { name: '📚 Môn học', value: exam.subject || 'Chung', inline: true },
          { name: '⏱️ Thời gian', value: `${exam.duration || 60} phút`, inline: true },
          { name: '❓ Số câu', value: `${exam.total_questions || 0} câu`, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: 'ECODEx Learning System' });
        
      if (exam.is_scheduled && exam.start_time) {
        const timestamp = Math.floor(new Date(exam.start_time).getTime() / 1000);
        embed.addFields({ name: '🕐 Bắt đầu lúc', value: `<t:${timestamp}:F> (<t:${timestamp}:R>)`, inline: false });
      }
      
      await channel.send({ content: '@everyone 📝 Có đề thi mới được phát hành!', embeds: [embed] }).catch(() => null);
    })
    .subscribe();

  // 2. Listen to arena_sessions table (new sessions)
  supabase.channel('arena-new')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'arena_sessions'
    }, async (payload) => {
      const session = payload.new;
      
      // Tránh lặp thông báo nếu phiên được tạo bởi chính lệnh bot /arena (vì lệnh bot đã tự announce)
      if (session.description && session.description.includes('Discord')) return;

      const arenaChannelId = process.env.ARENA_CHANNEL_ID || CLASS_TEXT_CHANNEL_ID;
      if (!arenaChannelId) return;
      
      const channel = client.channels.cache.get(arenaChannelId);
      if (!channel || !channel.isTextBased()) return;
      
      const examhubUrl = process.env.WEB_API_URL?.replace('/api/study-sessions/discord-sync', '') || 'https://luyende.id.vn';
      const sessionUrl = `${examhubUrl}/arena/${session.id}`;
      
      const embed = new EmbedBuilder()
        .setColor(0xEF4444)
        .setTitle('⚔️ ĐẤU TRƯỜNG ARENA ĐÃ MỞ!')
        .setDescription(`**${session.name || 'Đợt thi đấu mới'}**\nHọc sinh hãy nhấn vào đường link dưới đây để tham gia phòng thi đấu!`)
        .setURL(sessionUrl)
        .addFields(
          { name: '🚪 Tham gia', value: `[Bấm vào đây để vào phòng thi đấu](${sessionUrl})`, inline: false }
        )
        .setTimestamp()
        .setFooter({ text: '⚡ Thi đấu realtime — ai làm nhanh và đúng nhiều nhất sẽ thắng!' });
        
      await channel.send({ content: '@everyone ⚔️ Một phòng Arena đấu trường mới vừa được tạo trên website!', embeds: [embed] }).catch(() => null);
    })
    .subscribe();

  // 3. Listen to notifications table (broadcast)
  supabase.channel('notifications-broadcast')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: 'type=eq.discord_broadcast'
    }, async (payload) => {
      const notif = payload.new;
      const announceChannelId = process.env.ANNOUNCE_CHANNEL_ID || CLASS_TEXT_CHANNEL_ID;
      if (!announceChannelId) return;
      
      const channel = client.channels.cache.get(announceChannelId);
      if (!channel || !channel.isTextBased()) return;
      
      const embed = new EmbedBuilder()
        .setColor(0xF59E0B)
        .setTitle(`📢 ${notif.title}`)
        .setDescription(notif.message || '')
        .setTimestamp()
        .setFooter({ text: 'Thông báo hệ thống ECODEx' });
        
      await channel.send({ embeds: [embed] }).catch(() => null);
    })
    .subscribe();

  // 4. Role Sync: Listen to level changes in student_stats
  supabase.channel('level-sync')
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'student_stats'
    }, async (payload) => {
      const oldLevel = payload.old.level || 0;
      const newLevel = payload.new.level || 0;
      const userId = payload.new.user_id;
      
      if (newLevel <= oldLevel) return;
      
      // Fetch profile to get discord_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('discord_id, full_name')
        .eq('id', userId)
        .maybeSingle();
        
      if (!profile || !profile.discord_id) return;
      
      await syncUserLevelRoles(profile.discord_id, newLevel, profile.full_name);
    })
    .subscribe();

  // 5. YouTube Live Announcer: Listen to live_config table
  supabase.channel('live-announce')
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'live_config'
    }, async (payload) => {
      const oldLive = payload.old.is_live;
      const newLive = payload.new.is_live;
      
      if (newLive && !oldLive) {
        const liveConfig = payload.new;
        const liveChannelId = process.env.LIVE_CHANNEL_ID || CLASS_TEXT_CHANNEL_ID;
        if (!liveChannelId) return;
        
        const channel = client.channels.cache.get(liveChannelId);
        if (!channel || !channel.isTextBased()) return;
        
        const youtubeUrl = `https://youtube.com/watch?v=${liveConfig.youtube_video_id}`;
        const embed = new EmbedBuilder()
          .setColor(0xEF4444)
          .setTitle('📺 BẮT ĐẦU BUỔI LIVE CLASS TRỰC TIẾP!')
          .setDescription(`**${liveConfig.title || 'Buổi học Live trực tuyến'}**`)
          .setURL(youtubeUrl)
          .addFields(
            { name: '🔴 Xem trực tiếp', value: `[Xem YouTube Live ngay tại đây](${youtubeUrl})`, inline: true }
          )
          .setThumbnail(`https://img.youtube.com/vi/${liveConfig.youtube_video_id}/maxresdefault.jpg`)
          .setTimestamp()
          .setFooter({ text: 'ECODEx Live Streaming' });
          
        await channel.send({ content: '@everyone 📺 Buổi học trực tiếp Live Class đã bắt đầu!', embeds: [embed] }).catch(() => null);
      }
    })
    .subscribe();
}

// Helper: Đồng bộ hóa Level -> Discord Role
async function syncUserLevelRoles(discordId, level, studentName) {
  const levelRoleMap = {
    1: process.env.ROLE_LEVEL_1,
    5: process.env.ROLE_LEVEL_5,
    10: process.env.ROLE_LEVEL_10,
    15: process.env.ROLE_LEVEL_15,
    20: process.env.ROLE_LEVEL_20
  };
  
  for (const guild of client.guilds.cache.values()) {
    try {
      const member = await guild.members.fetch(discordId).catch(() => null);
      if (!member) continue;
      
      let newRoleId = null;
      const sortedThresholds = Object.keys(levelRoleMap).map(Number).sort((a,b) => b-a);
      for (const threshold of sortedThresholds) {
        if (level >= threshold && levelRoleMap[threshold]) {
          newRoleId = levelRoleMap[threshold];
          break;
        }
      }
      
      if (!newRoleId) continue;
      
      const newRole = guild.roles.cache.get(newRoleId);
      if (!newRole) continue;
      
      const rolesToRemove = [];
      for (const roleId of Object.values(levelRoleMap)) {
        if (roleId && roleId !== newRoleId && member.roles.cache.has(roleId)) {
          rolesToRemove.push(roleId);
        }
      }
      
      if (rolesToRemove.length > 0) {
        await member.roles.remove(rolesToRemove).catch(e => console.error(`[ROLE ERROR] Failed to remove roles:`, e.message));
      }
      
      if (!member.roles.cache.has(newRoleId)) {
        await member.roles.add(newRoleId).catch(e => console.error(`[ROLE ERROR] Failed to add role:`, e.message));
        
        const announceChannelId = process.env.ANNOUNCE_CHANNEL_ID || CLASS_TEXT_CHANNEL_ID;
        if (announceChannelId) {
          const announceChannel = guild.channels.cache.get(announceChannelId);
          if (announceChannel && announceChannel.isTextBased()) {
            const embed = new EmbedBuilder()
              .setColor(0xF59E0B)
              .setTitle('🎉 LÊN CẤP ĐỘ MỚI!')
              .setDescription(`Chúc mừng học sinh **${studentName}** (<@${discordId}>) đã đạt **Level ${level}** trên hệ thống!\nHạng danh hiệu mới: **${newRole.name}** 🏆`)
              .setTimestamp()
              .setFooter({ text: 'ECODEx Gamification System' });
              
            await announceChannel.send({ embeds: [embed] }).catch(() => null);
          }
        }
      }
    } catch (err) {
      console.error(`[ROLE SYNC ERROR]`, err.message);
    }
  }
}

client.login(DISCORD_BOT_TOKEN);
