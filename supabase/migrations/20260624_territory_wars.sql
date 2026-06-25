-- Territory Wars / Guilds System

-- Student houses
CREATE TABLE IF NOT EXISTS student_houses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE UNIQUE,
  house_id TEXT NOT NULL CHECK (house_id IN ('peak', 'valor', 'apex', 'onyx')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_houses_house_id ON student_houses(house_id);

-- Territory control (the map)
CREATE TABLE IF NOT EXISTS territory_control (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  territory_id TEXT NOT NULL UNIQUE,
  owner TEXT NOT NULL CHECK (owner IN ('peak', 'valor', 'apex', 'onyx')),
  points INTEGER DEFAULT 0,
  threshold INTEGER DEFAULT 100,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Duel streaks
CREATE TABLE IF NOT EXISTS duel_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE UNIQUE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_duel_date DATE,
  freezes_available INTEGER DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Weekly house war scores
CREATE TABLE IF NOT EXISTS house_war_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id TEXT NOT NULL CHECK (house_id IN ('peak', 'valor', 'apex', 'onyx')),
  week_start DATE NOT NULL,
  total_wins INTEGER DEFAULT 0,
  total_points INTEGER DEFAULT 0,
  UNIQUE(house_id, week_start)
);

-- Enable RLS
ALTER TABLE student_houses ENABLE ROW LEVEL SECURITY;
ALTER TABLE territory_control ENABLE ROW LEVEL SECURITY;
ALTER TABLE duel_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE house_war_scores ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Students can read all houses" ON student_houses FOR SELECT USING (true);
CREATE POLICY "Students can join a house" ON student_houses FOR INSERT WITH CHECK (auth.uid() IN (SELECT user_id FROM students WHERE id = student_id));
CREATE POLICY "Students can update own house" ON student_houses FOR UPDATE USING (auth.uid() IN (SELECT user_id FROM students WHERE id = student_id));

CREATE POLICY "Anyone can read territory" ON territory_control FOR SELECT USING (true);
CREATE POLICY "System can update territory" ON territory_control FOR ALL USING (true);

CREATE POLICY "Students can read own streak" ON duel_streaks FOR SELECT USING (auth.uid() IN (SELECT user_id FROM students WHERE id = student_id));
CREATE POLICY "System can manage streaks" ON duel_streaks FOR ALL USING (true);

CREATE POLICY "Anyone can read war scores" ON house_war_scores FOR SELECT USING (true);
CREATE POLICY "System can manage war scores" ON house_war_scores FOR ALL USING (true);

-- Seed initial territory distribution
INSERT INTO territory_control (territory_id, owner) VALUES
  ('highlands', 'peak'), ('lowlands', 'peak'), ('coast', 'peak'), ('forest', 'peak'),
  ('desert', 'valor'), ('valley', 'valor'), ('mountains', 'valor'), ('peaks', 'valor'),
  ('city', 'apex'), ('tundra', 'apex'), ('delta', 'apex'), ('plains', 'apex'),
  ('harbor', 'onyx'), ('ridge', 'onyx'), ('islands', 'onyx'), ('capital', 'onyx')
ON CONFLICT (territory_id) DO NOTHING;

-- Award streak freeze to all existing students
INSERT INTO duel_streaks (student_id, current_streak, longest_streak, freezes_available)
  SELECT id, 0, 0, 1 FROM students
ON CONFLICT (student_id) DO NOTHING;
