-- ============================================================
-- Peak Performance Tutoring
-- Migration: Delete all assignments, quizzes, trivia sessions, and practice questions
-- Context: User requested to delete all assignments/quests created by teachers.
-- ============================================================

BEGIN;

-- 1. Delete all Assignments (this will cascade to submissions and annotations depending on the foreign key constraints)
DELETE FROM assignments;

-- 2. Delete all Quizzes (cascades to quiz_attempts)
DELETE FROM quizzes;

-- 3. Delete all Trivia Sessions (cascades to trivia_questions, trivia_groups, trivia_group_members, trivia_submissions)
DELETE FROM trivia_sessions;

-- 4. Delete all Practice Questions
DELETE FROM practice_questions;

-- 5. Delete all Notifications
DELETE FROM notifications;

-- 6. Delete all Schemes of Work & Resources (optional but often considered part of teacher's created content)
-- We'll leave schemes_of_work and resources alone unless specifically asked to clear all teacher content, 
-- since the user specified "assignments ie quests".

COMMIT;
