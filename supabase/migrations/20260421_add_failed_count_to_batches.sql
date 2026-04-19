-- Add total_failed column to credential_batches
ALTER TABLE credential_batches ADD COLUMN IF NOT EXISTS total_failed INT NOT NULL DEFAULT 0;
