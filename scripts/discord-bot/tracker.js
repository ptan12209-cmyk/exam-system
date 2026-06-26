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

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates
  ]
});

// Map to store active study sessions:
// userId -> { joinedAt, durationOffset, lastSyncedAt, deafened, deafenedSince, muted, mutedSince, mutedDuration, sharingScreen, sharingScreenSince, sharingScreenDuration, cameraOn, cameraSince, cameraDuration, screenShareReminderSent, joinTime, noScreenshareSince, lastCheckinTime }
const activeSessions = new Map();
const activeCheckins = new Map();

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
          // Gửi tin nhắn thông báo
          const embed = new EmbedBuilder()
            .setColor(0xEF4444)
            .setTitle('🔇 Bạn đã bị chuyển sang phòng AFK')
            .setDescription('Giáo viên đã chuyển bạn sang phòng AFK từ bảng điều khiển trên Web.')
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
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
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
    console.log('[COMMANDS] Registered /status and /streak slash commands.');
  } catch (err) {
    console.error('[COMMANDS ERROR]', err.message);
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
      // Gọi API heatmap để lấy streak (tái sử dụng endpoint)
      const baseUrl = process.env.WEB_API_URL?.replace('/api/study-sessions/discord-sync', '') || 'http://localhost:3000';
      const resp = await axios.get(`${baseUrl}/api/study-sessions/discord-heatmap`, {
        params: { student_id: userId }
      }).catch(() => null);

      // Fallback: hiển thị từ local session
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
      await interaction.deferReply(); // Hoạt động lâu cần defer

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
      screenShareReminderSent: isSharingScreen, // Nếu đã share ngay từ đầu thì không nhắc
      joinTime: Date.now(),
      noScreenshareSince: isSharingScreen ? null : Date.now(),
      lastCheckinTime: Date.now()
    });

    const status = isDeafened ? 'discord_afk' : 'discord_class';
    await syncSession(
      userId, status, 0, isDeafened, 0,
      isSharingScreen, isCameraOn, 0, 0
    );
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
    }

    // Xử lý thay đổi Screen Share
    if (oldSharingScreen !== isSharingScreen) {
      console.log(`[SCREENSHARE] ${username}: ${oldSharingScreen} -> ${isSharingScreen}`);
      if (isSharingScreen) {
        session.sharingScreenSince = Date.now();
        session.screenShareReminderSent = true; // Đã share màn hình thì không nhắc nhở nữa
        session.noScreenshareSince = null;
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

    // 3. Kiểm tra Tự động chuyển phòng AFK do quá hạn Deafen/Mute/Screenshare
    let shouldMove = false;
    let reason = "";

    if (session.deafened && session.deafenedSince) {
      const elapsedDeafen = Math.floor((now - session.deafenedSince) / 1000);
      if (elapsedDeafen >= AFK_DEAFEN_TIMEOUT_SECONDS) {
        shouldMove = true;
        reason = `tắt tai nghe quá ${Math.round(AFK_DEAFEN_TIMEOUT_SECONDS / 60)} phút`;
      }
    }

    if (!shouldMove && session.muted && session.mutedSince) {
      const elapsedMute = Math.floor((now - session.mutedSince) / 1000);
      if (elapsedMute >= AFK_MUTE_TIMEOUT_SECONDS) {
        shouldMove = true;
        reason = `tắt tiếng mic quá ${Math.round(AFK_MUTE_TIMEOUT_SECONDS / 60)} phút`;
      }
    }

    if (!shouldMove && !session.sharingScreen && session.noScreenshareSince) {
      const elapsedNoScreenshare = Math.floor((now - session.noScreenshareSince) / 1000);
      if (elapsedNoScreenshare >= AFK_SCREENSHARE_TIMEOUT_SECONDS) {
        shouldMove = true;
        reason = `không chia sẻ màn hình quá ${Math.round(AFK_SCREENSHARE_TIMEOUT_SECONDS / 60)} phút`;
      }
    }

    if (shouldMove && AFK_VOICE_CHANNEL_ID) {
      const channel = client.channels.cache.get(CLASS_VOICE_CHANNEL_ID);
      if (channel && channel.isVoiceBased()) {
        const member = channel.members.get(userId);
        if (member) {
          try {
            await member.voice.setChannel(AFK_VOICE_CHANNEL_ID);
            console.log(`[AUTO-AFK] Moved ${member.user.username} to AFK channel due to: ${reason}.`);
            
            // Gửi tin nhắn DM thông báo
            const embed = new EmbedBuilder()
              .setColor(0xEF4444)
              .setTitle('🔇 Bạn đã bị chuyển sang phòng AFK')
              .setDescription(`Hệ thống đã tự động chuyển bạn sang phòng AFK vì bạn đã **${reason}**. Vui lòng kết nối lại phòng học khi bạn tiếp tục học tập.`)
              .setTimestamp()
              .setFooter({ text: 'ECODEx Learning System' });
            await member.send({ embeds: [embed] }).catch(() => null);
          } catch (e) {
            console.error(`[AUTO-AFK ERROR] Failed to move user ${userId} to AFK channel:`, e.message);
          }
        }
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

    // Bảo mật: chỉ cho phép chính chủ nhân click nút
    if (interaction.user.id !== userId) {
      await interaction.reply({ content: '❌ Bạn không phải là người nhận điểm danh này.', ephemeral: true });
      return;
    }

    const checkin = activeCheckins.get(userId);
    if (!checkin) {
      await interaction.reply({ content: '❌ Yêu cầu điểm danh này đã hết hạn hoặc không tồn tại.', ephemeral: true });
      return;
    }

    // Xóa timeout điểm danh
    clearTimeout(checkin.timeoutId);
    activeCheckins.delete(userId);

    // Chỉnh sửa tin nhắn gốc thành màu xanh xác nhận thành công
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

client.login(DISCORD_BOT_TOKEN);
