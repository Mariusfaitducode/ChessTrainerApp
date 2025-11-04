-- Schema SQL simplifié - Sans OAuth, utilisation d'usernames uniquement

-- Table pour stocker les usernames des plateformes associés à un utilisateur
CREATE TABLE IF NOT EXISTS user_platforms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('lichess', 'chesscom')),
  platform_username TEXT NOT NULL,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, platform)
);

-- Table pour stocker les parties
CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('lichess', 'chesscom')),
  platform_game_id TEXT NOT NULL,
  pgn TEXT NOT NULL,
  white_player TEXT,
  black_player TEXT,
  result TEXT, -- '1-0', '0-1', '1/2-1/2'
  time_control TEXT,
  played_at TIMESTAMPTZ,
  imported_at TIMESTAMPTZ DEFAULT NOW(),
  analyzed_at TIMESTAMPTZ,
  UNIQUE(platform, platform_game_id, user_id)
);

-- Table pour stocker les analyses détaillées de chaque coup
CREATE TABLE IF NOT EXISTS game_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  move_number INTEGER NOT NULL,
  fen TEXT NOT NULL,
  evaluation FLOAT, -- Évaluation de la position (centipawns)
  best_move TEXT,
  played_move TEXT NOT NULL,
  mistake_level TEXT CHECK (mistake_level IN ('blunder', 'mistake', 'inaccuracy', NULL)),
  analysis_data JSONB, -- Données supplémentaires (variations, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(game_id, move_number)
);

-- Table pour stocker les exercices générés
CREATE TABLE IF NOT EXISTS exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_id UUID REFERENCES games(id) ON DELETE SET NULL,
  game_analysis_id UUID REFERENCES game_analyses(id) ON DELETE SET NULL,
  fen TEXT NOT NULL,
  position_description TEXT,
  exercise_type TEXT NOT NULL CHECK (exercise_type IN ('find_best_move', 'find_mistake', 'tactical_puzzle')),
  correct_move TEXT NOT NULL,
  hints JSONB, -- Array de hints
  difficulty INTEGER CHECK (difficulty >= 1 AND difficulty <= 5),
  completed BOOLEAN DEFAULT FALSE,
  score INTEGER DEFAULT 0,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_games_user_id ON games(user_id);
CREATE INDEX IF NOT EXISTS idx_games_platform_game_id ON games(platform, platform_game_id);
CREATE INDEX IF NOT EXISTS idx_games_played_at ON games(played_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_analyses_game_id ON game_analyses(game_id);
CREATE INDEX IF NOT EXISTS idx_game_analyses_mistake_level ON game_analyses(mistake_level) WHERE mistake_level IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_exercises_user_id ON exercises(user_id);
CREATE INDEX IF NOT EXISTS idx_exercises_completed ON exercises(user_id, completed);
CREATE INDEX IF NOT EXISTS idx_user_platforms_user_id ON user_platforms(user_id);

-- Row Level Security (RLS)
ALTER TABLE user_platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

-- Policies: les utilisateurs ne peuvent voir/modifier que leurs propres données
CREATE POLICY "Users can view own platforms" ON user_platforms
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own platforms" ON user_platforms
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own platforms" ON user_platforms
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own platforms" ON user_platforms
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own games" ON games
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own games" ON games
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own games" ON games
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own games" ON games
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own game analyses" ON game_analyses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM games WHERE games.id = game_analyses.game_id AND games.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own game analyses" ON game_analyses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM games WHERE games.id = game_analyses.game_id AND games.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own game analyses" ON game_analyses
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM games WHERE games.id = game_analyses.game_id AND games.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view own exercises" ON exercises
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own exercises" ON exercises
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own exercises" ON exercises
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own exercises" ON exercises
  FOR DELETE USING (auth.uid() = user_id);

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_platforms_updated_at
  BEFORE UPDATE ON user_platforms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
