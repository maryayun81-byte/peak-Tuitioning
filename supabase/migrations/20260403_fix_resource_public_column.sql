-- Migration: Add is_public column to resources table
-- This column is required for public sharing of educational materials.

ALTER TABLE resources 
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT TRUE;

-- Ensure tuition_center_id is also present as a fallback
ALTER TABLE resources 
  ADD COLUMN IF NOT EXISTS tuition_center_id UUID REFERENCES tuition_centers(id) ON DELETE SET NULL;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
