import { Chess } from "chess.js";

/**
 * Parse un PGN et retourne les informations de la partie
 */
export const parsePGN = (pgn: string) => {
  try {
    const game = new Chess();
    game.loadPgn(pgn);

    return {
      isValid: true,
      moves: game.history(),
      fen: game.fen(),
      isCheck: game.inCheck(),
      isCheckmate: game.isCheckmate(),
      isStalemate: game.isStalemate(),
      isDraw: game.isDraw(),
      isGameOver: game.isGameOver(),
      turn: game.turn(), // 'w' ou 'b'
    };
  } catch (error: any) {
    return {
      isValid: false,
      error: error?.message || "Erreur lors du parsing du PGN",
    };
  }
};

/**
 * Rejoue une partie jusqu'à un certain nombre de coups
 */
export const replayToMove = (pgn: string, moveIndex: number): string => {
  try {
    const game = new Chess();
    game.loadPgn(pgn);

    const history = game.history({ verbose: true });
    const tempGame = new Chess();

    for (let i = 0; i <= moveIndex && i < history.length; i++) {
      tempGame.move(history[i]);
    }

    return tempGame.fen();
  } catch {
    return "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  }
};
