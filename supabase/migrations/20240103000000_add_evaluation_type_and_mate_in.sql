-- Migration: Ajouter les colonnes evaluation_type et mate_in
-- Date: 2024-01-03

-- Ajouter les nouvelles colonnes à game_analyses
ALTER TABLE game_analyses
  ADD COLUMN IF NOT EXISTS evaluation_type TEXT CHECK (evaluation_type IN ('cp', 'mate')),
  ADD COLUMN IF NOT EXISTS mate_in INTEGER; -- Nombre de coups jusqu'au mat (positif si blancs matent, négatif si noirs matent)

-- Créer un index pour evaluation_type pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_game_analyses_evaluation_type ON game_analyses(evaluation_type) WHERE evaluation_type IS NOT NULL;

-- Commentaire sur les colonnes
COMMENT ON COLUMN game_analyses.evaluation_type IS 'Type d''évaluation: cp (centipawns) ou mate (mat)';
COMMENT ON COLUMN game_analyses.mate_in IS 'Nombre de coups jusqu''au mat (positif si blancs matent, négatif si noirs matent, NULL si pas de mat)';


