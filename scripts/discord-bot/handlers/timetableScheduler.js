const supabase = require('../utils/supabase');
const { EmbedBuilder } = require('discord.js');
const { activeSessions } = require('../utils/sessions');
const { CLASS_VOICE_CHANNEL_ID, ANNOUNCE_CHANNEL_ID, CLASS_TEXT_CHANNEL_ID } = require('../utils/constants');

// In-memory sets to prevent duplicate DMs / public warnings for the day
const sentPings = new Set();
const sentPublicReminders = new Set();

// Function to resolve student timetable (database custom + class + default fallback)
async function getStudentTimetable(profile) {
  try {
    // 1. Fetch custom entries
    const { data: customEntries } = await supabase
      .from('student_timetable_entries')
      .select('*')
      .eq('student_id', profile.id);

    // 2. Fetch class entries
    let classEntries = [];
    if (profile.class) {
      const { data: cEntries } = await supabase
        .from('timetable_entries')
        .select('*')
        .eq('class_name', profile.class);
      if (cEntries) classEntries = cEntries;
    }

    // 3. Fallback for Student X if no entries are found
    const defaultSlots = [];
    if ((!customEntries || customEntries.length === 0) && classEntries.length === 0 && profile.nickname === 'X') {
      // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      // Monday to Saturday (1 to 6)
      for (let d = 1; d <= 6; d++) {
        defaultSlots.push({ id: `def-sang-${d}`, day_of_week: d, start_time: '08:00', end_time: '10:30', subject: 'Toán / Sinh Học (Ca Sáng)' });
        defaultSlots.push({ id: `def-chieu1-${d}`, day_of_week: d, start_time: '14:00', end_time: '16:30', subject: 'Vật Lý / Ngữ Văn (Ca Chiều 1)' });
        defaultSlots.push({ id: `def-chieu2-${d}`, day_of_week: d, start_time: '16:45', end_time: '19:15', subject: 'Hóa Học / Tiếng Anh (Ca Chiều 2)' });
        defaultSlots.push({ id: `def-toi-${d}`, day_of_week: d, start_time: '20:00', end_time: '22:30', subject: 'V-ACT (Ca Tối)' });
      }
    }

    const merged = [...(customEntries || [])];
    for (const entry of classEntries) {
      const exists = merged.some(e => 
        e.day_of_week === entry.day_of_week &&
        e.start_time.slice(0, 5) === entry.start_time.slice(0, 5) &&
        e.subject.toLowerCase() === entry.subject.toLowerCase()
      );
      if (!exists) {
        merged.push({
          id: entry.id,
          day_of_week: entry.day_of_week,
          start_time: entry.start_time,
          end_time: entry.end_time,
          subject: entry.subject,
          class_name: entry.class_name,
          room: entry.room,
          note: entry.note || "Lịch học chung của lớp"
        });
      }
    }

    return [...merged, ...defaultSlots];
  } catch (err) {
    console.error(`[TIMETABLE ERROR] Failed to resolve timetable for ${profile.id}:`, err.message);
    return [];
  }
}

