-- ============================================================
-- Peak Performance Tutoring — Terms & Conditions System
-- ============================================================

-- ── DOCUMENTS ─────────────────────────────────────────────────
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,          -- Storing HTML from TipTap
  version TEXT NOT NULL DEFAULT 'v1.0',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── DOCUMENT ASSIGNMENTS ──────────────────────────────────────
CREATE TABLE document_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'signed')),
  signature_type TEXT CHECK (signature_type IN ('typed', 'drawn')),
  signature_data TEXT,            -- Typed name or base64 image URL
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  signed_at TIMESTAMPTZ,
  UNIQUE(document_id, teacher_id) -- Teachers can only be assigned to a specific document version once
);

-- ── INDEXES ───────────────────────────────────────────────────
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_document_assignments_teacher ON document_assignments(teacher_id);
CREATE INDEX idx_document_assignments_status ON document_assignments(status);

-- ── UPDATED_AT TRIGGER ────────────────────────────────────────
CREATE TRIGGER trg_documents_updated
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── ROW LEVEL SECURITY ────────────────────────────────────────
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_assignments ENABLE ROW LEVEL SECURITY;

-- DOCUMENTS
-- Admins can do everything
CREATE POLICY "Admins manage documents"
  ON documents FOR ALL
  USING (auth_role() = 'admin');

-- Teachers can view published documents they've been assigned
CREATE POLICY "Teachers view assigned published documents"
  ON documents FOR SELECT
  USING (
    status = 'published' AND
    id IN (
      SELECT document_id FROM document_assignments WHERE teacher_id = get_my_teacher_id()
    )
  );

-- DOCUMENT ASSIGNMENTS
-- Admins can do everything
CREATE POLICY "Admins manage document assignments"
  ON document_assignments FOR ALL
  USING (auth_role() = 'admin');

-- Teachers view their own assignments
CREATE POLICY "Teachers view own assignments"
  ON document_assignments FOR SELECT
  USING (teacher_id = get_my_teacher_id());

-- Teachers can UPDATE their assignments to sign them
CREATE POLICY "Teachers can sign their assignments"
  ON document_assignments FOR UPDATE
  USING (teacher_id = get_my_teacher_id() AND status = 'pending')
  WITH CHECK (
    teacher_id = get_my_teacher_id() AND 
    status = 'signed' AND
    signature_data IS NOT NULL
  );
