-- §50 — LEARN screen shows "what this is for + estimated time".
-- Teacher-set estimate per resource; NULL = not set (UI simply omits it).

ALTER TABLE public.learning_resources
  ADD COLUMN IF NOT EXISTS estimated_minutes integer NULL
  CHECK (estimated_minutes IS NULL OR estimated_minutes > 0);
