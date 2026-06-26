/**
 * Supabase Realtime subscriptions — exam published, arena new, notifications, level sync, live announce
 */
const { EmbedBuilder } = require('discord.js');
const supabase = require('./utils/supabase');
const { BASE_URL, ANNOUNCE_CHANNEL_ID, CLASS_TEXT_CHANNEL_ID, ARENA_CHANNEL_ID, LIVE_CHANNEL_ID } = require('./utils/constants');

function setupRealtimeSubscriptions(client) {
  if (!supabase) return;

  // 1. Listen to exams table (published)
  supabase.channel('exams-published')
    .on('postgres_changes', {
      event: 'UPDATE', schema: 'public', table: 'exams', filter: 'status=eq.published'
    }, async (payload) => {
      const exam = payload.new;
      const announceChannelId = ANNOUNCE_CHANNEL_ID || CLASS_TEXT_CHANNEL_ID;
      if (!announceChannelId) return;

      const channel = client.channels.cache.get(announceChannelId);
      if (!channel || !channel.isTextBased()) return;

      const embed = new EmbedBuilder()
        .setColor(0x6366F1).setTitle('📝 Đề Thi Mới Vừa Được Mở!')
        .setDescription(`**${exam.title}**`)
        .setURL(`${BASE_URL}/student/exams/${exam.id}`)
        .addFields(
          { name: '📚 Môn học', value: exam.subject || 'Chung', inline: true },
          { name: '⏱️ Thời gian', value: `${exam.duration || 60} phút`, inline: true },
          { name: '❓ Số câu', value: `${exam.total_questions || 0} câu`, inline: true }
        )
        .setTimestamp().setFooter({ text: 'ECODEx Learning System' });

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
      event: 'INSERT', schema: 'public', table: 'arena_sessions'
    }, async (payload) => {
      const session = payload.new;
      if (session.description && session.description.includes('Discord')) return;

      const arenaChannelId = ARENA_CHANNEL_ID || CLASS_TEXT_CHANNEL_ID;
      if (!arenaChannelId) return;

      const channel = client.channels.cache.get(arenaChannelId);
      if (!channel || !channel.isTextBased()) return;

      const sessionUrl = `${BASE_URL}/arena/${session.id}`;
      const embed = new EmbedBuilder()
        .setColor(0xEF4444).setTitle('⚔️ ĐẤU TRƯỜNG ARENA ĐÃ MỞ!')
        .setDescription(`**${session.name || 'Đợt thi đấu mới'}**\nHọc sinh hãy nhấn vào đường link dưới đây để tham gia phòng thi đấu!`)
        .setURL(sessionUrl)
        .addFields({ name: '🚪 Tham gia', value: `[Bấm vào đây để vào phòng thi đấu](${sessionUrl})`, inline: false })
        .setTimestamp().setFooter({ text: '⚡ Thi đấu realtime — ai làm nhanh và đúng nhiều nhất sẽ thắng!' });

      await channel.send({ content: '@everyone ⚔️ Một phòng Arena đấu trường mới vừa được tạo trên website!', embeds: [embed] }).catch(() => null);
    })
    .subscribe();

  // 3. Listen to notifications table (broadcast)
  supabase.channel('notifications-broadcast')
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'notifications', filter: 'type=eq.discord_broadcast'
    }, async (payload) => {
      const notif = payload.new;
      const announceChannelId = ANNOUNCE_CHANNEL_ID || CLASS_TEXT_CHANNEL_ID;
      if (!announceChannelId) return;

      const channel = client.channels.cache.get(announceChannelId);
      if (!channel || !channel.isTextBased()) return;

      const embed = new EmbedBuilder()
        .setColor(0xF59E0B).setTitle(`📢 ${notif.title}`).setDescription(notif.message || '')
        .setTimestamp().setFooter({ text: 'Thông báo hệ thống ECODEx' });

      await channel.send({ embeds: [embed] }).catch(() => null);
    })
    .subscribe();

  // 4. Role Sync: Listen to level changes in student_stats
  supabase.channel('level-sync')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'student_stats' }, async (payload) => {
      const oldLevel = payload.old.level || 0;
      const newLevel = payload.new.level || 0;
      const userId = payload.new.user_id;

      if (newLevel <= oldLevel) return;

      const { data: profile } = await supabase
        .from('profiles').select('discord_id, full_name').eq('id', userId).maybeSingle();

      if (!profile || !profile.discord_id) return;
      await syncUserLevelRoles(client, profile.discord_id, newLevel, profile.full_name);
    })
    .subscribe();

  // 5. YouTube Live Announcer
  supabase.channel('live-announce')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'live_config' }, async (payload) => {
      const oldLive = payload.old.is_live;
      const newLive = payload.new.is_live;

      if (newLive && !oldLive) {
        const liveConfig = payload.new;
        const liveChannelId = LIVE_CHANNEL_ID || CLASS_TEXT_CHANNEL_ID;
        if (!liveChannelId) return;

        const channel = client.channels.cache.get(liveChannelId);
        if (!channel || !channel.isTextBased()) return;

        const youtubeUrl = `https://youtube.com/watch?v=${liveConfig.youtube_video_id}`;
        const embed = new EmbedBuilder()
          .setColor(0xEF4444).setTitle('📺 BẮT ĐẦU BUỔI LIVE CLASS TRỰC TIẾP!')
          .setDescription(`**${liveConfig.title || 'Buổi học Live trực tuyến'}**`)
          .setURL(youtubeUrl)
          .addFields({ name: '🔴 Xem trực tiếp', value: `[Xem YouTube Live ngay tại đây](${youtubeUrl})`, inline: true })
          .setThumbnail(`https://img.youtube.com/vi/${liveConfig.youtube_video_id}/maxresdefault.jpg`)
          .setTimestamp().setFooter({ text: 'ECODEx Live Streaming' });

        await channel.send({ content: '@everyone 📺 Buổi học trực tiếp Live Class đã bắt đầu!', embeds: [embed] }).catch(() => null);
      }
    })
    .subscribe();
}

