import type { Chess } from 'chess.js';

// Adapter pour chess.js v1.x : les méthodes ont changé de nom
// On utilise un type personnalisé car les noms de méthodes ont changé
type ChessboardStateFunctions = {
  in_check: () => boolean;
  in_checkmate: () => boolean;
  in_draw: () => boolean;
  in_stalemate: () => boolean;
  in_threefold_repetition: () => boolean;
  insufficient_material: () => boolean;
  game_over: () => boolean;
  fen: () => string;
};

type RecordReturnTypes<T> = {
  readonly [P in keyof T]: T[P] extends () => any ? ReturnType<T[P]> : T[P];
};

export type ChessboardState = RecordReturnTypes<ChessboardStateFunctions>;

export const getChessboardState = (chess: Chess): ChessboardState => {
  // Adapter pour chess.js v1.x : in_checkmate() -> isCheckmate()
  // Les autres méthodes peuvent avoir changé aussi
  return {
    in_check: chess.isCheck(),
    in_checkmate: chess.isCheckmate(),
    in_draw: chess.isDraw(),
    in_stalemate: chess.isStalemate(),
    in_threefold_repetition: chess.isThreefoldRepetition(),
    insufficient_material: chess.isInsufficientMaterial(),
    game_over: chess.isGameOver(),
    fen: chess.fen(),
  };
};
