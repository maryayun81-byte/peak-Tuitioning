-- ============================================================
-- TRIVIA ARENA: TOTAL SYSTEM RESET
-- This will delete ALL trivia groups (session-specific) AND 
-- ALL persistent squads (Academy Squads).
-- Use this to clear the board entirely and resolve membership 
-- conflicts for all students.
-- ============================================================

-- 1. Clear session-specific groups
DELETE FROM trivia_groups;

-- 2. Clear persistent Academy squads
-- (This also clears squad_members via CASCADE)
DELETE FROM squads;

-- 3. Notify schema change
NOTIFY pgrst, 'reload schema';
