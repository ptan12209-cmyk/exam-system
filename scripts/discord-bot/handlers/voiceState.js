/**
 * Voice state update handler + periodic timer for AFK enforcement, escalation, and checkins.
 * Extracted from tracker.js — the largest single handler.
 */
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { activeSessions, activeCheckins, afkCooldowns, setAfkCooldown, getMutedDuration, getSharingScreenDuration, getCameraDuration } = require('../utils/sessions');
const { syncSession } = require('../utils/sync');
const { notifyTeacher } = require('../utils/embeds');
const {
  CLASS_VOICE_CHANNEL_ID, AFK_VOICE_CHANNEL_ID,
  AFK_DEAFEN_TIMEOUT_SECONDS, AFK_MUTE_TIMEOUT_SECONDS, AFK_SCREENSHARE_TIMEOUT_SECONDS,
  CHECKIN_INTERVAL_SECONDS, AFK_REJOIN_COOLDOWN_SECONDS, CLASS_TEXT_CHANNEL_ID
} = require('../utils/constants');

function registerVoiceStateHandler(client) {
  client.on('voiceStateUpdate', async (oldState, newState) => {
    const userId = newState.id;
    const username = newState.member?.user?.username || userId;
    const isDeafened = newState.selfDeaf || newState.serverDeaf;
    const isMuted = newState.selfMute || newState.serverMute;
    const isSharingScreen = newState.streaming;
    const isCameraOn = newState.selfVideo;

    // Case 1: Joined the classroom
    if (newState.channelId === CLASS_VOICE_CHANNEL_ID && oldState.channelId !== CLASS_VOICE_CHANNEL_ID) {
      // Rejoin cooldown check
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
            .setColor(0xEF4444).setTitle('⏳ Bạn đang trong thời gian chờ')
            .setDescription(`Bạn đã bị chuyển sang phòng AFK trước đó. Vui lòng đợi thêm **${Math.ceil(remainingSeconds / 60)} phút** trước khi quay lại phòng học.`)
            .setTimestamp().setFooter({ text: 'ECODEx Learning System' });
          await newState.member.send({ embeds: [embed] }).catch(() => null);
        } catch (e) {
          console.error(`[COOLDOWN ERROR] Failed to enforce cooldown for ${userId}:`, e.message);
        }
        return;
      }
      afkCooldowns.delete(userId);

      console.log(`[JOIN] ${username} entered the classroom.`);
      activeSessions.set(userId, {
        joinedAt: Date.now(), durationOffset: 0, lastSyncedAt: Date.now(),
        deafened: isDeafened, deafenedSince: isDeafened ? Date.now() : null,
        muted: isMuted, mutedSince: isMuted ? Date.now() : null, mutedDuration: 0,
        sharingScreen: isSharingScreen, sharingScreenSince: isSharingScreen ? Date.now() : null, sharingScreenDuration: 0,
        cameraOn: isCameraOn, cameraSince: isCameraOn ? Date.now() : null, cameraDuration: 0,
        screenShareReminderSent: isSharingScreen, joinTime: Date.now(),
        noScreenshareSince: isSharingScreen ? null : Date.now(), lastCheckinTime: Date.now(),
        deafenWarningLevel: 0, muteWarningLevel: 0, screenshareWarningLevel: 0
      });

      const status = isDeafened ? 'discord_afk' : 'discord_class';
      await syncSession(userId, status, 0, isDeafened, 0, isSharingScreen, isCameraOn, 0, 0);

      // Join-Mute Detection
      if (isMuted && !isDeafened) {
        console.log(`[JOIN-MUTE] ${username} joined with mic already muted!`);
        try {
          const embed = new EmbedBuilder()
            .setColor(0xF59E0B).setTitle('⚠️ Cảnh báo: Mic đang tắt')
            .setDescription('Bạn đã vào phòng học với mic bị tắt. Vui lòng bật mic để thầy cô có thể tương tác với bạn. Nếu tiếp tục tắt mic, bạn sẽ bị chuyển sang phòng AFK.')
            .setTimestamp().setFooter({ text: 'ECODEx Learning System' });
          await newState.member.send({ embeds: [embed] }).catch(() => null);
        } catch (e) { console.error('[JOIN-MUTE DM ERROR]', e.message); }
        await notifyTeacher(client, '⚠️ Học sinh vào phòng với mic tắt', `**${username}** (<@${userId}>) đã tham gia phòng học với mic đã tắt sẵn. Có thể cần theo dõi thêm.`, 0xF59E0B);
      }
    }

    // Case 2: Left the classroom
    else if (oldState.channelId === CLASS_VOICE_CHANNEL_ID && newState.channelId !== CLASS_VOICE_CHANNEL_ID) {
      console.log(`[LEAVE] ${username} left the classroom.`);
      const session = activeSessions.get(userId);
      if (session) {
        let finalDuration = session.durationOffset;
        if (!session.deafened) finalDuration += Math.floor((Date.now() - session.joinedAt) / 1000);

        if (session.sharingScreen && session.sharingScreenSince) {
          session.sharingScreenDuration += Math.floor((Date.now() - session.sharingScreenSince) / 1000);
          session.sharingScreenSince = null;
        }
        if (session.cameraOn && session.cameraSince) {
          session.cameraDuration += Math.floor((Date.now() - session.cameraSince) / 1000);
          session.cameraSince = null;
        }

        const finalMuted = getMutedDuration(session);
        const checkin = activeCheckins.get(userId);
        if (checkin) { clearTimeout(checkin.timeoutId); activeCheckins.delete(userId); }
        activeSessions.delete(userId);

        await syncSession(userId, 'offline', finalDuration, false, finalMuted, false, false, session.sharingScreenDuration, session.cameraDuration);
      }
    }

    // Case 3: Status change while in channel
    else if (newState.channelId === CLASS_VOICE_CHANNEL_ID && oldState.channelId === CLASS_VOICE_CHANNEL_ID) {
      const session = activeSessions.get(userId);
      if (!session) return;

      const oldDeafened = session.deafened;
      const oldMuted = session.muted;
      const oldSharingScreen = session.sharingScreen;
      const oldCameraOn = session.cameraOn;

      // Deafen change
      if (oldDeafened !== isDeafened) {
        console.log(`[DEAFEN] ${username}: ${oldDeafened} -> ${isDeafened}`);
        if (!oldDeafened) session.durationOffset += Math.floor((Date.now() - session.joinedAt) / 1000);
        session.joinedAt = Date.now();
        session.deafened = isDeafened;
        session.deafenedSince = isDeafened ? Date.now() : null;
        if (!isDeafened) session.deafenWarningLevel = 0;

        const status = isDeafened ? 'discord_afk' : 'discord_class';
        await syncSession(userId, status, session.durationOffset, isDeafened, getMutedDuration(session), session.sharingScreen, session.cameraOn, getSharingScreenDuration(session), getCameraDuration(session));
      }

      // Mute change
      if (oldMuted !== isMuted) {
        console.log(`[MUTE] ${username}: ${oldMuted} -> ${isMuted}`);
        if (isMuted) { session.mutedSince = Date.now(); }
        else { if (session.mutedSince) { session.mutedDuration += Math.floor((Date.now() - session.mutedSince) / 1000); session.mutedSince = null; } }
        session.muted = isMuted;
        if (!isMuted) session.muteWarningLevel = 0;
      }

      // Screen share change
      if (oldSharingScreen !== isSharingScreen) {
        console.log(`[SCREENSHARE] ${username}: ${oldSharingScreen} -> ${isSharingScreen}`);
        if (isSharingScreen) {
          session.sharingScreenSince = Date.now(); session.screenShareReminderSent = true;
          session.noScreenshareSince = null; session.screenshareWarningLevel = 0;
        } else {
          if (session.sharingScreenSince) { session.sharingScreenDuration += Math.floor((Date.now() - session.sharingScreenSince) / 1000); session.sharingScreenSince = null; }
          session.noScreenshareSince = Date.now();
        }
        session.sharingScreen = isSharingScreen;
        const status = session.deafened ? 'discord_afk' : 'discord_class';
        await syncSession(userId, status, session.deafened ? session.durationOffset : (session.durationOffset + Math.floor((Date.now() - session.joinedAt) / 1000)), session.deafened, getMutedDuration(session), isSharingScreen, session.cameraOn, getSharingScreenDuration(session), getCameraDuration(session));
      }

      // Camera change
      if (oldCameraOn !== isCameraOn) {
        console.log(`[CAMERA] ${username}: ${oldCameraOn} -> ${isCameraOn}`);
        if (isCameraOn) { session.cameraSince = Date.now(); }
        else { if (session.cameraSince) { session.cameraDuration += Math.floor((Date.now() - session.cameraSince) / 1000); session.cameraSince = null; } }
        session.cameraOn = isCameraOn;
        const status = session.deafened ? 'discord_afk' : 'discord_class';
        await syncSession(userId, status, session.deafened ? session.durationOffset : (session.durationOffset + Math.floor((Date.now() - session.joinedAt) / 1000)), session.deafened, getMutedDuration(session), session.sharingScreen, isCameraOn, getSharingScreenDuration(session), getCameraDuration(session));
      }
    }
  });
}

