-- =============================================
-- MIGRATION: ADD UPDATE POLICY FOR EXAM PARTICIPANTS
-- Allow students to update their activity status and last active timestamp during exams
-- =============================================

DROP POLICY IF EXISTS "Users can update own participation" ON public.exam_participants;
CREATE POLICY "Users can update own participation" ON public.exam_participants
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
