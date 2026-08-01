-- Reconcile inconsistent student onboarding flags.
--
-- The whole system now agrees on ONE rule: a student is fully onboarded iff
-- BOTH profiles.has_onboarded AND students.onboarded are true.
--
-- Historical drift:
--   * The old student-onboarding flow only wrote students.onboarded, so
--     completed students often have students.onboarded = true with the profile
--     flag left false.
--   * A single-flag derivation (student.onboarded = students.onboarded OR
--     profiles.has_onboarded) let accounts with profiles.has_onboarded = true
--     but no real onboarding skip the flow entirely.
--
-- This migration honors students who genuinely completed onboarding and revokes
-- the phantom flag on students who never did.

-- 1. Students who genuinely completed onboarding but whose profile flag was
--    never written (legacy completion flow). Honor their completed setup.
UPDATE profiles p
SET has_onboarded = TRUE
FROM students s
WHERE s.user_id = p.id
  AND p.role = 'student'
  AND s.onboarded = TRUE
  AND (p.has_onboarded IS NULL OR p.has_onboarded = FALSE);

-- 2. SECURITY: Students who never completed onboarding (students.onboarded is
--    false) but whose profile flag drifted to true would bypass the onboarding
--    gate. Revoke the phantom flag so they are forced through onboarding.
UPDATE profiles p
SET has_onboarded = FALSE
FROM students s
WHERE s.user_id = p.id
  AND p.role = 'student'
  AND s.onboarded IS DISTINCT FROM TRUE
  AND p.has_onboarded = TRUE;
