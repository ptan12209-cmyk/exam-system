-- ============================================================================
-- Casso webhook: dedupe processed bank transactions
-- Run in Supabase SQL Editor
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.casso_processed_transactions (
    casso_id bigint PRIMARY KEY,
    order_id uuid REFERENCES public.online_orders(id) ON DELETE SET NULL,
    amount numeric,
    description text,
    processed_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_casso_processed_at
  ON public.casso_processed_transactions(processed_at DESC);

ALTER TABLE public.casso_processed_transactions ENABLE ROW LEVEL SECURITY;

-- No client access — only service_role / server admin client
DROP POLICY IF EXISTS "casso_no_direct_client" ON public.casso_processed_transactions;
-- Intentionally no policies for authenticated users (service role bypasses RLS)
