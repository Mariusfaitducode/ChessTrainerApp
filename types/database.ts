// Types générés depuis Supabase
// Import depuis le fichier généré par Supabase CLI
import type { Database } from "@/types/supabase";

// Types enrichis (avec champs calculés côté client)
import type { Platform, GameResult } from "./chess";

// Types de base depuis Supabase
export type GameRow = Database["public"]["Tables"]["games"]["Row"];
export type GameInsert = Database["public"]["Tables"]["games"]["Insert"];
export type GameUpdate = Database["public"]["Tables"]["games"]["Update"];

export type GameAnalysisRow =
  Database["public"]["Tables"]["game_analyses"]["Row"];
export type GameAnalysisInsert =
  Database["public"]["Tables"]["game_analyses"]["Insert"];
export type GameAnalysisUpdate =
  Database["public"]["Tables"]["game_analyses"]["Update"];

export type ExerciseRow = Database["public"]["Tables"]["exercises"]["Row"];
export type ExerciseInsert =
  Database["public"]["Tables"]["exercises"]["Insert"];
export type ExerciseUpdate =
  Database["public"]["Tables"]["exercises"]["Update"];

export type UserPlatformRow =
  Database["public"]["Tables"]["user_platforms"]["Row"];
export type UserPlatformInsert =
  Database["public"]["Tables"]["user_platforms"]["Insert"];
export type UserPlatformUpdate =
  Database["public"]["Tables"]["user_platforms"]["Update"];

export interface Game extends GameRow {
  // Champs déjà dans GameRow, mais on les réexporte pour compatibilité
  platform: Platform;
  result: GameResult | null;
  // Champs enrichis
  blunders_count?: number;
}

// GameAnalysis est identique à GameAnalysisRow
export type GameAnalysis = GameAnalysisRow;

export interface Exercise extends Omit<ExerciseRow, "hints"> {
  // Champs enrichis côté client
  opponent?: string | null;
  evaluation_loss?: number; // Perte d'évaluation en centipawns
  hints?: string[] | null; // Conversion depuis Json (ExerciseRow.hints est Json | null)
}

export interface UserPlatform extends UserPlatformRow {
  platform: Platform;
}

// Types utilitaires
export type GameWithAnalyses = Game & {
  analyses?: GameAnalysis[];
};

export type MistakeLevel = "blunder" | "mistake" | "inaccuracy" | null;
