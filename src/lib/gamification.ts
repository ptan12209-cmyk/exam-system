// Re-export everything from the gamification sub-modules
// This file preserved for backward compatibility — all existing imports
// like `from "@/lib/gamification"` continue to work.
export {
  XP_REWARDS,
  calculateLevel,
  xpForNextLevel,
  levelProgress,
  calculateExamXP,
  resetBadgesCache,
  getBadges,
  checkAndAwardBadges,
  getLeaderboard,
  updateStudentStats,
  getUserStats,
} from "./gamification/index"
export type { Badge } from "./gamification/index"
