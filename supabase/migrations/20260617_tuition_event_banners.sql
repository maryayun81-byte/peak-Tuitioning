ALTER TABLE tuition_events
  ADD COLUMN IF NOT EXISTS banner_url TEXT;

COMMENT ON COLUMN tuition_events.banner_url IS 'Public poster or banner image URL used on landing and admin event cards.';
