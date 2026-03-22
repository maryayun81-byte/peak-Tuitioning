-- ============================================================
-- 1. RLS Policies: Allow parents/students to read published transcripts
-- ============================================================

-- Parents can view transcripts for their linked students if published
DROP POLICY IF EXISTS "Parents view published linked transcripts" ON transcripts;
CREATE POLICY "Parents view published linked transcripts" ON transcripts
FOR SELECT USING (
  is_published = true AND
  student_id IN (
    SELECT student_id FROM parent_student_links
    WHERE parent_id = get_my_parent_id()
  )
);

-- Students can view their own transcripts if published
DROP POLICY IF EXISTS "Students view own published transcripts" ON transcripts;
CREATE POLICY "Students view own published transcripts" ON transcripts
FOR SELECT USING (
  is_published = true AND
  student_id = get_my_student_id()
);

-- ============================================================
-- 2. Automated Notification Trigger for Transcript Publishing
-- ============================================================
CREATE OR REPLACE FUNCTION notify_transcript_published()
RETURNS TRIGGER AS $$
DECLARE
  v_student_user_id UUID;
  v_parent_user_id UUID;
  v_exam_name TEXT;
  v_student_name TEXT;
BEGIN
  -- Check if transcript just changed from draft to published
  IF NEW.is_published = true AND OLD.is_published = false THEN
    
    -- Get exam name safely
    SELECT name INTO v_exam_name FROM exam_events WHERE id = NEW.exam_event_id;
    
    -- Get student user_id and full name
    SELECT user_id, full_name INTO v_student_user_id, v_student_name FROM students WHERE id = NEW.student_id;
    
    -- 1. Insert notification for the student
    IF v_student_user_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, title, body, type, data)
      VALUES (
        v_student_user_id, 
        'New Transcript Available', 
        'Your official transcript for ' || COALESCE(v_exam_name, 'the recent exam') || ' has been published.', 
        'academic_update', 
        jsonb_build_object('transcript_id', NEW.id, 'link', '/student/transcripts/' || NEW.id)
      );
    END IF;

    -- 2. Insert notification for ALL linked parents
    FOR v_parent_user_id IN 
      SELECT p.user_id FROM parents p
      JOIN parent_student_links l ON p.id = l.parent_id
      WHERE l.student_id = NEW.student_id AND p.user_id IS NOT NULL
    LOOP
      INSERT INTO notifications (user_id, title, body, type, data)
      VALUES (
        v_parent_user_id, 
        'Transcript Published: ' || COALESCE(v_student_name, 'Student'), 
        'An official academic transcript for ' || COALESCE(v_student_name, 'your student') || ' (' || COALESCE(v_exam_name, 'recent exam') || ') is now available to review.', 
        'academic_update', 
        jsonb_build_object('transcript_id', NEW.id, 'student_id', NEW.student_id, 'link', '/parent/academics/' || NEW.student_id)
      );
    END LOOP;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Map the trigger
DROP TRIGGER IF EXISTS trg_notify_transcript_published ON transcripts;
CREATE TRIGGER trg_notify_transcript_published
AFTER UPDATE ON transcripts
FOR EACH ROW
EXECUTE FUNCTION notify_transcript_published();
