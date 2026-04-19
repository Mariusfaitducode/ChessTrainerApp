export const SCHEMA_VERSION = 1;

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,
  played_at INTEGER NOT NULL,
  white TEXT NOT NULL,
  black TEXT NOT NULL,
  result TEXT NOT NULL,
  user_color TEXT NOT NULL,
  time_class TEXT,
  pgn TEXT NOT NULL,
  analyzed_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_games_played_at ON games(played_at DESC);

CREATE TABLE IF NOT EXISTS puzzles (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  move_number INTEGER NOT NULL,
  fen TEXT NOT NULL,
  played_move TEXT NOT NULL,
  best_move TEXT NOT NULL,
  quality TEXT NOT NULL,
  eval_loss INTEGER NOT NULL,
  solved_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_puzzles_solved ON puzzles(solved_at);
CREATE INDEX IF NOT EXISTS idx_puzzles_game ON puzzles(game_id);

CREATE TABLE IF NOT EXISTS app_state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;
