import { useState, useEffect, useMemo } from "react";
import { Chess, type Move } from "chess.js";

import type { GameMove } from "@/types/chess";

export interface ParsedGameMove {
  moveNumber: number;
  white?: string;
  black?: string;
  fen: string;
  san: string; // Standard Algebraic Notation
  color: "w" | "b";
  from?: string;
  to?: string;
}

/**
 * Hook pour parser un PGN et gérer l'état d'une partie d'échecs
 */
export const useChessGame = (pgn: string | null) => {
  const [currentMoveIndex, setCurrentMoveIndex] = useState<number>(-1);
  const [error, setError] = useState<string | null>(null);

  const { chess, moves, moveHistory } = useMemo(() => {
    if (!pgn) {
      return { chess: null, moves: [], moveHistory: [] };
    }

    try {
      const game = new Chess();
      game.loadPgn(pgn);

      const history = game.history({ verbose: true });
      const parsedMoves: ParsedGameMove[] = [];
      const moveHistoryArray: Move[] = [];

      // Créer une nouvelle instance pour chaque position
      const tempGame = new Chess();
      let moveIndex = 0;

      for (const move of history) {
        const fenBefore = tempGame.fen();
        tempGame.move(move);

        const moveNumber = Math.floor(moveIndex / 2) + 1;
        const isWhiteMove = moveIndex % 2 === 0;

        if (isWhiteMove) {
          parsedMoves.push({
            moveNumber,
            white: move.san,
            fen: tempGame.fen(),
            san: move.san,
            color: "w",
            from: move.from,
            to: move.to,
          });
          moveHistoryArray.push(move);
        } else {
          // Ajouter le coup noir au dernier élément
          const lastMove = parsedMoves[parsedMoves.length - 1];
          if (lastMove) {
            lastMove.black = move.san;
            moveHistoryArray.push(move);
          }
        }
        moveIndex++;
      }

      return {
        chess: game,
        moves: parsedMoves,
        moveHistory: moveHistoryArray,
      };
    } catch (err: any) {
      console.error("Erreur lors du parsing du PGN:", err);
      setError(err?.message || "Erreur lors du parsing du PGN");
      return { chess: null, moves: [], moveHistory: [] };
    }
  }, [pgn]);

  // Réinitialiser l'index quand le PGN change
  useEffect(() => {
    setCurrentMoveIndex(-1);
  }, [pgn]);

  const currentFen = useMemo(() => {
    if (currentMoveIndex === -1) {
      return "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"; // Position de départ
    }

    if (currentMoveIndex >= moveHistory.length) {
      return (
        chess?.fen() ||
        "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
      );
    }

    // Rejouer jusqu'au coup courant
    const tempGame = new Chess();
    for (let i = 0; i <= currentMoveIndex && i < moveHistory.length; i++) {
      tempGame.move(moveHistory[i]);
    }
    return tempGame.fen();
  }, [currentMoveIndex, moveHistory, chess]);

  const goToMove = (index: number) => {
    const maxIndex = moveHistory.length - 1;
    setCurrentMoveIndex(Math.max(-1, Math.min(index, maxIndex)));
  };

  const goToStart = () => setCurrentMoveIndex(-1);
  const goToEnd = () => setCurrentMoveIndex(moveHistory.length - 1);
  const goToPrevious = () => {
    setCurrentMoveIndex((prev) => Math.max(-1, prev - 1));
  };
  const goToNext = () => {
    setCurrentMoveIndex((prev) => Math.min(moveHistory.length - 1, prev + 1));
  };

  const currentMove = moves[Math.floor((currentMoveIndex + 1) / 2)] || null;

  return {
    chess,
    moves,
    currentFen,
    currentMoveIndex,
    currentMove,
    totalMoves: moveHistory.length,
    goToMove,
    goToStart,
    goToEnd,
    goToPrevious,
    goToNext,
    error,
    isAtStart: currentMoveIndex === -1,
    isAtEnd: currentMoveIndex >= moveHistory.length - 1,
  };
};
