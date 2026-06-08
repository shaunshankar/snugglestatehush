CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  target_bedtime TIME DEFAULT '22:30:00',
  target_duration_hours DECIMAL(4,2) DEFAULT 8.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sleep_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  bedtime TIMESTAMPTZ,
  wake_time TIMESTAMPTZ,
  duration_minutes INTEGER,
  sleep_score INTEGER CHECK (sleep_score >= 1 AND sleep_score <= 100),
  rem_minutes INTEGER DEFAULT 0,
  deep_minutes INTEGER DEFAULT 0,
  core_minutes INTEGER DEFAULT 0,
  awake_minutes INTEGER DEFAULT 0,
  rest_quality_rating INTEGER CHECK (rest_quality_rating >= 1 AND rest_quality_rating <= 10),
  source TEXT DEFAULT 'manual' CHECK (source IN ('apple_health', 'manual')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE TABLE IF NOT EXISTS morning_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  rest_feeling INTEGER CHECK (rest_feeling >= 1 AND rest_feeling <= 10),
  mood TEXT CHECK (mood IN ('great', 'good', 'okay', 'tired', 'exhausted')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE TABLE IF NOT EXISTS factor_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  caffeine_cups INTEGER DEFAULT 0,
  alcohol_units INTEGER DEFAULT 0,
  stress_level INTEGER CHECK (stress_level >= 1 AND stress_level <= 10),
  screen_time_minutes INTEGER DEFAULT 0,
  exercise_minutes INTEGER DEFAULT 0,
  exercise_type TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE TABLE IF NOT EXISTS ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  insight_text JSONB NOT NULL,
  insight_type TEXT DEFAULT 'weekly' CHECK (insight_type IN ('daily', 'weekly')),
  week_start_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
