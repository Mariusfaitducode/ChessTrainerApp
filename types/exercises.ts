// Types pour les exercices
// Réexport depuis database.ts (types générés depuis Supabase)

export type {
  Exercise,
  ExerciseRow,
  ExerciseInsert,
  ExerciseUpdate,
} from "./database";

// Types spécifiques aux exercices (non liés à la DB)
export interface ExerciseAttempt {
  move: string;
  isCorrect: boolean;
  feedback?: string;
}
