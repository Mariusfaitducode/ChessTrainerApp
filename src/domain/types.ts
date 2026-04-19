export type Color = 'w' | 'b';

export type GameResult = '1-0' | '0-1' | '1/2-1/2';

export type MoveQuality = 'blunder' | 'mistake' | 'inaccuracy' | 'ok' | 'best';

export interface Game {
  id: string;
  playedAt: number;
  white: string;
  black: string;
  result: GameResult;
  userColor: Color;
  timeClass: string | null;
  pgn: string;
  analyzedAt: number | null;
}

export interface Puzzle {
  id: string;
  gameId: string;
  moveNumber: number;
  fen: string;
  playedMove: string;
  bestMove: string;
  quality: 'blunder' | 'mistake' | 'inaccuracy';
  evalLoss: number;
  solvedAt: number | null;
}

export interface MoveEvaluation {
  moveNumber: number;
  fen: string;
  playedMove: string;
  evalBefore: number;
  evalAfter: number;
  bestMove: string;
}
