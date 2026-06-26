-- 1. Add is_advanced column to public.exams table
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS is_advanced boolean DEFAULT false;

-- 2. Create trigger to automatically calculate and sync level when XP changes on student_stats
CREATE OR REPLACE FUNCTION public.sync_student_level()
RETURNS TRIGGER AS $$
BEGIN
  NEW.level := floor(sqrt(NEW.xp / 100)) + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_sync_student_level ON public.student_stats;
CREATE TRIGGER trigger_sync_student_level
  BEFORE INSERT OR UPDATE OF xp ON public.student_stats
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_student_level();

-- 3. Update all existing student_stats rows to calculate level from current xp
UPDATE public.student_stats SET level = floor(sqrt(xp / 100)) + 1;
