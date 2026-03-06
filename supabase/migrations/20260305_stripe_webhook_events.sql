-- B16-11: DB-backed Stripe webhook idempotency
-- Persists processed event IDs so deduplication survives server restarts.
-- Stripe retries within 72 hours; we keep records for 7 days.

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  event_id     TEXT        PRIMARY KEY,
  processed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_processed_at
  ON stripe_webhook_events (processed_at);