// Main execution function called periodically
async function checkTimetables(client) {
  try {
    const now = new Date();
    const vnTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
    const dayOfWeek = vnTime.getUTCDay();
    const hours = vnTime.getUTCHours();
    const minutes = vnTime.getUTCMinutes();
    const dateStr = vnTime.toISOString().split('T')[0];
    const currentMinutes = hours * 60 + minutes;

    // Fetch all student profiles with linked discord_id
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, full_name, class, nickname, discord_id')
      .eq('role', 'student')
      .not('discord_id', 'is', null);

    if (error || !profiles) return;

    for (const profile of profiles) {
      const timetable = await getStudentTimetable(profile);
      const todaySlots = timetable.filter(entry => entry.day_of_week === dayOfWeek);

      for (const entry of todaySlots) {
        if (!entry.subject || entry.subject === 'Nghỉ' || entry.subject.toLowerCase() === 'nghỉ') {
          continue;
        }
        const [startH, startM] = entry.start_time.split(':').map(Number);
        const [endH, endM] = entry.end_time.split(':').map(Number);
        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;

        // ────────────────── 1. PRE-CLASS DM PINGS ──────────────────
        // Ping student 5 times in the 10 minutes before class (every 2 minutes)
        const timeDiff = startMinutes - currentMinutes; // minutes remaining
        if (timeDiff > 0 && timeDiff <= 10) {
          const pingNumber = Math.ceil(timeDiff / 2); // 5, 4, 3, 2, 1
          const pingKey = `${profile.id}-${entry.id}-${dateStr}-${pingNumber}`;

          if (!sentPings.has(pingKey)) {
            sentPings.add(pingKey);
            const user = await client.users.fetch(profile.discord_id).catch(() => null);
            if (user) {
              const pingIndexStr = `${6 - pingNumber}/5`;
              const embed = new EmbedBuilder()
                .setColor(0x3B82F6)
                .setTitle(`⏰ Sắp đến giờ học: ${entry.subject}`)
                .setDescription(`Chào **${profile.full_name || 'học sinh'}**,\n\nCa học môn **${entry.subject}** (${entry.start_time.slice(0, 5)} - ${entry.end_time.slice(0, 5)}) của bạn sẽ bắt đầu sau **${timeDiff} phút**.\n\n👉 Vui lòng chuẩn bị sẵn sàng và tham gia phòng học Discord đúng giờ nhé!\n*(Nhắc nhở lần ${pingIndexStr})*`)
                .setTimestamp()
                .setFooter({ text: 'ECODEx Learning System' });
              await user.send({ embeds: [embed] }).catch(() => null);
              console.log(`[PING DM] Sent reminder ${pingIndexStr} to ${profile.full_name} (${timeDiff}m remaining).`);
            }
          }
        }

        // ────────────────── 2. RECORD STUDY TIME & ABSENT REMINDERS ──────────────────
        // Check if current time is within class hours
        if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
          const isStudying = activeSessions.has(profile.discord_id);

          if (isStudying) {
            // A. Student is actively studying! Record study time for this slot.
            // Check-in interval is 30s. We add 30s of duration.
            const slotLogKey = `${profile.id}-${entry.id}-${dateStr}`;
            
            // Check if log already exists
            const { data: existingLog } = await supabase
              .from('timetable_study_logs')
              .select('id, duration_seconds')
              .eq('student_id', profile.id)
              .eq('slot_id', entry.id)
              .eq('session_date', dateStr)
              .maybeSingle();

            const newDuration = (existingLog ? existingLog.duration_seconds : 0) + 30;
            
            // Mark as completed if studied >= 60 minutes (3600 seconds)
            // or >= 50% of slot duration, let's say 3600 seconds (1 hour) is standard
            const slotDurationTotalSeconds = (endMinutes - startMinutes) * 60;
            const thresholdSeconds = Math.min(3600, slotDurationTotalSeconds * 0.5); // 1h or 50%
            const isCompleted = newDuration >= thresholdSeconds;

            await supabase
              .from('timetable_study_logs')
              .upsert({
                student_id: profile.id,
                slot_id: entry.id,
                subject: entry.subject,
                session_date: dateStr,
                duration_seconds: newDuration,
                is_completed: isCompleted,
                start_time: entry.start_time,
                end_time: entry.end_time
              }, {
                onConflict: 'student_id,slot_id,session_date'
              });

            console.log(`[RECORDING TIME] Recorded 30s for ${profile.full_name} in slot: ${entry.subject}. Total: ${Math.round(newDuration / 60)}m. Completed: ${isCompleted}`);
          } else {
            // B. Student is NOT studying! Check if we should send a public reminder.
            // Reminder sent at class start (e.g. 1st minute) and at 5 minutes late.
            const elapsedLate = currentMinutes - startMinutes;
            if (elapsedLate >= 0 && elapsedLate <= 5) {
              const reminderKey = `${profile.id}-${entry.id}-${dateStr}-${elapsedLate >= 5 ? 'late5' : 'start'}`;
              
              if (!sentPublicReminders.has(reminderKey)) {
                sentPublicReminders.add(reminderKey);

                // Fetch guild to find channels
                const voiceChannel = await client.channels.fetch(CLASS_VOICE_CHANNEL_ID).catch(() => null);
                if (voiceChannel && voiceChannel.guild) {
                  const channel = await getReminderChannel(client, voiceChannel.guild);
                  if (channel) {
                    const lateText = elapsedLate >= 5 ? `đã muộn **5 phút** 🚨` : `đã bắt đầu ⏰`;
                    await channel.send({
                      content: `🚨 **CẢNH BÁO VẮNG HỌC** 🚨\nChào <@${profile.discord_id}>, ca học môn **${entry.subject}** (${entry.start_time.slice(0, 5)} - ${entry.end_time.slice(0, 5)}) ${lateText}.\n\nHiện tại hệ thống nhận thấy bạn vẫn chưa vào phòng học Discord.\n👉 Vui lòng tham gia phòng học ngay lập tức!`
                    }).catch(() => null);
                    console.log(`[PUBLIC WARNING] Sent late reminder for ${profile.full_name} (${elapsedLate}m late).`);
                  }
                }
              }
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('[TIMETABLE SCHEDULER ERROR]', err);
  }
}

async function getReminderChannel(client, guild) {
  if (process.env.CLASS_TEXT_CHANNEL_ID) {
    const channel = await client.channels.fetch(process.env.CLASS_TEXT_CHANNEL_ID).catch(() => null);
    if (channel) return channel;
  }
  if (process.env.ANNOUNCE_CHANNEL_ID) {
    const channel = await client.channels.fetch(process.env.ANNOUNCE_CHANNEL_ID).catch(() => null);
    if (channel) return channel;
  }
  if (guild) {
    const textChannels = guild.channels.cache.filter(c => c.type === 0);
    const found = textChannels.find(c => c.name.includes('classroom') || c.name.includes('nhac-nho') || c.name.includes('general')) || textChannels.first();
    if (found) return found;
  }
  return null;
}

function startTimetableScheduler(client) {
  // Run every 30 seconds
  setInterval(() => {
    checkTimetables(client);
  }, 30000);
  console.log('[TIMETABLE SCHEDULER] Periodic tracker initialized (interval: 30s).');
}

module.exports = { startTimetableScheduler };
