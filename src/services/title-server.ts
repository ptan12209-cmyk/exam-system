import { SupabaseClient } from '@supabase/supabase-js';
import { ApiError } from '@/lib/api-utils';

export class TitleServerService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Fetch all titles with unlock status computed for the given user.
   */
  async getTitlesWithStatus(userId: string) {
    // Get all titles sorted by sort_order
    const { data: titles, error: titlesError } = await this.supabase
      .from('titles')
      .select('*')
      .order('sort_order');

    if (titlesError) {
      console.error('Get titles error:', titlesError);
      throw new ApiError('INTERNAL_ERROR', 'Failed to fetch titles', 500);
    }

    // Get user's XP
    const { data: stats } = await this.supabase
      .from('student_stats')
      .select('xp')
      .eq('user_id', userId)
      .single();

    // Get user's equipped title
    const { data: profile } = await this.supabase
      .from('profiles')
      .select('equipped_title_id')
      .eq('id', userId)
      .single();

    // Get user's unlocked achievements
    const { data: userAchievements } = await this.supabase
      .from('user_achievements')
      .select('achievement_id')
      .eq('user_id', userId);

    const unlockedAchievementIds = new Set(userAchievements?.map((ua) => ua.achievement_id) || []);
    const userXp = stats?.xp || 0;

    // Mark which titles are unlocked
    const titlesWithUnlock =
      titles?.map((title) => {
        let isUnlocked = false;

        if (title.unlock_xp !== null) {
          isUnlocked = userXp >= title.unlock_xp;
        } else if (title.unlock_achievement_id) {
          isUnlocked = unlockedAchievementIds.has(title.unlock_achievement_id);
        } else {
          isUnlocked = true; // No unlock requirement
        }

        return {
          ...title,
          isUnlocked,
          isEquipped: profile?.equipped_title_id === title.id,
        };
      }) || [];

    return {
      titles: titlesWithUnlock,
      equippedTitleId: profile?.equipped_title_id ?? null,
      userXp,
    };
  }

  /**
   * Validate unlock requirements and equip a title for the user.
   * Pass titleId = null to unequip.
   */
  async equipTitle(userId: string, titleId: string | null) {
    if (titleId) {
      // Verify title exists
      const { data: title, error: titleError } = await this.supabase
        .from('titles')
        .select('*')
        .eq('id', titleId)
        .single();

      if (titleError || !title) {
        throw new ApiError('NOT_FOUND', 'Title not found', 404);
      }

      // Check XP requirement
      if (title.unlock_xp !== null) {
        const { data: stats } = await this.supabase
          .from('student_stats')
          .select('xp')
          .eq('user_id', userId)
          .single();

        if ((stats?.xp || 0) < title.unlock_xp) {
          throw new ApiError('FORBIDDEN', 'Not enough XP', 403);
        }
      }

      // Check achievement requirement
      if (title.unlock_achievement_id) {
        const { data: userAchievement, error: achError } = await this.supabase
          .from('user_achievements')
          .select('id')
          .eq('user_id', userId)
          .eq('achievement_id', title.unlock_achievement_id)
          .single();

        if (achError || !userAchievement) {
          throw new ApiError('FORBIDDEN', 'Achievement not unlocked', 403);
        }
      }
    }

    // Update profile
    const { error: updateError } = await this.supabase
      .from('profiles')
      .update({ equipped_title_id: titleId })
      .eq('id', userId);

    if (updateError) {
      console.error('Equip title error:', updateError);
      throw new ApiError('INTERNAL_ERROR', 'Failed to equip title', 500);
    }

    return { success: true };
  }
}
