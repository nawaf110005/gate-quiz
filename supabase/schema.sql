-- ============================================================
-- بوابة القرار — Database Schema
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- GAMES
-- ============================================================
CREATE TABLE IF NOT EXISTS games (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  description   TEXT,
  time_per_question INT NOT NULL DEFAULT 10000,  -- milliseconds
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- QUESTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS questions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id       UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  text          TEXT NOT NULL,
  option_a      TEXT NOT NULL,
  option_b      TEXT NOT NULL,
  correct_choice TEXT NOT NULL CHECK (correct_choice IN ('A','B')),
  order_index   INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SESSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS sessions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id               UUID NOT NULL REFERENCES games(id),
  code                  TEXT UNIQUE NOT NULL,
  status                TEXT NOT NULL DEFAULT 'waiting'
                          CHECK (status IN ('waiting','question','revealing','leaderboard','finished')),
  current_question_index INT NOT NULL DEFAULT 0,
  current_question_id   UUID REFERENCES questions(id),
  question_started_at   TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PLAYERS
-- ============================================================
CREATE TABLE IF NOT EXISTS players (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  score         INT NOT NULL DEFAULT 0,
  streak        INT NOT NULL DEFAULT 0,
  correct_count INT NOT NULL DEFAULT 0,
  wrong_count   INT NOT NULL DEFAULT 0,
  avg_speed_ms  INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ANSWERS
-- ============================================================
CREATE TABLE IF NOT EXISTS answers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  question_id     UUID NOT NULL REFERENCES questions(id),
  player_id       UUID NOT NULL REFERENCES players(id),
  choice          TEXT NOT NULL CHECK (choice IN ('A','B')),
  answered_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  response_time_ms INT,
  is_correct      BOOLEAN,
  score_earned    INT NOT NULL DEFAULT 0,
  UNIQUE (question_id, player_id)
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_questions_game_id    ON questions(game_id);
CREATE INDEX IF NOT EXISTS idx_sessions_code        ON sessions(code);
CREATE INDEX IF NOT EXISTS idx_players_session_id   ON players(session_id);
CREATE INDEX IF NOT EXISTS idx_answers_session_id   ON answers(session_id);
CREATE INDEX IF NOT EXISTS idx_answers_question_id  ON answers(question_id);
CREATE INDEX IF NOT EXISTS idx_answers_player_id    ON answers(player_id);

-- ============================================================
-- REALTIME — enable for live updates
-- ============================================================
ALTER TABLE sessions  REPLICA IDENTITY FULL;
ALTER TABLE players   REPLICA IDENTITY FULL;
ALTER TABLE answers   REPLICA IDENTITY FULL;

-- ============================================================
-- ROW LEVEL SECURITY (public read, restricted write)
-- ============================================================
ALTER TABLE games     ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE players   ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers   ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read
CREATE POLICY "public read games"     ON games     FOR SELECT USING (true);
CREATE POLICY "public read questions" ON questions FOR SELECT USING (true);
CREATE POLICY "public read sessions"  ON sessions  FOR SELECT USING (true);
CREATE POLICY "public read players"   ON players   FOR SELECT USING (true);
CREATE POLICY "public read answers"   ON answers   FOR SELECT USING (true);

-- Allow anon to insert players and answers (players join & answer)
CREATE POLICY "players can insert"  ON players FOR INSERT WITH CHECK (true);
CREATE POLICY "answers can insert"  ON answers FOR INSERT WITH CHECK (true);

-- Allow anon to update own player score (handled server-side via service role ideally)
CREATE POLICY "players can update"  ON players FOR UPDATE USING (true);

-- Allow anon to insert sessions (admin creates)
CREATE POLICY "sessions can insert" ON sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "sessions can update" ON sessions FOR UPDATE USING (true);
CREATE POLICY "games can insert"    ON games    FOR INSERT WITH CHECK (true);
CREATE POLICY "games can update"    ON games    FOR UPDATE USING (true);
CREATE POLICY "questions can insert" ON questions FOR INSERT WITH CHECK (true);
CREATE POLICY "questions can update" ON questions FOR UPDATE USING (true);
CREATE POLICY "questions can delete" ON questions FOR DELETE USING (true);
