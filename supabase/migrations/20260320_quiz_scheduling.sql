-- Add publish_at column for scheduled publishing
ALTER TABLE quizzes 
ADD COLUMN publish_at TIMESTAMPTZ;

-- Note: is_published still defaults to TRUE. 
-- However, our read logic on the frontend will now also respect publish_at.
-- If publish_at is set, it will only be visible to students if publish_at <= NOW().
