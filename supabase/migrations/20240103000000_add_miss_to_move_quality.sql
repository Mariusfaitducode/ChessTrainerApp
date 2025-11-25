-- Migration: Ajouter "miss" à la classification move_quality
-- Date: 2024-01-03
-- Description: Ajoute la catégorie "miss" pour les opportunités manquées

-- Supprimer l'ancienne contrainte CHECK
ALTER TABLE game_analyses
  DROP CONSTRAINT IF EXISTS game_analyses_move_quality_check;

-- Recréer la contrainte CHECK avec "miss" inclus
ALTER TABLE game_analyses
  ADD CONSTRAINT game_analyses_move_quality_check
  CHECK (move_quality IS NULL OR move_quality IN ('best', 'excellent', 'good', 'inaccuracy', 'mistake', 'blunder', 'miss'));

-- Mettre à jour le commentaire
COMMENT ON COLUMN game_analyses.move_quality IS 'Qualité du coup: best, excellent, good, inaccuracy, mistake, blunder, miss';

