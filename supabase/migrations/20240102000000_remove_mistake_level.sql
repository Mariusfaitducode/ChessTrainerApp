-- Migration: Supprimer mistake_level (remplacé par move_quality)
-- Date: 2024-01-02

-- Supprimer l'index sur mistake_level (s'il existe)
DROP INDEX IF EXISTS idx_game_analyses_mistake_level;

-- Supprimer la colonne mistake_level
-- Note: Cette opération supprime définitivement les données
-- Si vous voulez garder les données pour référence, commentez cette ligne
ALTER TABLE game_analyses
  DROP COLUMN IF EXISTS mistake_level;

-- Commentaire pour documenter le changement
COMMENT ON COLUMN game_analyses.move_quality IS 'Qualité du coup: best, excellent, good, inaccuracy, mistake, blunder (remplace mistake_level)';

