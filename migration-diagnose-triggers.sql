-- CHECK AND FIX DATABASE TRIGGERS AND REALTIME
-- Run each section separately in Supabase SQL Editor

-- 1. List all triggers on submissions table
SELECT 
    trigger_name, 
    event_manipulation, 
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'submissions';

-- 2. List all triggers on all tables
SELECT 
    event_object_table as table_name,
    trigger_name, 
    event_manipulation
FROM information_schema.triggers 
WHERE event_object_schema = 'public';

-- 3. Drop ALL triggers on submissions (dangerous but necessary)
-- Copy the trigger names from step 1 and drop them:
-- DROP TRIGGER trigger_name ON public.submissions;

-- 4. Check realtime publications
SELECT * FROM pg_publication;

-- 5. Remove submissions from realtime (if exists)
-- ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.submissions;

-- 6. Check if there are any functions being called
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname LIKE '%submission%';
