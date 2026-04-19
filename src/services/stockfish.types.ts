export interface ChessEngine {
  init(): Promise<void>;
  evaluate(
    fen: string,
    depth: number,
  ): Promise<{ cp: number; bestMove: string; mate: number | null }>;
  dispose(): Promise<void>;
}

export interface EvaluateMovesInput {
  fenBefore: string;
  fenAfter: string;
  playedMove: string;
}

export interface MoveEval {
  evalBefore: number;
  evalAfter: number;
  bestMove: string;
}
