/**
 * Format thời gian thi từ giây sang dạng tiếng Việt
 */
export function formatTimeSpent(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  return `${mins} phút ${secs} giây`
}

/**
 * Format thời gian thi rút gọn
 */
export function formatTimeSpentShort(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  return `${mins}p ${secs}s`
}
