/**
 * Các hằng số thưởng XP cho hệ thống gamification.
 * Các giá trị này được trao khi hoàn thành bài thi, đạt điểm cao,
 * đạt điểm tuyệt đối và theo chuỗi ngày liên tục.
 */
export const XP_REWARDS = {
    /** XP được thưởng khi hoàn thành bất kỳ bài thi nào. */
    EXAM_COMPLETED: 50,
    /** XP thưởng thêm khi điểm số >= 8. */
    HIGH_SCORE: 20,
    /** XP thưởng thêm khi điểm số đạt đúng 10. */
    PERFECT_SCORE: 100,
    /** XP thưởng thêm cho mỗi ngày liên tục hoạt động. */
    STREAK_BONUS: 10,
    /** Giữ chỗ cho XP từ huy hiệu (huy hiệu tự trao XP riêng). */
    BADGE_EARNED: 0
}

/**
 * Tính cấp độ của người dùng từ tổng điểm kinh nghiệm (XP).
 * Công thức: floor(sqrt(xp / 100)) + 1
 *
 * @param xp - Tổng điểm kinh nghiệm của người dùng.
 * @returns Cấp độ hiện tại, là số nguyên dương (tối thiểu 1).
 */
export function calculateLevel(xp: number): number {
    return Math.floor(Math.sqrt(xp / 100)) + 1
}

/**
 * Tính tổng XP cần để thăng cấp từ cấp hiện tại lên cấp tiếp theo.
 * Công thức: currentLevel^2 * 100
 *
 * @param currentLevel - Cấp độ hiện tại của người dùng.
 * @returns Tổng XP cần để đạt cấp tiếp theo.
 */
export function xpForNextLevel(currentLevel: number): number {
    return Math.pow(currentLevel, 2) * 100
}

/**
 * Tính phần trăm tiến độ lên cấp tiếp theo (0-100).
 * Xác định mức độ người dùng đã tiến được giữa mốc XP của cấp hiện tại
 * và mốc XP cần để lên cấp.
 *
 * @param xp - Tổng điểm kinh nghiệm của người dùng.
 * @returns Giá trị từ 0 đến 100 thể hiện phần trăm tiến độ.
 */
export function levelProgress(xp: number): number {
    const currentLevel = calculateLevel(xp)
    const xpForCurrent = Math.pow(currentLevel - 1, 2) * 100
    const xpForNext = xpForNextLevel(currentLevel)
    const progress = ((xp - xpForCurrent) / (xpForNext - xpForCurrent)) * 100
    return Math.min(Math.max(progress, 0), 100)
}

/**
 * Tính tổng XP nhận được khi hoàn thành một bài thi.
 * Bao gồm XP cơ bản cộng thưởng cho điểm cao và điểm tuyệt đối.
 *
 * @param score - Điểm bài thi (thang 0-10).
 * @returns Tổng XP được thưởng cho lần làm bài này.
 */
export function calculateExamXP(score: number): number {
    let xp = XP_REWARDS.EXAM_COMPLETED

    if (score >= 10) {
        xp += XP_REWARDS.PERFECT_SCORE
    } else if (score >= 8) {
        xp += XP_REWARDS.HIGH_SCORE
    }

    return xp
}
