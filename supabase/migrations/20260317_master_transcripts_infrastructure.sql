-- MASTER TRANSCRIPTS SYSTEM: Database Schema Enhancements
-- Adds lifecycle management and granular remarks capability.

-- 1. Enhance Exam Events with Status Lifecycle
ALTER TABLE exam_events 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active' 
CHECK (status IN ('active', 'closed', 'generated', 'published'));

-- 2. Enhance Exam Marks with Teacher Remarks
ALTER TABLE exam_marks 
ADD COLUMN IF NOT EXISTS teacher_remark TEXT;

-- 3. Add Performance Summary to Transcripts (if not already handled via JSONB)
-- We'll explicitly add these to make querying easier for rankings/analytics
ALTER TABLE transcripts 
ADD COLUMN IF NOT EXISTS total_marks NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS average_score NUMERIC(10,2);

-- 4. Branding Snapshot in Transcripts
-- Captures the state of branding (school name, logos) at the moment of generation
ALTER TABLE transcripts
ADD COLUMN IF NOT EXISTS branding_snapshot JSONB DEFAULT '{}';

-- 5. RLS Policies for the new fields (Admins manage everything)
-- Existing policies should cover most, but ensuring Admin can update status
DROP POLICY IF EXISTS "Admin manages exam events" ON exam_events;
CREATE POLICY "Admin manages exam events" 
ON exam_events FOR ALL 
USING (auth_role() = 'admin');

-- Refresh schema for PostgREST
NOTIFY pgrst, 'reload schema';
