-- Invite-and-earn plus visible duel records.

CREATE TABLE IF NOT EXISTS student_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  referred_student_id UUID UNIQUE REFERENCES students(id) ON DELETE SET NULL,
  referral_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
  xp_awarded BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_student_referrals_referrer
  ON student_referrals(referrer_student_id, status);

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by_student_id UUID REFERENCES students(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS duel_wins INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS duel_losses INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS duel_draws INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS duel_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  duel_id UUID NOT NULL REFERENCES classroom_duels(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  opponent_student_id UUID REFERENCES students(id) ON DELETE SET NULL,
  result TEXT NOT NULL CHECK (result IN ('win', 'loss', 'draw')),
  score INTEGER NOT NULL DEFAULT 0,
  opponent_score INTEGER NOT NULL DEFAULT 0,
  xp_awarded INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(duel_id, student_id)
);

ALTER TABLE student_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE duel_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students view related referrals" ON student_referrals;
CREATE POLICY "Students view related referrals" ON student_referrals
  FOR SELECT USING (
    referrer_student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
    OR referred_student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
    OR auth_role() = 'admin'
  );

DROP POLICY IF EXISTS "Students create own referrals" ON student_referrals;
CREATE POLICY "Students create own referrals" ON student_referrals
  FOR INSERT WITH CHECK (
    referrer_student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Admin manages referrals" ON student_referrals;
CREATE POLICY "Admin manages referrals" ON student_referrals
  FOR ALL USING (auth_role() = 'admin')
  WITH CHECK (auth_role() = 'admin');

DROP POLICY IF EXISTS "Students view own duel results" ON duel_results;
CREATE POLICY "Students view own duel results" ON duel_results
  FOR SELECT USING (
    student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
    OR auth_role() = 'admin'
  );

DROP POLICY IF EXISTS "Authenticated duel result inserts" ON duel_results;
CREATE POLICY "Authenticated duel result inserts" ON duel_results
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE OR REPLACE FUNCTION ensure_student_referral_code(p_student_id UUID)
RETURNS TEXT AS $$
DECLARE
  existing_code TEXT;
  new_code TEXT;
BEGIN
  SELECT referral_code INTO existing_code FROM students WHERE id = p_student_id;
  IF existing_code IS NOT NULL AND existing_code <> '' THEN
    RETURN existing_code;
  END IF;

  new_code := 'PPT-' || upper(substr(replace(p_student_id::text, '-', ''), 1, 8));
  UPDATE students SET referral_code = new_code WHERE id = p_student_id;
  RETURN new_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION record_duel_results(p_duel_id UUID)
RETURNS VOID AS $$
DECLARE
  p1 RECORD;
  p2 RECORD;
  p1_result TEXT;
  p2_result TEXT;
BEGIN
  SELECT * INTO p1
  FROM duel_participants
  WHERE duel_id = p_duel_id
  ORDER BY joined_at ASC
  LIMIT 1;

  SELECT * INTO p2
  FROM duel_participants
  WHERE duel_id = p_duel_id AND student_id <> p1.student_id
  ORDER BY joined_at ASC
  LIMIT 1;

  IF p1.student_id IS NULL OR p2.student_id IS NULL THEN
    RETURN;
  END IF;

  IF p1.score > p2.score THEN
    p1_result := 'win';
    p2_result := 'loss';
  ELSIF p2.score > p1.score THEN
    p1_result := 'loss';
    p2_result := 'win';
  ELSE
    p1_result := 'draw';
    p2_result := 'draw';
  END IF;

  INSERT INTO duel_results (duel_id, student_id, opponent_student_id, result, score, opponent_score, xp_awarded)
  VALUES
    (p_duel_id, p1.student_id, p2.student_id, p1_result, p1.score, p2.score, CASE WHEN p1_result = 'win' THEN 150 WHEN p1_result = 'draw' THEN 75 ELSE 50 END),
    (p_duel_id, p2.student_id, p1.student_id, p2_result, p2.score, p1.score, CASE WHEN p2_result = 'win' THEN 150 WHEN p2_result = 'draw' THEN 75 ELSE 50 END)
  ON CONFLICT (duel_id, student_id) DO NOTHING;

  UPDATE students
  SET
    duel_wins = duel_wins + CASE WHEN id = p1.student_id AND p1_result = 'win' OR id = p2.student_id AND p2_result = 'win' THEN 1 ELSE 0 END,
    duel_losses = duel_losses + CASE WHEN id = p1.student_id AND p1_result = 'loss' OR id = p2.student_id AND p2_result = 'loss' THEN 1 ELSE 0 END,
    duel_draws = duel_draws + CASE WHEN id = p1.student_id AND p1_result = 'draw' OR id = p2.student_id AND p2_result = 'draw' THEN 1 ELSE 0 END,
    xp = xp + CASE
      WHEN id = p1.student_id THEN CASE WHEN p1_result = 'win' THEN 150 WHEN p1_result = 'draw' THEN 75 ELSE 50 END
      WHEN id = p2.student_id THEN CASE WHEN p2_result = 'win' THEN 150 WHEN p2_result = 'draw' THEN 75 ELSE 50 END
      ELSE 0
    END
  WHERE id IN (p1.student_id, p2.student_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

NOTIFY pgrst, 'reload schema';
