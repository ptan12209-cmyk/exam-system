-- ============================================================================
-- V4: extra index for time-range queries on access logs (anomaly scan)
-- Safe to re-run. Requires content_access_logs to exist.
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_content_access_logs_created
  ON public.content_access_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_content_access_logs_action_created
  ON public.content_access_logs(action, created_at DESC);
