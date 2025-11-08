-- Migration: Ajouter les colonnes pour la classification complète des coups
-- Date: 2024-01-01

-- Ajouter les nouvelles colonnes à game_analyses
ALTER TABLE game_analyses
  ADD COLUMN IF NOT EXISTS move_quality TEXT CHECK (move_quality IN ('best', 'excellent', 'good', 'inaccuracy', 'mistake', 'blunder')),
  ADD COLUMN IF NOT EXISTS game_phase TEXT CHECK (game_phase IN ('opening', 'middlegame', 'endgame')),
  ADD COLUMN IF NOT EXISTS evaluation_loss INTEGER; -- Perte d'évaluation en centipawns

-- Créer un index pour move_quality pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_game_analyses_move_quality ON game_analyses(move_quality) WHERE move_quality IS NOT NULL;

-- Créer un index pour game_phase
CREATE INDEX IF NOT EXISTS idx_game_analyses_game_phase ON game_analyses(game_phase) WHERE game_phase IS NOT NULL;

-- Commentaire sur les colonnes
COMMENT ON COLUMN game_analyses.move_quality IS 'Qualité du coup: best, excellent, good, inaccuracy, mistake, blunder';
COMMENT ON COLUMN game_analyses.game_phase IS 'Phase de la partie: opening, middlegame, endgame';
COMMENT ON COLUMN game_analyses.evaluation_loss IS 'Perte d''évaluation en centipawns (0 si meilleur coup)';

