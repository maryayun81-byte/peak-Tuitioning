-- Add max_streak to trivia_submissions for leaderboard/analytics
ALTER TABLE trivia_submissions ADD COLUMN max_streak INTEGER DEFAULT 0;
