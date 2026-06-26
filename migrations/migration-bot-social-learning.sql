-- ============================================================================
-- SOCIAL LEARNING & AI INTEGRATION: 1V1 DUELS & DAILY CHALLENGES
-- ============================================================================

-- 1. 1v1 Peer Challenges Table
CREATE TABLE IF NOT EXISTS public.peer_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  opponent_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'completed', 'cancelled')),
  questions JSONB NOT NULL,            -- Array of 5 questions generated/sampled
  challenger_answers JSONB DEFAULT '{}'::jsonb, -- { "1": "A", "2": "B", ... }
  opponent_answers JSONB DEFAULT '{}'::jsonb,   -- { "1": "B", "2": "C", ... }
  challenger_score INTEGER DEFAULT 0,
  opponent_score INTEGER DEFAULT 0,
  winner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  xp_stake INTEGER DEFAULT 50,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.peer_challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated can view duels" ON public.peer_challenges;
CREATE POLICY "Anyone authenticated can view duels" ON public.peer_challenges FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can insert duels" ON public.peer_challenges;
CREATE POLICY "Users can insert duels" ON public.peer_challenges FOR INSERT TO authenticated WITH CHECK (auth.uid() = challenger_id);

DROP POLICY IF EXISTS "Users can update own duels" ON public.peer_challenges;
CREATE POLICY "Users can update own duels" ON public.peer_challenges FOR UPDATE TO authenticated USING (auth.uid() = challenger_id OR auth.uid() = opponent_id);

-- 2. Daily Challenges Table
CREATE TABLE IF NOT EXISTS public.daily_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_date DATE UNIQUE DEFAULT CURRENT_DATE,
  questions JSONB NOT NULL,             -- Array of 3 questions
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.daily_challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated can view daily challenges" ON public.daily_challenges;
CREATE POLICY "Anyone authenticated can view daily challenges" ON public.daily_challenges FOR SELECT TO authenticated USING (true);

-- 3. Daily Challenge Submissions Table
CREATE TABLE IF NOT EXISTS public.daily_challenge_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_challenge_id UUID REFERENCES public.daily_challenges(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  answers JSONB NOT NULL,               -- e.g. ["A", "B", "C"]
  score INTEGER NOT NULL,               -- 0 to 3
  xp_rewarded INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(daily_challenge_id, student_id)
);

ALTER TABLE public.daily_challenge_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own daily submissions" ON public.daily_challenge_submissions;
CREATE POLICY "Users can view own daily submissions" ON public.daily_challenge_submissions FOR SELECT TO authenticated USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Users can insert own daily submissions" ON public.daily_challenge_submissions;
CREATE POLICY "Users can insert own daily submissions" ON public.daily_challenge_submissions FOR INSERT TO authenticated WITH CHECK (auth.uid() = student_id);
