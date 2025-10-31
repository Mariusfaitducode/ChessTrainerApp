// Types pour le domaine échecs

export type Platform = "lichess" | "chesscom";

export type MistakeLevel = "blunder" | "mistake" | "inaccuracy" | null;

export type ExerciseType =
  | "find_best_move"
  | "find_mistake"
  | "tactical_puzzle";

export type GameResult = "1-0" | "0-1" | "1/2-1/2" | "*";

export interface GameMove {
  moveNumber: number;
  white?: string;
  black?: string;
  fen: string;
}

export interface PositionEvaluation {
  evaluation: number; // centipawns
  bestMove: string;
  playedMove: string;
  mistakeLevel: MistakeLevel;
  depth?: number;
  variations?: string[][];
}

export interface ChessPosition {
  fen: string;
  moves: string[];
}
