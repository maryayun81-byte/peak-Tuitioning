-- Add avatar_url to trivia_groups for team identity
ALTER TABLE trivia_groups ADD COLUMN avatar_url TEXT;

-- Update RLS if needed (already broad enough for viewing but good to be explicit)
-- No changes needed to existing policies as they use ALL for owners and SELECT for others.
