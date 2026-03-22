-- Premium Transcript Enhancements
-- Adds fields for rankings and performance metrics to support luxury-grade transcripts.

-- 1. Add ranking and score fields to transcripts
ALTER TABLE transcripts ADD COLUMN IF NOT EXISTS total_marks NUMERIC(10,2);
ALTER TABLE transcripts ADD COLUMN IF NOT EXISTS average_score NUMERIC(10,2);
ALTER TABLE transcripts ADD COLUMN IF NOT EXISTS class_rank INTEGER;
ALTER TABLE transcripts ADD COLUMN IF NOT EXISTS curriculum_rank INTEGER;

-- 2. Add an index for ranking lookups
CREATE INDEX IF NOT EXISTS idx_transcripts_ranks ON transcripts(exam_event_id, class_rank, curriculum_rank);

-- 3. Refresh schema cache
NOTIFY pgrst, 'reload schema';
