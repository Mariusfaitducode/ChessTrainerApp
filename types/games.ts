// Types pour les parties d'échecs

import { Platform, GameResult } from "./chess";

export interface Game {
  id: string;
  user_id: string;
  platform: Platform;
  platform_game_id: string;
  pgn: string;
  white_player: string | null;
  black_player: string | null;
  result: GameResult | null;
  time_control: string | null;
  played_at: string | null;
  imported_at: string;
  analyzed_at: string | null;
  blunders_count?: number; // Nombre de blunders (ajouté côté client)
}

export interface GameAnalysis {
  id: string;
  game_id: string;
  move_number: number;
  fen: string;
  evaluation: number | null;
  best_move: string | null;
  played_move: string;
  mistake_level: "blunder" | "mistake" | "inaccuracy" | null;
  analysis_data: Record<string, any> | null;
  created_at: string;
}

export interface GameWithAnalyses extends Game {
  analyses?: GameAnalysis[];
}
