-- ============================================================================
-- payOS: store integer orderCode + payment link id on online_orders
-- Run in Supabase SQL Editor
-- ============================================================================

ALTER TABLE public.online_orders
  ADD COLUMN IF NOT EXISTS payment_order_code bigint,
  ADD COLUMN IF NOT EXISTS payment_link_id text,
  ADD COLUMN IF NOT EXISTS payment_provider text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_online_orders_payment_order_code
  ON public.online_orders (payment_order_code)
  WHERE payment_order_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_online_orders_payment_link_id
  ON public.online_orders (payment_link_id)
  WHERE payment_link_id IS NOT NULL;
