-- Migration: Add reading position tracking to library_student_progress
ALTER TABLE library_student_progress 
ADD COLUMN IF NOT EXISTS last_page INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS last_position_percent FLOAT DEFAULT 0.0;
