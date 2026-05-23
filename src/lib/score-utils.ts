/**
 * Shared score utility functions.
 * Provides formatting and display helpers for exam scores.
 * Previously duplicated across multiple result/score pages.
 */

/**
 * Format time in seconds to mm:ss
 */
export function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
}

/**
 * Get Tailwind CSS color class based on score
 * Returns a string of classes suitable for text coloring with dark mode support
 */
export function getScoreColor(score: number): string {
    if (score >= 8) return "text-emerald-600 dark:text-emerald-400"
    if (score >= 6.5) return "text-indigo-600 dark:text-indigo-400"
    if (score >= 5) return "text-amber-600 dark:text-amber-400"
    return "text-red-600 dark:text-red-400"
}

/**
 * Get a Vietnamese message based on score
 */
export function getScoreMessage(score: number): string {
    if (score >= 8) return "Làm tốt lắm"
    if (score >= 6.5) return "Khá tốt"
    if (score >= 5) return "Đạt yêu cầu"
    return "Cần cố gắng thêm"
}
