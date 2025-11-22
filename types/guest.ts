/**
 * Types pour le mode guest (utilisateur non authentifié)
 */

import type { Platform } from "./chess";
import type { Game, GameAnalysis, Exercise } from "./database";

/**
 * Plateforme en mode guest (sans user_id)
 */
export interface GuestPlatform {
  platform: Platform;
  username: string;
}

/**
 * Données guest complètes
 */
export interface GuestData {
  platforms: GuestPlatform[];
  games: Game[];
  exercises: Exercise[];
  // Analyses stockées par gameId
  analyses: Record<string, GameAnalysis[]>;
}

/**
 * Clés de stockage AsyncStorage
 */
export const GUEST_STORAGE_KEYS = {
  GAMES: "guest_games",
  PLATFORMS: "guest_platforms",
  EXERCISES: "guest_exercises",
  ANALYSES_PREFIX: "guest_analyses_",
  MIGRATION_FLAG: "guest_migration_completed",
} as const;

/**
 * Seuils pour les prompts contextuels
 */
export const GUEST_PROMPT_THRESHOLDS = {
  GAMES_FOR_SYNC_PROMPT: 5,
  EXERCISES_FOR_PROMPT: 3,
} as const;

/**
 * Clés pour les prompts déjà affichés
 */
export const GUEST_PROMPT_KEYS = {
  SYNC_PROMPT: "prompt_sync_shown",
  EXERCISE_PROMPT: "prompt_exercise_shown",
} as const;
