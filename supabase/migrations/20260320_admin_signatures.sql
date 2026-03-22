-- 20260320_admin_signatures: Extended fields for digital signatures and document functionality

-- 1. Updates to transcript_config for signature management
ALTER TABLE transcript_config 
ADD COLUMN IF NOT EXISTS signature_data TEXT, -- SVG or Base64 data
ADD COLUMN IF NOT EXISTS signature_type TEXT DEFAULT 'draw', -- 'draw' or 'type'
ADD COLUMN IF NOT EXISTS signature_font TEXT, -- CSS font family for typed signature
ADD COLUMN IF NOT EXISTS apply_transcripts BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS apply_certificates BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS apply_badges BOOLEAN DEFAULT FALSE;

-- 2. Updates to transcripts table for UI compatibility
ALTER TABLE transcripts
ADD COLUMN IF NOT EXISTS total_marks NUMERIC,
ADD COLUMN IF NOT EXISTS average_score NUMERIC,
ADD COLUMN IF NOT EXISTS branding_snapshot JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS title TEXT;

COMMENT ON COLUMN transcript_config.signature_data IS 'Digital signature data (SVG recommended)';
