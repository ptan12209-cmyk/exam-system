/**
 * /lichhoc — Xem thời khóa biểu cá nhân và ca học tiếp theo
 */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const supabase = require('../utils/supabase');

// Map day index to Vietnamese day name
const dayNames = { 1: 'Thứ 2', 2: 'Thứ 3', 3: 'Thứ 4', 4: 'Thứ 5', 5: 'Thứ 6', 6: 'Thứ 7', 0: 'Chủ Nhật' };

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

    // Fallback for Student X if no entries are found
    if (merged.length === 0 && profile.nickname === 'X') {
      const defaultSlots = [
        // Thứ 2
        { day_of_week: 1, start_time: "11:30:00", end_time: "12:30:00", subject: "Toán Học", note: "Đại số / Giải tích" },
        { day_of_week: 1, start_time: "14:30:00", end_time: "15:30:00", subject: "Hóa Học", note: "Lý thuyết / Bài tập" },
        { day_of_week: 1, start_time: "20:00:00", end_time: "21:00:00", subject: "Văn / Tiếng Việt", note: "Đọc hiểu / Phân tích" },
        { day_of_week: 1, start_time: "23:00:00", end_time: "00:00:00", subject: "Tư duy Khoa Học", note: "ĐGNL - Giải quyết vấn đề" },
        // Thứ 3
        { day_of_week: 2, start_time: "11:30:00", end_time: "12:30:00", subject: "Vật Lý", note: "Lý thuyết / Bài tập" },
        { day_of_week: 2, start_time: "15:00:00", end_time: "16:00:00", subject: "Tiếng Anh", note: "ĐGNL - Từ vựng / Ngữ pháp" },
        { day_of_week: 2, start_time: "20:00:00", end_time: "21:00:00", subject: "Toán Học", note: "Hình học" },
        { day_of_week: 2, start_time: "23:00:00", end_time: "00:00:00", subject: "Tư duy Logic / PTSL", note: "ĐGNL - Suy luận" },
        // Thứ 4
        { day_of_week: 3, start_time: "11:30:00", end_time: "12:30:00", subject: "Sinh Học", note: "Lý thuyết cốt lõi" },
        { day_of_week: 3, start_time: "14:30:00", end_time: "15:30:00", subject: "Văn / Tiếng Việt", note: "Luyện đề ĐGNL" },
        { day_of_week: 3, start_time: "20:00:00", end_time: "21:00:00", subject: "Vật Lý", note: "Vận dụng" },
        { day_of_week: 3, start_time: "23:00:00", end_time: "00:00:00", subject: "Toán ĐGNL", note: "Phản xạ nhanh" },
        // Thứ 5
        { day_of_week: 4, start_time: "11:30:00", end_time: "12:30:00", subject: "Hóa Học", note: "Vận dụng / Phương trình" },
        { day_of_week: 4, start_time: "15:00:00", end_time: "16:00:00", subject: "Tiếng Anh", note: "ĐGNL - Đọc hiểu" },
        { day_of_week: 4, start_time: "20:00:00", end_time: "21:00:00", subject: "Sinh Học", note: "Di truyền / Sinh thái" },
        { day_of_week: 4, start_time: "23:00:00", end_time: "00:00:00", subject: "Tư duy Khoa Học", note: "ĐGNL" },
        // Thứ 6
        { day_of_week: 5, start_time: "11:30:00", end_time: "12:30:00", subject: "Văn / Tiếng Việt", note: "Nghị luận văn học" },
        { day_of_week: 5, start_time: "14:30:00", end_time: "15:30:00", subject: "Tư duy Logic / PTSL", note: "ĐGNL" },
        { day_of_week: 5, start_time: "20:00:00", end_time: "21:00:00", subject: "Toán Học", note: "Vận dụng cao" },
        { day_of_week: 5, start_time: "23:00:00", end_time: "00:00:00", subject: "Giải Đề Mini", note: "Chọn 1 môn bất kỳ" },
        // Thứ 7
        { day_of_week: 6, start_time: "11:30:00", end_time: "12:30:00", subject: "Tiếng Anh", note: "ĐGNL - Tổng hợp" },
        { day_of_week: 6, start_time: "17:30:00", end_time: "18:30:00", subject: "Hóa Học", note: "Luyện đề" },
        { day_of_week: 6, start_time: "20:30:00", end_time: "21:30:00", subject: "Vật Lý", note: "Luyện đề" },
        { day_of_week: 6, start_time: "23:00:00", end_time: "00:00:00", subject: "Luyện Đề ĐGNL", note: "Bấm giờ thực tế" },
        // Chủ Nhật
        { day_of_week: 0, start_time: "11:30:00", end_time: "12:30:00", subject: "Toán Học", note: "Tổng ôn tuần" },
        { day_of_week: 0, start_time: "17:30:00", end_time: "18:30:00", subject: "Văn / Tiếng Việt", note: "Tổng ôn tuần" },
        { day_of_week: 0, start_time: "20:30:00", end_time: "21:30:00", subject: "Tư duy Logic / PTSL", note: "Tổng ôn tuần" },
        { day_of_week: 0, start_time: "23:00:00", end_time: "00:00:00", subject: "Chữa Lỗi Sai", note: "Review toàn bộ tuần (Rất quan trọng)" }
      ];
      return defaultSlots;
    }

    return merged;
  } catch (err) {
    console.error(`[TIMETABLE ERROR] Failed to resolve timetable for ${profile.id}:`, err.message);
    return [];
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lichhoc')
    .setDescription('Xem thời khóa biểu cá nhân của bạn và ca học tiếp theo'),

  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const userId = interaction.user.id;
      
      // Fetch student profile linked to this Discord ID
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, full_name, class, nickname, discord_study_channel_id')
        .eq('discord_id', userId)
        .maybeSingle();

      if (error) {
        console.error('[LICHHOC DB ERROR]', error);
        return interaction.editReply('❌ Lỗi hệ thống khi tìm kiếm thông tin của bạn. Vui lòng liên hệ quản trị viên.');
      }

      if (!profile) {
        return interaction.editReply('❌ Tài khoản Discord của bạn chưa được liên kết với hệ thống học tập.\n👉 Vui lòng điền Discord ID chính xác tại trang **Chỉnh Sửa Hồ Sơ** trên website.');
      }

      const timetable = await getStudentTimetable(profile);

      if (!timetable || timetable.length === 0) {
        return interaction.editReply('📭 Thời khóa biểu của bạn trống. Không tìm thấy ca học nào được phân bổ.');
      }

      // Time conversion helper
      const now = new Date();
      const vnTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
      const currentDayOfWeek = vnTime.getUTCDay(); // 0 = Sunday, 1 = Monday...
      const currentHours = vnTime.getUTCHours();
      const currentMinutes = vnTime.getUTCMinutes();
      const currentTotalMinutes = currentHours * 60 + currentMinutes;

      let activeEntry = null;
      let nextEntry = null;
      let minDiffMinutes = Infinity;

      for (const entry of timetable) {
        if (!entry.subject || entry.subject === 'Nghỉ' || entry.subject.toLowerCase() === 'nghỉ') continue;
        
        const [sh, sm] = entry.start_time.split(':').map(Number);
        const [eh, em] = entry.end_time.split(':').map(Number);
        const startTotalMinutes = sh * 60 + sm;
        const endTotalMinutes = eh * 60 + em;

        // Check if currently active
        if (entry.day_of_week === currentDayOfWeek && currentTotalMinutes >= startTotalMinutes && currentTotalMinutes < endTotalMinutes) {
          activeEntry = entry;
        }

        // Calculate time diff to find the next ca
        let dayDiff = entry.day_of_week - currentDayOfWeek;
        if (dayDiff < 0) {
          dayDiff += 7;
        }

        let diffMinutes = 0;
        if (dayDiff === 0) {
          if (startTotalMinutes > currentTotalMinutes) {
            diffMinutes = startTotalMinutes - currentTotalMinutes;
          } else {
            diffMinutes = 7 * 24 * 60 + (startTotalMinutes - currentTotalMinutes);
          }
        } else {
          diffMinutes = dayDiff * 24 * 60 + (startTotalMinutes - currentTotalMinutes);
        }

        if (diffMinutes < minDiffMinutes) {
          minDiffMinutes = diffMinutes;
          nextEntry = entry;
        }
      }

      // Filter and format today's slots
      const todaySlots = timetable.filter(entry => entry.day_of_week === currentDayOfWeek);
      todaySlots.sort((a, b) => a.start_time.localeCompare(b.start_time));

      let todaySlotsText = '';
      if (todaySlots.length === 0) {
        todaySlotsText = '_Hôm nay bạn không có lịch học cố định._';
      } else {
        todaySlots.forEach((slot, idx) => {
          const start = slot.start_time.slice(0, 5);
          const end = slot.end_time.slice(0, 5);
          const isCurrent = activeEntry && activeEntry.id === slot.id ? ' 🟢 **(Đang học)**' : '';
          todaySlotsText += `${idx + 1}. **${start} - ${end}**: ${slot.subject}${slot.note ? ` _(${slot.note})_` : ''}${isCurrent}\n`;
        });
      }

      // Embed formatting
      const embed = new EmbedBuilder()
        .setColor(0x8B5CF6)
        .setTitle(`📅 THỜI KHÓA BIỂU CÁ NHÂN`)
        .setDescription(`Học sinh: **${profile.full_name}** (${profile.nickname || 'Không có biệt danh'})\nLớp: **${profile.class || 'Thí sinh tự do'}**`)
        .addFields(
          { name: `📅 Lịch Học Hôm Nay (${dayNames[currentDayOfWeek]})`, value: todaySlotsText },
        )
        .setTimestamp()
        .setFooter({ text: 'ECODEx Learning System' });

      // Add active ca field
      if (activeEntry) {
        embed.addFields({
          name: '📚 Ca Học Hiện Tại',
          value: `🔥 Môn học: **${activeEntry.subject}**\n⏱️ Thời gian: **${activeEntry.start_time.slice(0, 5)} - ${activeEntry.end_time.slice(0, 5)}**`
        });
      }

      // Add next ca field
      if (nextEntry) {
        const nextDayName = dayNames[nextEntry.day_of_week];
        const nextStart = nextEntry.start_time.slice(0, 5);
        const nextEnd = nextEntry.end_time.slice(0, 5);

        let countdownText = '';
        if (minDiffMinutes < 60) {
          countdownText = `(Bắt đầu sau ${minDiffMinutes} phút)`;
        } else {
          const hours = Math.floor(minDiffMinutes / 60);
          const mins = minDiffMinutes % 60;
          countdownText = `(Bắt đầu sau ${hours} giờ ${mins} phút)`;
        }

        embed.addFields({
          name: '🔮 Ca Học Tiếp Theo',
          value: `📚 Môn: **${nextEntry.subject}**\n📅 Vào **${nextDayName}** lúc **${nextStart} - ${nextEnd}**\n⏳ ${countdownText}`
        });
      }

      if (profile.discord_study_channel_id) {
        embed.addFields({
          name: '🎙️ Kênh Học Tập Riêng',
          value: `Kênh voice của bạn: <#${profile.discord_study_channel_id}>`
        });
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error('[LICHHOC ERROR]', err.message);
      await interaction.editReply('❌ Có lỗi xảy ra khi truy vấn thời khóa biểu. Vui lòng thử lại sau.');
    }
  }
};
