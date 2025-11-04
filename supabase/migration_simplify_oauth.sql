-- Migration : Simplification de l'authentification
-- Retire les tokens OAuth, on utilise maintenant juste des usernames

-- Supprimer les colonnes de tokens (si elles existent déjà)
ALTER TABLE user_platforms 
  DROP COLUMN IF EXISTS access_token,
  DROP COLUMN IF EXISTS refresh_token;

-- La table reste simple avec juste username et plateforme
-- (pas besoin de modifier la structure, juste retirer les colonnes)

-- Note: Si tu as déjà créé la table avec les tokens, exécute cette migration
-- Sinon, utilise le nouveau schéma simplifié dans schema_simplified.sql
