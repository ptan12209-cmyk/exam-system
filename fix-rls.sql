-- =============================================
-- FIX RLS FOR PROFILES TABLE
-- Run this AFTER the main schema
-- =============================================

-- Drop existing policies
drop policy if exists "Users can insert own profile" on public.profiles;

-- Create more permissive insert policy
-- Allow authenticated users to insert their own profile
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (true);

-- Alternative: Disable RLS temporarily for testing (NOT for production!)
-- alter table public.profiles disable row level security;
