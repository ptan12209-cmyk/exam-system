import { IeltsSkill } from '@/types'

// Bảng quy đổi điểm Reading (Academic)
export const READING_BAND_TABLE: Record<number, number> = {
  40: 9.0, 39: 9.0,
  38: 8.5, 37: 8.5,
  36: 8.0, 35: 8.0,
  34: 7.5, 33: 7.5,
  32: 7.0, 31: 7.0, 30: 7.0,
  29: 6.5, 28: 6.5, 27: 6.5,
  26: 6.0, 25: 6.0, 24: 6.0, 23: 6.0,
  22: 5.5, 21: 5.5, 20: 5.5, 19: 5.5,
  18: 5.0, 17: 5.0, 16: 5.0, 15: 5.0,
  14: 4.5, 13: 4.5, 12: 4.5,
  11: 4.0, 10: 4.0, 9: 4.0, 8: 4.0,
  7: 3.5, 6: 3.5, 5: 3.5,
  4: 3.0, 3: 2.5, 2: 2.0, 1: 1.0, 0: 0.0
}

// Bảng quy đổi điểm Listening (IDP/BC Chuẩn)
export const LISTENING_BAND_TABLE: Record<number, number> = {
  40: 9.0, 39: 9.0,
  38: 8.5, 37: 8.5,
  36: 8.0, 35: 8.0,
  34: 7.5, 33: 7.5, 32: 7.5,
  31: 7.0, 30: 7.0,
  29: 6.5, 28: 6.5, 27: 6.5, 26: 6.5,
  25: 6.0, 24: 6.0, 23: 6.0,
  22: 5.5, 21: 5.5, 20: 5.5,
  19: 5.0, 18: 5.0, 17: 5.0, 16: 5.0,
  15: 4.5, 14: 4.5, 13: 4.5,
  12: 4.0, 11: 4.0, 10: 4.0,
  9: 3.5, 8: 3.5, 7: 3.5,
  6: 3.0, 5: 3.0,
  4: 2.5, 3: 2.5,
  2: 2.0, 1: 1.0, 0: 0.0
}

/**
 * Quy đổi số câu đúng sang band score IELTS từ 0.0 - 9.0
 */
export function correctCountToBand(correct: number, skill: 'reading' | 'listening'): number {
  const table = skill === 'reading' ? READING_BAND_TABLE : LISTENING_BAND_TABLE
  
  // Trả về trực tiếp nếu có key chính xác
  if (correct in table) {
    return table[correct]
  }

  // Tìm band score phù hợp nhất
  if (correct >= 40) return 9.0
  if (correct <= 0) return 0.0

  // Fallback tìm phần tử gần nhất nhỏ hơn hoặc bằng
  let bestBand = 0
  for (let i = correct; i >= 0; i--) {
    if (i in table) {
      bestBand = table[i]
      break
    }
  }

  return bestBand
}

// Danh sách các kỹ năng hỗ trợ trong IELTS
export const IELTS_SKILLS = [
  { value: 'reading', label: 'Reading', icon: '📖', color: 'from-blue-500/20 to-cyan-500/20 text-cyan-400 border-cyan-500/30' },
  { value: 'listening', label: 'Listening', icon: '🎧', color: 'from-purple-500/20 to-violet-500/20 text-violet-400 border-violet-500/30' },
  { value: 'writing', label: 'Writing', icon: '✍️', color: 'from-amber-500/20 to-orange-500/20 text-orange-400 border-orange-500/30' },
] as const

// Nhãn hiển thị cho các dạng câu hỏi
export const QUESTION_TYPE_LABELS: Record<string, string> = {
  multiple_choice: 'Trắc nghiệm (MC)',
  true_false_ng: 'True / False / Not Given',
  yes_no_ng: 'Yes / No / Not Given',
  fill_blank: 'Điền vào chỗ trống',
  matching: 'Nối đáp án',
  short_answer: 'Trả lời ngắn',
  sentence_completion: 'Hoàn thành câu',
  diagram_label: 'Điền nhãn sơ đồ',
  heading_match: 'Nối tiêu đề (Heading Matching)',
}

// Thời lượng thi tiêu chuẩn (Standard IELTS - tính bằng phút)
export const STANDARD_DURATIONS: Record<IeltsSkill, number> = {
  reading: 60,
  listening: 30,
  writing: 60,
}

/**
 * Trả về thời lượng thi (phút) tùy theo timerMode
 */
export function getTestDuration(
  skill: IeltsSkill,
  timerMode: 'standard' | 'custom',
  customDuration?: number
): number {
  if (timerMode === 'custom' && customDuration && customDuration > 0) {
    return customDuration
  }
  return STANDARD_DURATIONS[skill]
}
