-- ============================================================
-- CLASS DUELS — COMPREHENSIVE SYSTEM
-- Adds all tables, columns, functions, and policies for the
-- full duel spec: 10 duel types, ELO, power-ups, reactions,
-- spectator mode, leaderboards, achievements, hall of fame
-- ============================================================

-- ── ENRICH classroom_duels ─────────────────────────────
ALTER TABLE classroom_duels
  ADD COLUMN IF NOT EXISTS duel_type      TEXT NOT NULL DEFAULT 'quick'
    CHECK (duel_type IN ('quick','friend','coach','team','classwar','teacher','boss','tournament','daily','weekly')),
  ADD COLUMN IF NOT EXISTS difficulty     TEXT DEFAULT 'medium'
    CHECK (difficulty IN ('easy','medium','hard','challenge','legendary')),
  ADD COLUMN IF NOT EXISTS subject_id     UUID REFERENCES subjects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS topic          TEXT,
  ADD COLUMN IF NOT EXISTS time_per_question INTEGER DEFAULT 15,
  ADD COLUMN IF NOT EXISTS max_participants   INTEGER DEFAULT 2,
  ADD COLUMN IF NOT EXISTS started_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS winner_id      UUID REFERENCES students(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS allowed_power_ups JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS tournament_bracket JSONB,
  ADD COLUMN IF NOT EXISTS boss_id        UUID,
  ADD COLUMN IF NOT EXISTS coach_difficulty TEXT
    CHECK (coach_difficulty IN ('apprentice','scholar','master','kcse_beast','legend')),
  ADD COLUMN IF NOT EXISTS class_team_a_id UUID,
  ADD COLUMN IF NOT EXISTS class_team_b_id UUID,
  ADD COLUMN IF NOT EXISTS created_by     UUID REFERENCES students(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_daily       BOOLEAN DEFAULT FALSE;

-- ── ENRICH duel_participants ──────────────────────────
ALTER TABLE duel_participants
  ADD COLUMN IF NOT EXISTS power_ups_used     JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS answer_history     JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS elo_before         INTEGER,
  ADD COLUMN IF NOT EXISTS elo_after          INTEGER,
  ADD COLUMN IF NOT EXISTS disconnect_count   INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_time_spent   INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_streak         INTEGER DEFAULT 0;

-- ── ENRICH students ───────────────────────────────────
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS duel_rating        INTEGER DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS duel_win_streak    INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_coins        INTEGER DEFAULT 0;

-- ── DUEL REACTIONS (live emojis) ──────────────────────
CREATE TABLE IF NOT EXISTS duel_reactions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  duel_id    UUID NOT NULL REFERENCES classroom_duels(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  emoji      TEXT NOT NULL,  -- 🔥👏😲💪😂❤️ GG
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_duel_reactions_duel ON duel_reactions(duel_id, created_at);

-- ── DUEL MESSAGES / BATTLE CHAT ───────────────────────
CREATE TABLE IF NOT EXISTS duel_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  duel_id    UUID NOT NULL REFERENCES classroom_duels(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  message    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_duel_messages_duel ON duel_messages(duel_id, created_at);

-- ── MATCHMAKING QUEUE ─────────────────────────────────
CREATE TABLE IF NOT EXISTS duel_matchmaking_queue (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  duel_type       TEXT NOT NULL DEFAULT 'quick',
  subject_id      UUID REFERENCES subjects(id) ON DELETE SET NULL,
  difficulty      TEXT DEFAULT 'medium',
  rating          INTEGER DEFAULT 1000,
  status          TEXT NOT NULL DEFAULT 'searching'
                    CHECK (status IN ('searching','found','cancelled')),
  created_at      TIMESTAMPTZ DEFAULT now(),
  matched_at      TIMESTAMPTZ,
  UNIQUE(student_id)
);

-- ── DUEL RATINGS HISTORY ──────────────────────────────
CREATE TABLE IF NOT EXISTS duel_rating_history (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  duel_id    UUID NOT NULL REFERENCES classroom_duels(id) ON DELETE CASCADE,
  rating_before INTEGER NOT NULL,
  rating_after  INTEGER NOT NULL,
  change        INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_duel_rating_student ON duel_rating_history(student_id, created_at DESC);

-- ── POWER-UP INVENTORY ────────────────────────────────
CREATE TABLE IF NOT EXISTS duel_power_up_inventory (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  power_up   TEXT NOT NULL
    CHECK (power_up IN ('fifty_fifty','time_freeze','double_xp','shield','hint','revive','skip')),
  quantity   INTEGER NOT NULL DEFAULT 1,
  acquired_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_power_up_student ON duel_power_up_inventory(student_id);

-- ── DUEL BOSSES ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS duel_bosses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  title         TEXT NOT NULL,
  subject_id    UUID REFERENCES subjects(id) ON DELETE SET NULL,
  topic         TEXT,
  difficulty    TEXT NOT NULL DEFAULT 'medium'
                  CHECK (difficulty IN ('easy','medium','hard','legendary')),
  icon_url      TEXT,
  health        INTEGER NOT NULL DEFAULT 100,
  stages        JSONB DEFAULT '[]'::jsonb,
  questions     JSONB NOT NULL DEFAULT '[]'::jsonb,
  reward_xp     INTEGER DEFAULT 200,
  reward_coins  INTEGER DEFAULT 50,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ── DUEL ACHIEVEMENTS ─────────────────────────────────
CREATE TABLE IF NOT EXISTS duel_achievements (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT UNIQUE NOT NULL,
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  icon_url    TEXT,
  category    TEXT NOT NULL DEFAULT 'general'
                CHECK (category IN ('wins','streaks','speed','accuracy','special','social','rank')),
  condition   JSONB NOT NULL DEFAULT '{}'::jsonb,
  reward_xp   INTEGER DEFAULT 0,
  reward_coins INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS student_duel_achievements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  achievement_id  UUID NOT NULL REFERENCES duel_achievements(id) ON DELETE CASCADE,
  earned_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, achievement_id)
);

-- ── HALL OF FAME ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS duel_hall_of_fame (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season        TEXT NOT NULL,
  student_id    UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  rank          INTEGER NOT NULL,
  total_wins    INTEGER DEFAULT 0,
  total_points  INTEGER DEFAULT 0,
  win_rate      REAL DEFAULT 0,
  badge         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(season, student_id)
);
CREATE INDEX IF NOT EXISTS idx_hall_of_fame_season ON duel_hall_of_fame(season, rank);

-- ── DAILY DUEL TRACKING ────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_duels (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  duel_id         UUID UNIQUE NOT NULL REFERENCES classroom_duels(id) ON DELETE CASCADE,
  date            DATE NOT NULL DEFAULT CURRENT_DATE,
  perfect_score   BOOLEAN DEFAULT FALSE,
  UNIQUE(date, duel_id)
);

-- ── WEEKLY CHAMPIONSHIPS ───────────────────────────────
CREATE TABLE IF NOT EXISTS weekly_championships (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start      DATE NOT NULL,
  week_end        DATE NOT NULL,
  subject_id      UUID REFERENCES subjects(id) ON DELETE SET NULL,
  status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','completed','cancelled')),
  champion_id     UUID REFERENCES students(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE duel_reactions             ENABLE ROW LEVEL SECURITY;
ALTER TABLE duel_messages              ENABLE ROW LEVEL SECURITY;
ALTER TABLE duel_matchmaking_queue     ENABLE ROW LEVEL SECURITY;
ALTER TABLE duel_rating_history        ENABLE ROW LEVEL SECURITY;
ALTER TABLE duel_power_up_inventory    ENABLE ROW LEVEL SECURITY;
ALTER TABLE duel_bosses                ENABLE ROW LEVEL SECURITY;
ALTER TABLE duel_achievements          ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_duel_achievements  ENABLE ROW LEVEL SECURITY;
ALTER TABLE duel_hall_of_fame          ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_duels                ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_championships       ENABLE ROW LEVEL SECURITY;

-- Public read, authenticated write policies
CREATE POLICY "Anyone read reactions"   ON duel_reactions            FOR SELECT USING (true);
CREATE POLICY "Auth insert reactions"   ON duel_reactions            FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Anyone read messages"    ON duel_messages             FOR SELECT USING (true);
CREATE POLICY "Auth insert messages"    ON duel_messages             FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Anyone read queue"       ON duel_matchmaking_queue    FOR SELECT USING (true);
CREATE POLICY "Own queue"               ON duel_matchmaking_queue    FOR ALL USING (student_id IN (SELECT id FROM students WHERE user_id = auth.uid()));
CREATE POLICY "Anyone read ratings"     ON duel_rating_history       FOR SELECT USING (true);
CREATE POLICY "Own ratings"             ON duel_rating_history       FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Anyone read powerups"    ON duel_power_up_inventory   FOR SELECT USING (true);
CREATE POLICY "Own powerups"            ON duel_power_up_inventory   FOR ALL USING (student_id IN (SELECT id FROM students WHERE user_id = auth.uid()));
CREATE POLICY "Anyone read bosses"      ON duel_bosses               FOR SELECT USING (true);
CREATE POLICY "Admin manage bosses"     ON duel_bosses               FOR ALL USING (auth_role() = 'admin');
CREATE POLICY "Anyone read achievements" ON duel_achievements         FOR SELECT USING (true);
CREATE POLICY "Own achievements"        ON student_duel_achievements FOR ALL USING (student_id IN (SELECT id FROM students WHERE user_id = auth.uid()));
CREATE POLICY "Anyone read halloffame"  ON duel_hall_of_fame         FOR SELECT USING (true);
CREATE POLICY "Anyone read dailyduels"  ON daily_duels               FOR SELECT USING (true);
CREATE POLICY "Anyone read weeklychamp" ON weekly_championships      FOR SELECT USING (true);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- ELO CALCULATION
CREATE OR REPLACE FUNCTION calculate_elo_change(
  p_rating_a INTEGER, p_rating_b INTEGER, p_score_a REAL
) RETURNS INTEGER AS $$
DECLARE
  expected_a REAL;
  K INTEGER := 32;
BEGIN
  expected_a := 1.0 / (1.0 + pow(10.0, (p_rating_b - p_rating_a) / 400.0));
  RETURN round(K * (p_score_a - expected_a))::INTEGER;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- RECORD DUEL RESULTS (enhanced with ELO)
CREATE OR REPLACE FUNCTION record_duel_results_full(p_duel_id UUID)
RETURNS VOID AS $$
DECLARE
  p1 RECORD; p2 RECORD;
  p1_result TEXT; p2_result TEXT;
  p1_elo_change INTEGER; p2_elo_change INTEGER;
  p1_rating_before INTEGER; p2_rating_before INTEGER;
  xp_win INTEGER := 150; xp_draw INTEGER := 75; xp_loss INTEGER := 50;
BEGIN
  SELECT dp.*, s.duel_rating INTO p1
  FROM duel_participants dp JOIN students s ON s.id = dp.student_id
  WHERE dp.duel_id = p_duel_id ORDER BY dp.joined_at ASC LIMIT 1;

  SELECT dp.*, s.duel_rating INTO p2
  FROM duel_participants dp JOIN students s ON s.id = dp.student_id
  WHERE dp.duel_id = p_duel_id AND dp.student_id <> p1.student_id
  ORDER BY dp.joined_at ASC LIMIT 1;

  IF p1.student_id IS NULL OR p2.student_id IS NULL THEN RETURN; END IF;

  -- Determine result
  IF p1.score > p2.score THEN
    p1_result := 'win'; p2_result := 'loss';
  ELSIF p2.score > p1.score THEN
    p1_result := 'loss'; p2_result := 'win';
  ELSE
    p1_result := 'draw'; p2_result := 'draw';
  END IF;

  -- ELO
  p1_rating_before := COALESCE(p1.duel_rating, 1000);
  p2_rating_before := COALESCE(p2.duel_rating, 1000);
  
  p1_elo_change := calculate_elo_change(
    p1_rating_before, p2_rating_before,
    CASE WHEN p1_result = 'win' THEN 1.0 WHEN p1_result = 'draw' THEN 0.5 ELSE 0.0 END
  );
  p2_elo_change := calculate_elo_change(
    p2_rating_before, p1_rating_before,
    CASE WHEN p2_result = 'win' THEN 1.0 WHEN p2_result = 'draw' THEN 0.5 ELSE 0.0 END
  );

  -- Insert results
  INSERT INTO duel_results (duel_id, student_id, opponent_student_id, result, score, opponent_score, xp_awarded)
  VALUES
    (p_duel_id, p1.student_id, p2.student_id, p1_result, p1.score, p2.score,
     CASE WHEN p1_result = 'win' THEN xp_win WHEN p1_result = 'draw' THEN xp_draw ELSE xp_loss END),
    (p_duel_id, p2.student_id, p1.student_id, p2_result, p2.score, p1.score,
     CASE WHEN p2_result = 'win' THEN xp_win WHEN p2_result = 'draw' THEN xp_draw ELSE xp_loss END)
  ON CONFLICT (duel_id, student_id) DO NOTHING;

  -- Update students
  UPDATE students SET
    duel_wins     = duel_wins     + CASE WHEN id = p1.student_id AND p1_result = 'win'  OR id = p2.student_id AND p2_result = 'win'  THEN 1 ELSE 0 END,
    duel_losses   = duel_losses   + CASE WHEN id = p1.student_id AND p1_result = 'loss' OR id = p2.student_id AND p2_result = 'loss' THEN 1 ELSE 0 END,
    duel_draws    = duel_draws    + CASE WHEN id = p1.student_id AND p1_result = 'draw' OR id = p2.student_id AND p2_result = 'draw' THEN 1 ELSE 0 END,
    duel_rating   = CASE
                      WHEN id = p1.student_id THEN p1_rating_before + p1_elo_change
                      WHEN id = p2.student_id THEN p2_rating_before + p2_elo_change
                      ELSE duel_rating END,
    duel_win_streak = CASE
                      WHEN id = p1.student_id AND p1_result = 'win'  THEN duel_win_streak + 1
                      WHEN id = p1.student_id AND p1_result != 'win' THEN 0
                      WHEN id = p2.student_id AND p2_result = 'win'  THEN duel_win_streak + 1
                      WHEN id = p2.student_id AND p2_result != 'win' THEN 0
                      ELSE duel_win_streak END,
    xp = xp + CASE
      WHEN id = p1.student_id THEN CASE WHEN p1_result = 'win' THEN xp_win WHEN p1_result = 'draw' THEN xp_draw ELSE xp_loss END
      WHEN id = p2.student_id THEN CASE WHEN p2_result = 'win' THEN xp_win WHEN p2_result = 'draw' THEN xp_draw ELSE xp_loss END
      ELSE 0 END
  WHERE id IN (p1.student_id, p2.student_id);

  -- Record ELO history
  INSERT INTO duel_rating_history (student_id, duel_id, rating_before, rating_after, change)
  VALUES
    (p1.student_id, p_duel_id, p1_rating_before, p1_rating_before + p1_elo_change, p1_elo_change),
    (p2.student_id, p_duel_id, p2_rating_before, p2_rating_before + p2_elo_change, p2_elo_change);

  -- Update duel as completed
  UPDATE classroom_duels SET
    completed_at = now(),
    winner_id = CASE WHEN p1_result = 'win' THEN p1.student_id WHEN p2_result = 'win' THEN p2.student_id ELSE NULL END
  WHERE id = p_duel_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- GET DUEL LEADERBOARD
CREATE OR REPLACE FUNCTION get_duel_leaderboard(
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
  student_id UUID, full_name TEXT, admission_number TEXT,
  avatar_url TEXT, class_name TEXT, duel_rating INTEGER,
  duel_wins INTEGER, duel_losses INTEGER, duel_draws INTEGER,
  total_duels INTEGER, win_rate REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id, s.full_name, s.admission_number, s.avatar_url,
    c.name AS class_name,
    s.duel_rating, s.duel_wins, s.duel_losses, s.duel_draws,
    (s.duel_wins + s.duel_losses + s.duel_draws)::INTEGER AS total_duels,
    CASE WHEN (s.duel_wins + s.duel_losses + s.duel_draws) > 0
      THEN round(s.duel_wins::REAL / (s.duel_wins + s.duel_losses + s.duel_draws) * 100, 1)
      ELSE 0.0 END AS win_rate
  FROM students s
  LEFT JOIN classes c ON c.id = s.class_id
  ORDER BY s.duel_rating DESC, s.duel_wins DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

-- GET STUDENT DUEL STATS
CREATE OR REPLACE FUNCTION get_student_duel_stats(p_student_id UUID)
RETURNS TABLE (
  total_duels INTEGER, wins INTEGER, losses INTEGER, draws INTEGER,
  win_streak INTEGER, rating INTEGER, win_rate REAL,
  avg_score REAL, best_score INTEGER, total_xp INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (s.duel_wins + s.duel_losses + s.duel_draws)::INTEGER,
    s.duel_wins, s.duel_losses, s.duel_draws,
    s.duel_win_streak, s.duel_rating,
    CASE WHEN (s.duel_wins + s.duel_losses + s.duel_draws) > 0
      THEN round(s.duel_wins::REAL / (s.duel_wins + s.duel_losses + s.duel_draws) * 100, 1)
      ELSE 0.0 END,
    COALESCE((SELECT round(avg(score)::REAL, 1) FROM duel_results WHERE student_id = p_student_id), 0),
    COALESCE((SELECT max(score) FROM duel_results WHERE student_id = p_student_id), 0),
    COALESCE((SELECT sum(xp_awarded)::INTEGER FROM duel_results WHERE student_id = p_student_id), 0)
  FROM students s WHERE s.id = p_student_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- SEED DUEL ACHIEVEMENTS
INSERT INTO duel_achievements (code, title, description, category, condition, reward_xp, reward_coins) VALUES
  ('first_duel',      'First Duel',       'Play your first duel',            'wins',    '{"type":"duels_played","count":1}',    50,  10),
  ('ten_wins',        '10 Wins',          'Win 10 duels',                     'wins',    '{"type":"wins","count":10}',          100, 25),
  ('fifty_wins',      '50 Wins',          'Win 50 duels',                     'wins',    '{"type":"wins","count":50}',          250, 50),
  ('hundred_wins',    '100 Wins',         'Win 100 duels',                    'wins',    '{"type":"wins","count":100}',         500, 100),
  ('thousand_questions','1000 Questions', 'Answer 1000 duel questions',       'accuracy','{"type":"questions","count":1000}',    300, 75),
  ('seven_day_streak','7-Day Streak',     'Maintain a 7-day daily duel streak','streaks','{"type":"daily_streak","count":7}',    200, 50),
  ('thirty_day_streak','30-Day Streak',   'Maintain a 30-day daily duel streak','streaks','{"type":"daily_streak","count":30}',  500, 150),
  ('top_rank',        'Top Rank',         'Reach Diamond rank or higher',     'rank',    '{"type":"rank","rank":"diamond"}',    400, 100),
  ('champion',        'Champion',         'Win a weekly championship',        'social',  '{"type":"weekly_champion","count":1}', 350, 80),
  ('perfect_accuracy','Perfect Accuracy',  'Score 100% in a duel (5+ questions)','accuracy','{"type":"perfect_game","count":1}', 150, 30),
  ('speed_demon',     'Speed Demon',      'Answer 5 questions in under 30 seconds total','speed','{"type":"speed","seconds":30}', 200, 50),
  ('math_genius',     'Math Genius',      'Win 10 math duels',                'special', '{"type":"subject_wins","subject":"math","count":10}', 200, 50),
  ('chemistry_master','Chemistry Master', 'Win 10 chemistry duels',           'special', '{"type":"subject_wins","subject":"chemistry","count":10}', 200, 50),
  ('biology_expert',  'Biology Expert',   'Win 10 biology duels',             'special', '{"type":"subject_wins","subject":"biology","count":10}', 200, 50),
  ('physics_wizard',  'Physics Wizard',   'Win 10 physics duels',             'special', '{"type":"subject_wins","subject":"physics","count":10}', 200, 50),
  ('unbeaten',        'Unbeaten',         'Win 10 duels in a row',            'streaks', '{"type":"win_streak","count":10}',     300, 80),
  ('streak_master',   'Streak Master',    'Achieve a 20-win streak',          'streaks', '{"type":"win_streak","count":20}',     500, 150),
  ('coach_slayer',    'Peak Coach Slayer','Defeat Peak Coach on Legend difficulty','special','{"type":"coach_defeat","difficulty":"legend"}', 500, 200),
  ('boss_slayer',     'Boss Slayer',      'Defeat a Legendary Boss',           'special', '{"type":"boss_defeat","difficulty":"legendary"}', 400, 150),
  ('tournament_winner','Tournament Champion','Win a tournament',               'social',  '{"type":"tournament_win","count":1}',  500, 200),
  ('class_champion',  'Class Champion',   'Win a Class War',                   'social',  '{"type":"class_war_win","count":1}',  300, 100),
  ('grandmaster',     'Grandmaster',      'Reach Grandmaster rank',            'rank',    '{"type":"rank","rank":"grandmaster"}', 1000, 300)
ON CONFLICT (code) DO NOTHING;

-- SEED DUEL BOSSES
INSERT INTO duel_bosses (name, title, subject_id, topic, difficulty, health, stages, reward_xp, reward_coins) VALUES
  ('Algebra King',    'Ruler of Equations',    (SELECT id FROM subjects WHERE name ILIKE 'mathematics' LIMIT 1), 'Algebra',       'medium',   100, '[]'::jsonb, 200, 50),
  ('Geometry Giant',  'Master of Shapes',      (SELECT id FROM subjects WHERE name ILIKE 'mathematics' LIMIT 1), 'Geometry',      'hard',     150, '[]'::jsonb, 300, 75),
  ('Calculus Guardian','Limitless Power',      (SELECT id FROM subjects WHERE name ILIKE 'mathematics' LIMIT 1), 'Calculus',      'legendary', 200, '[]'::jsonb, 500, 150),
  ('Electrolysis Monster','Current Conqueror', (SELECT id FROM subjects WHERE name ILIKE 'chemistry' LIMIT 1),   'Electrolysis',  'medium',   100, '[]'::jsonb, 200, 50),
  ('Organic Chemistry Beast','Carbon Lord',    (SELECT id FROM subjects WHERE name ILIKE 'chemistry' LIMIT 1),   'Organic Chem',  'hard',     150, '[]'::jsonb, 300, 75),
  ('Trigonometry Titan','Angle Warrior',       (SELECT id FROM subjects WHERE name ILIKE 'mathematics' LIMIT 1), 'Trigonometry',  'hard',     150, '[]'::jsonb, 300, 75),
  ('Probability Wizard','Chance Master',       (SELECT id FROM subjects WHERE name ILIKE 'mathematics' LIMIT 1), 'Probability',   'medium',   100, '[]'::jsonb, 200, 50),
  ('Biology Beast',   'Cell Commander',        (SELECT id FROM subjects WHERE name ILIKE 'biology' LIMIT 1),     'Cell Biology',  'medium',   100, '[]'::jsonb, 200, 50)
ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload schema';
