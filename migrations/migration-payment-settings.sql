-- ============================================================================
-- Migration: Create Payment Settings Table for Prices & Bank Account Configuration
-- Run this in Supabase SQL Editor
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.payment_settings (
    key text PRIMARY KEY,
    value jsonb NOT NULL
);

-- Enable RLS
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;

-- Allow select for authenticated
DROP POLICY IF EXISTS "Allow select on payment_settings" ON public.payment_settings;
CREATE POLICY "Allow select on payment_settings" ON public.payment_settings
    FOR SELECT TO authenticated USING (true);

-- Allow all for teachers/admins
DROP POLICY IF EXISTS "Allow teachers and admins to modify payment_settings" ON public.payment_settings;
CREATE POLICY "Allow teachers and admins to modify payment_settings" ON public.payment_settings
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('teacher', 'admin')
        )
    );
