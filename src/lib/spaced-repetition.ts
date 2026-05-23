/**
 * Thẻ lặp lại ngắt quãng (Spaced Repetition Card).
 * Lưu thông tin về một câu hỏi cần ôn tập theo thuật toán SM-2.
 */
export interface SRCard {
  id?: string;
  user_id: string;
  question_id: string;
  exam_id?: string;
  ease_factor: number; // default 2.5, min 1.3
  interval_days: number;
  repetitions: number;
  next_review_date: string; // ISO timestamp
  last_review_date?: string;
}

/**
 * Kết quả đánh giá của một lần ôn tập.
 */
export interface ReviewResult {
  quality: number; // 0-5: 0=complete blackout, 5=perfect
}

/**
 * Tính toán lịch ôn tập tiếp theo dựa trên thuật toán SM-2.
 * Dựa trên thẻ hiện tại và chất lượng đánh giá (0-5), trả về các thuộc tính thẻ đã cập nhật.
 *
 * @param card - Thẻ hiện tại chứa ease_factor, interval_days, repetitions.
 * @param quality - Chất lượng đánh giá (0-5: 0=quên hoàn toàn, 5=nhớ hoàn hảo).
 * @returns Đối tượng chứa ease_factor, interval_days, repetitions, và next_review_date đã cập nhật.
 */
export function calculateNextReview(
  card: { ease_factor: number; interval_days: number; repetitions: number },
  quality: number
): {
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  next_review_date: string;
} {
  let { ease_factor, interval_days, repetitions } = card;

  if (quality >= 3) {
    // Correct response
    if (repetitions === 0) {
      interval_days = 1;
    } else if (repetitions === 1) {
      interval_days = 6;
    } else {
      interval_days = Math.round(interval_days * ease_factor);
    }
    repetitions += 1;
    // Update ease factor
    ease_factor = ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    ease_factor = Math.max(1.3, ease_factor);
  } else {
    // Incorrect response - reset
    repetitions = 0;
    interval_days = 1;
    // ease_factor unchanged
  }

  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + interval_days);

  return {
    ease_factor: Math.round(ease_factor * 100) / 100,
    interval_days,
    repetitions,
    next_review_date: nextDate.toISOString(),
  };
}

/**
 * Đưa các câu trả lời sai vào hàng đợi ôn tập sau khi nộp bài thi.
 * Gọi hàm này từ route nộp bài. Với mỗi câu hỏi sai, kiểm tra xem đã có thẻ hay chưa,
 * nếu chưa thì tạo thẻ mới với ngày ôn tập là ngay lập tức.
 *
 * @param supabase - Phiên bản Supabase client.
 * @param userId - Mã định danh người dùng.
 * @param examId - Mã bài thi.
 * @param wrongQuestionIds - Mảng ID các câu hỏi bị sai.
 * @returns Promise phân giải thành số lượng câu hỏi đã được đưa vào hàng đợi.
 */
export async function enqueueWrongAnswers(
  supabase: any,
  userId: string,
  examId: string,
  wrongQuestionIds: string[]
): Promise<number> {
  let enqueued = 0;
  for (const questionId of wrongQuestionIds) {
    // Check if already enqueued
    const { data: existing } = await supabase
      .from('spaced_repetition_cards')
      .select('id')
      .eq('user_id', userId)
      .eq('question_id', questionId)
      .maybeSingle();

    if (!existing) {
      const { error } = await supabase.from('spaced_repetition_cards').insert({
        user_id: userId,
        question_id: questionId,
        exam_id: examId,
        ease_factor: 2.5,
        interval_days: 0,
        repetitions: 0,
        next_review_date: new Date().toISOString(), // due immediately
      });
      if (!error) enqueued++;
    }
    // If already exists, skip (don't reset their progress)
  }
  return enqueued;
}
