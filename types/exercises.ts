// Types pour les exercices

import { ExerciseType } from "./chess";

export interface Exercise {
  id: string;
  user_id: string;
  game_id: string | null;
  game_analysis_id: string | null;
  fen: string;
  position_description: string | null;
  exercise_type: ExerciseType;
  correct_move: string;
  hints: string[] | null;
  difficulty: number | null;
  completed: boolean;
  score: number;
  attempts: number;
  created_at: string;
  completed_at: string | null;
  // Champs enrichis côté client
  opponent?: string | null;
  evaluation_loss?: number; // Perte d'évaluation en centipawns
}

export interface ExerciseAttempt {
  move: string;
  isCorrect: boolean;
  feedback?: string;
}
