-- NUCLEAR OPTION: Disable RLS on ALL tables in the schema
-- Run this in Supabase SQL Editor

-- Disable RLS on ALL public tables
DO $$ 
DECLARE 
    tbl RECORD;
BEGIN
    FOR tbl IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', tbl.tablename);
        RAISE NOTICE 'Disabled RLS on: %', tbl.tablename;
    END LOOP;
END $$;

-- Verify ALL tables have RLS disabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