function startPeriodicTimer(client) {
  setInterval(async () => {
    const now = Date.now();
    for (const [userId, session] of activeSessions.entries()) {
      let currentDuration = session.durationOffset;
      if (!session.deafened) currentDuration += Math.floor((now - session.joinedAt) / 1000);

      const status = session.deafened ? 'discord_afk' : 'discord_class';
      const mutedTotal = getMutedDuration(session);
      const sharingScreenTotal = getSharingScreenDuration(session);
      const cameraTotal = getCameraDuration(session);

      // 1. Sync to API
      await syncSession(userId, status, currentDuration, session.deafened, mutedTotal, session.sharingScreen, session.cameraOn, sharingScreenTotal, cameraTotal);
      session.lastSyncedAt = now;

      // 2. Screen share reminder (3 min)
      if (!session.sharingScreen && !session.screenShareReminderSent) {
        const elapsedMinutes = (now - session.joinTime) / 1000 / 60;
        if (elapsedMinutes >= 3) {
          session.screenShareReminderSent = true;
          try {
            const user = await client.users.fetch(userId);
            if (user) {
              const embed = new EmbedBuilder()
                .setColor(0xF59E0B).setTitle('🖥️ Nhắc nhở: Chia sẻ màn hình')
                .setDescription('Bạn đã tham gia phòng học Discord được 3 phút nhưng chưa chia sẻ màn hình. Vui lòng bật chia sẻ màn hình để được tính giờ học hiệu quả nhé! Thầy cô cần theo dõi màn hình học tập của bạn.')
                .setTimestamp().setFooter({ text: 'ECODEx Learning System' });
              await user.send({ embeds: [embed] });
              console.log(`[REMINDER SENT] Sent screen share reminder to ${user.username}`);
            }
          } catch (e) { console.error(`[REMINDER ERROR]`, e.message); }
        }
      }

      // 2.5. Random Check-in
      if (!session.deafened && !activeCheckins.has(userId)) {
        const timeSinceLastCheckin = now - (session.lastCheckinTime || session.joinTime);
        if (timeSinceLastCheckin >= CHECKIN_INTERVAL_SECONDS * 1000) {
          try {
            const userObj = await client.users.fetch(userId);
            if (userObj) {
              const confirmBtn = new ButtonBuilder()
                .setCustomId(`checkin_confirm_${userId}`).setLabel('Xác nhận tôi vẫn đang học 🙋‍♂️').setStyle(ButtonStyle.Success);
              const row = new ActionRowBuilder().addComponents(confirmBtn);
              const embed = new EmbedBuilder()
                .setColor(0x3B82F6).setTitle('🎯 Điểm danh ngẫu nhiên (Random Check-in)')
                .setDescription('Hệ thống kiểm tra sự tập trung của học sinh. Vui lòng click vào nút bên dưới trong vòng **3 phút** để xác nhận bạn vẫn đang học tập.')
                .setTimestamp().setFooter({ text: 'ECODEx Learning System' });

              const dmMessage = await userObj.send({ embeds: [embed], components: [row] });

              const timeoutId = setTimeout(async () => {
                activeCheckins.delete(userId);
                const expiredEmbed = new EmbedBuilder()
                  .setColor(0xEF4444).setTitle('❌ Điểm danh thất bại')
                  .setDescription('Bạn đã không xác nhận điểm danh đúng hạn (3 phút). Bạn đã bị chuyển sang phòng AFK.')
                  .setTimestamp().setFooter({ text: 'ECODEx Learning System' });
                await dmMessage.edit({ embeds: [expiredEmbed], components: [] }).catch(() => null);

                const voiceChannel = client.channels.cache.get(CLASS_VOICE_CHANNEL_ID);
                if (voiceChannel && voiceChannel.isVoiceBased()) {
                  const member = voiceChannel.members.get(userId);
                  if (member && AFK_VOICE_CHANNEL_ID) {
                    await member.voice.setChannel(AFK_VOICE_CHANNEL_ID).catch(() => null);
                    console.log(`[AUTO-AFK] Moved ${member.user.username} to AFK due to check-in timeout.`);
                    setAfkCooldown(userId);
                    await notifyTeacher(client, '❌ Học sinh không xác nhận điểm danh', `**${member.user.username}** (<@${userId}>) đã không xác nhận điểm danh trong 3 phút và bị chuyển sang phòng AFK.\nCooldown: ${Math.round(AFK_REJOIN_COOLDOWN_SECONDS / 60)} phút.`, 0xEF4444);
                  }
                }
              }, 180000);

              activeCheckins.set(userId, { messageId: dmMessage.id, timeoutId, triggeredAt: now });
              session.lastCheckinTime = now;
              console.log(`[CHECKIN TRIGGERED] Sent check-in request to student ${userObj.username}`);
            }
          } catch (e) {
            console.error(`[CHECKIN TRIGGER ERROR]`, e.message);
            session.lastCheckinTime = now;
          }
        }
      }

      // 3. Escalation Warning System
      const escalationChecks = [];

      if (session.deafened && session.deafenedSince) {
        escalationChecks.push({ type: 'deafen', elapsed: Math.floor((now - session.deafenedSince) / 1000), timeout: AFK_DEAFEN_TIMEOUT_SECONDS, warningKey: 'deafenWarningLevel', reason: 'tắt tai nghe', reasonFull: `tắt tai nghe quá ${Math.round(AFK_DEAFEN_TIMEOUT_SECONDS / 60)} phút` });
      }
      if (session.muted && session.mutedSince) {
        escalationChecks.push({ type: 'mute', elapsed: Math.floor((now - session.mutedSince) / 1000), timeout: AFK_MUTE_TIMEOUT_SECONDS, warningKey: 'muteWarningLevel', reason: 'tắt tiếng mic', reasonFull: `tắt tiếng mic quá ${Math.round(AFK_MUTE_TIMEOUT_SECONDS / 60)} phút` });
      }
      if (!session.sharingScreen && session.noScreenshareSince) {
        escalationChecks.push({ type: 'screenshare', elapsed: Math.floor((now - session.noScreenshareSince) / 1000), timeout: AFK_SCREENSHARE_TIMEOUT_SECONDS, warningKey: 'screenshareWarningLevel', reason: 'không chia sẻ màn hình', reasonFull: `không chia sẻ màn hình quá ${Math.round(AFK_SCREENSHARE_TIMEOUT_SECONDS / 60)} phút` });
      }

      let shouldMove = false;
      let moveReason = '';

      for (const check of escalationChecks) {
        const currentLevel = session[check.warningKey] || 0;
        const threshold33 = Math.floor(check.timeout / 3);
        const threshold66 = Math.floor((check.timeout * 2) / 3);

        // Level 0 → DM warning at 33%
        if (currentLevel === 0 && check.elapsed >= threshold33) {
          session[check.warningKey] = 1;
          const remainingMin = Math.ceil((check.timeout - check.elapsed) / 60);
          try {
            const user = await client.users.fetch(userId);
            if (user) {
              const embed = new EmbedBuilder()
                .setColor(0xF59E0B).setTitle('⚠️ Cảnh báo lần 1')
                .setDescription(`Bạn đã **${check.reason}** được ${Math.round(check.elapsed / 60)} phút. Nếu tiếp tục, bạn sẽ bị chuyển sang phòng AFK sau khoảng **${remainingMin} phút** nữa.`)
                .setTimestamp().setFooter({ text: 'ECODEx Learning System' });
              await user.send({ embeds: [embed] }).catch(() => null);
              console.log(`[ESCALATION L1] DM warning sent to ${user.username} for: ${check.reason}`);
            }
          } catch (e) { console.error('[ESCALATION L1 ERROR]', e.message); }
        }

        // Level 1 → Public ping at 66%
        if (currentLevel === 1 && check.elapsed >= threshold66) {
          session[check.warningKey] = 2;
          const remainingMin = Math.ceil((check.timeout - check.elapsed) / 60);
          try {
            let textChannel = CLASS_TEXT_CHANNEL_ID ? client.channels.cache.get(CLASS_TEXT_CHANNEL_ID) : null;
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
          } catch (e) { console.error('[ESCALATION L2 ERROR]', e.message); }
          await notifyTeacher(client, '⚠️ Cảnh báo lần 2 — Sắp bị AFK', `Học sinh <@${userId}> đã **${check.reason}** được **${Math.round(check.elapsed / 60)} phút** và đã nhận 2 cảnh báo. Sẽ tự động chuyển AFK sau **${Math.ceil((check.timeout - check.elapsed) / 60)} phút**.`, 0xEF4444);
        }

        // Level 2 → Move to AFK at 100%
        if (currentLevel >= 2 && check.elapsed >= check.timeout) {
          shouldMove = true;
          moveReason = check.reasonFull;
          break;
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
              setAfkCooldown(userId);
              const embed = new EmbedBuilder()
                .setColor(0xEF4444).setTitle('🔇 Bạn đã bị chuyển sang phòng AFK')
                .setDescription(`Hệ thống đã tự động chuyển bạn sang phòng AFK vì bạn đã **${moveReason}**.\n\n⏳ Bạn cần đợi **${Math.round(AFK_REJOIN_COOLDOWN_SECONDS / 60)} phút** trước khi có thể quay lại phòng học.`)
                .setTimestamp().setFooter({ text: 'ECODEx Learning System' });
              await member.send({ embeds: [embed] }).catch(() => null);
              await notifyTeacher(client, '🚫 Học sinh bị chuyển sang AFK', `**${member.user.username}** (<@${userId}>) đã bị tự động chuyển sang phòng AFK vì: **${moveReason}**.\nCooldown: ${Math.round(AFK_REJOIN_COOLDOWN_SECONDS / 60)} phút.`, 0xEF4444);
            } catch (e) { console.error(`[AUTO-AFK ERROR]`, e.message); }
          }
        }
      }

      // Cleanup expired cooldowns
      for (const [cooldownUserId, expiresAt] of afkCooldowns.entries()) {
        if (now >= expiresAt) afkCooldowns.delete(cooldownUserId);
      }
    }
  }, 30000);
}

module.exports = { registerVoiceStateHandler, startPeriodicTimer };
