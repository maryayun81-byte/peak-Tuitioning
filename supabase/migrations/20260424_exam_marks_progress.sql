-- Add progress_summary to exam_marks to allow for qualitative feedback without numeric marks
ALTER TABLE exam_marks ADD COLUMN IF NOT EXISTS progress_summary TEXT;

-- Update transcripts generation to potentially use this
-- Add progress_summary to the JSONB structure if needed, but we'll handled it in code