async function syncUserLevelRoles(client, discordId, level, studentName) {
  const levelRoleMap = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith('ROLE_LEVEL_') && value) {
      const lvl = parseInt(key.replace('ROLE_LEVEL_', ''), 10);
      if (!isNaN(lvl)) levelRoleMap[lvl] = value;
    }
  }

  for (const guild of client.guilds.cache.values()) {
    try {
      const member = await guild.members.fetch(discordId).catch(() => null);
      if (!member) continue;

      let newRoleId = null;
      const sortedThresholds = Object.keys(levelRoleMap).map(Number).sort((a, b) => b - a);
      for (const threshold of sortedThresholds) {
        if (level >= threshold && levelRoleMap[threshold]) { newRoleId = levelRoleMap[threshold]; break; }
      }

      if (!newRoleId) continue;
      const newRole = guild.roles.cache.get(newRoleId);
      if (!newRole) continue;

      const rolesToRemove = [];
      for (const roleId of Object.values(levelRoleMap)) {
        if (roleId && roleId !== newRoleId && member.roles.cache.has(roleId)) rolesToRemove.push(roleId);
      }

      if (rolesToRemove.length > 0) {
        await member.roles.remove(rolesToRemove).catch(e => console.error('[ROLE ERROR] Failed to remove roles:', e.message));
      }

      if (!member.roles.cache.has(newRoleId)) {
        await member.roles.add(newRoleId).catch(e => console.error('[ROLE ERROR] Failed to add role:', e.message));

        const announceChannelId = ANNOUNCE_CHANNEL_ID || CLASS_TEXT_CHANNEL_ID;
        if (announceChannelId) {
          const announceChannel = guild.channels.cache.get(announceChannelId);
          if (announceChannel && announceChannel.isTextBased()) {
            const embed = new EmbedBuilder()
              .setColor(0xF59E0B).setTitle('🎉 LÊN CẤP ĐỘ MỚI!')
              .setDescription(`Chúc mừng học sinh **${studentName}** (<@${discordId}>) đã đạt **Level ${level}** trên hệ thống!\nHạng danh hiệu mới: **${newRole.name}** 🏆`)
              .setTimestamp().setFooter({ text: 'ECODEx Gamification System' });
            await announceChannel.send({ embeds: [embed] }).catch(() => null);
          }
        }
      }
    } catch (err) {
      console.error('[ROLE SYNC ERROR]', err.message);
    }
  }
}

module.exports = { setupRealtimeSubscriptions };
