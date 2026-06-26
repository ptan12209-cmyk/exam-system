/**
 * Express API server — receives DM/ping/control requests from the Web UI
 */
const express = require('express');
const { EmbedBuilder } = require('discord.js');
const { BOT_API_PORT, DISCORD_SYNC_SECRET, CLASS_TEXT_CHANNEL_ID, CLASS_VOICE_CHANNEL_ID, AFK_VOICE_CHANNEL_ID, AFK_REJOIN_COOLDOWN_SECONDS } = require('./utils/constants');
const { activeSessions, setAfkCooldown } = require('./utils/sessions');

function startExpressServer(client) {
  const app = express();
  app.use(express.json());

  app.post('/api/send-dm', async (req, res) => {
    const { discord_id, message, secret_token } = req.body;
    if (secret_token !== DISCORD_SYNC_SECRET) return res.status(401).json({ error: 'Unauthorized' });
    if (!discord_id || !message) return res.status(400).json({ error: 'Missing discord_id or message' });

    try {
      const user = await client.users.fetch(discord_id);
      if (!user) return res.status(404).json({ error: 'User not found' });

      const embed = new EmbedBuilder()
        .setColor(0x5865F2).setTitle('📢 Nhắc nhở từ Giáo viên').setDescription(message)
        .setTimestamp().setFooter({ text: 'ECODEx Learning System' });

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
    if (secret_token !== DISCORD_SYNC_SECRET) return res.status(401).json({ error: 'Unauthorized' });
    if (!discord_id || !message) return res.status(400).json({ error: 'Missing discord_id or message' });

    try {
      let targetChannel = CLASS_TEXT_CHANNEL_ID ? client.channels.cache.get(CLASS_TEXT_CHANNEL_ID) : null;

      if (!targetChannel) {
        const voiceChannel = client.channels.cache.get(CLASS_VOICE_CHANNEL_ID);
        if (voiceChannel && voiceChannel.guild) {
          const textChannels = voiceChannel.guild.channels.cache.filter(c => c.type === 0);
          targetChannel = textChannels.find(c => c.name.includes('classroom') || c.name.includes('study') || c.name.includes('general')) || textChannels.first();
        }
      }

      if (!targetChannel) return res.status(404).json({ error: 'Không tìm thấy kênh text để ping' });

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
    if (secret_token !== DISCORD_SYNC_SECRET) return res.status(401).json({ error: 'Unauthorized' });

    try {
      if (command === 'status') {
        const activeMembers = [];
        const channel = client.channels.cache.get(CLASS_VOICE_CHANNEL_ID);
        if (channel && channel.isVoiceBased()) {
          for (const [memberId, member] of channel.members.entries()) {
            const session = activeSessions.get(memberId);
            activeMembers.push({
              username: member.user.username, discord_id: memberId,
              status: session?.deafened ? 'AFK' : session?.muted ? 'Muted' : 'Studying',
              joined_at: session?.joinedAt ? new Date(session.joinedAt).toISOString() : null
            });
          }
        }
        return res.json({
          online: true, bot_user: client.user?.tag || 'Unknown Bot',
          uptime: client.uptime, ping: client.ws.ping,
          voice_channel_id: CLASS_VOICE_CHANNEL_ID, voice_channel_name: channel?.name || 'Unknown',
          active_members: activeMembers
        });
      }

      if (command === 'move_to_afk') {
        if (!discord_id) return res.status(400).json({ error: 'Missing discord_id' });
        if (!AFK_VOICE_CHANNEL_ID) return res.status(400).json({ error: 'AFK channel not configured' });

        const channel = client.channels.cache.get(CLASS_VOICE_CHANNEL_ID);
        if (channel && channel.isVoiceBased()) {
          const member = channel.members.get(discord_id);
          if (member) {
            await member.voice.setChannel(AFK_VOICE_CHANNEL_ID);
            setAfkCooldown(discord_id);
            const embed = new EmbedBuilder()
              .setColor(0xEF4444).setTitle('🔇 Bạn đã bị chuyển sang phòng AFK')
              .setDescription(`Giáo viên đã chuyển bạn sang phòng AFK từ bảng điều khiển trên Web.\n\n⏳ Bạn cần đợi **${Math.round(AFK_REJOIN_COOLDOWN_SECONDS / 60)} phút** trước khi có thể quay lại phòng học.`)
              .setTimestamp().setFooter({ text: 'ECODEx Learning System' });
            await member.send({ embeds: [embed] }).catch(() => null);
            return res.json({ success: true, message: 'Moved user to AFK channel' });
          } else {
            return res.status(404).json({ error: 'Học sinh hiện không ở trong phòng học Discord' });
          }
        } else {
          return res.status(404).json({ error: 'Không tìm thấy phòng học hoặc phòng trống' });
        }
      }

      if (command === 'start_class') {
        if (!CLASS_TEXT_CHANNEL_ID) return res.status(400).json({ error: 'Chưa cấu hình CLASS_TEXT_CHANNEL_ID trong Bot' });
        const channel = client.channels.cache.get(CLASS_TEXT_CHANNEL_ID);
        if (!channel) return res.status(404).json({ error: 'Không tìm thấy kênh text để thông báo' });

        const voiceChannel = client.channels.cache.get(CLASS_VOICE_CHANNEL_ID);
        const voiceChannelLink = voiceChannel ? `discord://discordapp.com/channels/${voiceChannel.guild.id}/${CLASS_VOICE_CHANNEL_ID}` : '';

        const embed = new EmbedBuilder()
          .setColor(0x10B981).setTitle('📢 THÔNG BÁO: BẮT ĐẦU BUỔI HỌC CHUNG!')
          .setDescription(`Giáo viên đã bắt đầu buổi học chung. Các em hãy tham gia phòng học ngay nhé!\n\n🎙️ **Kênh Voice**: <#${CLASS_VOICE_CHANNEL_ID}>\n🔗 **Link tham gia nhanh**: [Bấm vào đây để vào phòng](${voiceChannelLink || 'https://discord.com'})`)
          .setTimestamp().setFooter({ text: 'ECODEx Learning System' });

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
}

module.exports = { startExpressServer };
