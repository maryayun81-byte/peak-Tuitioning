-- ============================================================
-- TRIVIA JOIN REQUESTS
-- 
-- System to allow students to request joining a squad,
-- with explicit leader approval required.
-- ============================================================

CREATE TABLE IF NOT EXISTS trivia_join_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES trivia_sessions(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES trivia_groups(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Prevent multiple pending requests to the same group
  UNIQUE(group_id, student_id, status)
);

-- ── INDEXES ───────────────────────────────────────────────────
CREATE INDEX idx_trivia_join_requests_group ON trivia_join_requests(group_id);
CREATE INDEX idx_trivia_join_requests_student ON trivia_join_requests(student_id);
CREATE INDEX idx_trivia_join_requests_session ON trivia_join_requests(session_id);

-- ── RLS POLICIES ──────────────────────────────────────────────
ALTER TABLE trivia_join_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students see requests they sent" ON trivia_join_requests;
CREATE POLICY "Students see requests they sent"
  ON trivia_join_requests FOR SELECT
  USING (student_id = get_my_student_id());

DROP POLICY IF EXISTS "Leaders see requests to their group" ON trivia_join_requests;
CREATE POLICY "Leaders see requests to their group"
  ON trivia_join_requests FOR SELECT
  USING (
    group_id IN (
      SELECT id FROM trivia_groups WHERE created_by = get_my_student_id()
    )
  );

DROP POLICY IF EXISTS "Students can request to join" ON trivia_join_requests;
CREATE POLICY "Students can request to join"
  ON trivia_join_requests FOR INSERT
  WITH CHECK (student_id = get_my_student_id());

DROP POLICY IF EXISTS "Leaders can approve or reject" ON trivia_join_requests;
CREATE POLICY "Leaders can approve or reject"
  ON trivia_join_requests FOR UPDATE
  USING (
    group_id IN (
      SELECT id FROM trivia_groups WHERE created_by = get_my_student_id()
    )
  );

-- Notify PostgREST
NOTIFY pgrst, 'reload schema';
