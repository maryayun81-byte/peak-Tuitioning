-- Fix for admin 403 Forbidden on event registrations
CREATE POLICY "Admin full access to event registrations" ON event_registrations
    FOR ALL USING (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
      )
    );

CREATE POLICY "Teacher full access to event registrations" ON event_registrations
    FOR ALL USING (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'teacher'
      )
    );
