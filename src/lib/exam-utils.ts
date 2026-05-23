/**
 * Parse an answer key string into a question-number-to-answer mapping.
 * Accepts various delimiters: commas, semicolons, whitespace.
 * Answer format: number followed by optional dot/dash and letter A-D.
 *
 * @param input - Raw answer key string (e.g., "1A 2B 3.C 4-D").
 * @returns A Record mapping question numbers to their correct answer letters.
 */
export function parseAnswerKey(input: string): Record<number, string> {
  const result: Record<number, string> = {};
  for (const part of input.split(/[,;\s]+/).filter(Boolean)) {
    const match = part.match(/(\d+)[.\-]?([A-Da-d])/);
    if (match) result[parseInt(match[1])] = match[2].toUpperCase();
  }
  return result;
}

/** Minimal interface for exam availability check */
export interface ExamAvailabilityInput {
  is_scheduled?: boolean
  start_time?: string
  end_time?: string
}

/**
 * Check if an exam is currently available to take.
 * Returns true if not scheduled, or if current time is within the window.
 */
export function isExamAvailable(exam: ExamAvailabilityInput): boolean {
  if (!exam.is_scheduled) return true
  const now = new Date()
  if (exam.start_time && new Date(exam.start_time) > now) return false
  if (exam.end_time && new Date(exam.end_time) < now) return false
  return true
}
