-- ============================================================
-- Persistent Squads Migration
-- ============================================================

-- ── SQUADS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS squads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  avatar_url TEXT,
  created_by UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(class_id, name)
);

-- Function to auto-join the creator to their own squad
CREATE OR REPLACE FUNCTION fn_squad_auto_join_creator()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO squad_members (squad_id, student_id)
  VALUES (NEW.id, NEW.created_by)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_squad_auto_join ON squads;
CREATE TRIGGER trg_squad_auto_join
  AFTER INSERT ON squads
  FOR EACH ROW EXECUTE FUNCTION fn_squad_auto_join_creator();

-- ── SQUAD MEMBERS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS squad_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  squad_id UUID NOT NULL REFERENCES squads(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(squad_id, student_id)
);

-- Add the unique constraint to squad_members if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'squad_members_student_id_key') THEN
        ALTER TABLE squad_members ADD CONSTRAINT squad_members_student_id_key UNIQUE (student_id);
    END IF;
END $$;

-- ── UPDATE TRIVIA GROUPS ───────────────────────────────────────
-- Link trivia_groups to the persistent squad if the column doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trivia_groups' AND column_name='squad_id') THEN
        ALTER TABLE trivia_groups ADD COLUMN squad_id UUID REFERENCES squads(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ── RLS POLICIES ──────────────────────────────────────────────
ALTER TABLE squads ENABLE ROW LEVEL SECURITY;
ALTER TABLE squad_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone in class views squads" ON squads;
CREATE POLICY "Anyone in class views squads"
  ON squads FOR SELECT
  USING (class_id = get_my_student_class_id() OR auth_role() IN ('teacher', 'admin'));

DROP POLICY IF EXISTS "Students create squads for their class" ON squads;
CREATE POLICY "Students create squads for their class"
  ON squads FOR INSERT
  WITH CHECK (class_id = get_my_student_class_id() AND auth_role() = 'student');

DROP POLICY IF EXISTS "Squad members can view members" ON squad_members;
CREATE POLICY "Squad members can view members"
  ON squad_members FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Students join or invite to squads" ON squad_members;
CREATE POLICY "Students join or invite to squads"
  ON squad_members FOR INSERT
  WITH CHECK (
    -- Joining themselves
    student_id = get_my_student_id()
    OR
    -- Creator inviting teammates
    squad_id IN (
      SELECT id FROM squads WHERE created_by = get_my_student_id()
    )
  );

DROP POLICY IF EXISTS "Students join squads" ON squad_members; -- clean up old policy if named differently

DROP POLICY IF EXISTS "Students leave squads" ON squad_members;
CREATE POLICY "Students leave squads"
  ON squad_members FOR DELETE
  USING (student_id = get_my_student_id());
