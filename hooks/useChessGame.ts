import { useState, useEffect, useMemo, useCallback, useRef } from "react";
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
  const [isParsing, setIsParsing] = useState(false);
  const previousPgnRef = useRef<string>("");

  const [parsedData, setParsedData] = useState<{
    chess: Chess | null;
    moves: ParsedGameMove[];
    moveHistory: Move[];
    fenCache: Map<number, string>;
  }>({
    chess: null,
    moves: [],
    moveHistory: [],
    fenCache: new Map<number, string>(),
  });

  // Parser le PGN de manière asynchrone pour ne pas bloquer le thread principal
  useEffect(() => {
    if (!pgn) {
      setParsedData({
        chess: null,
        moves: [],
        moveHistory: [],
        fenCache: new Map<number, string>(),
      });
      setIsParsing(false);
      return;
    }

    // Éviter de re-parser si on a déjà les données pour ce PGN
    if (previousPgnRef.current === pgn && parsedData.moves.length > 0) {
      console.log("[useChessGame] PGN déjà parsé, skip");
      return;
    }

    previousPgnRef.current = pgn;
    setIsParsing(true);
    const startTime = performance.now();

    // Parser immédiatement mais de manière non-bloquante
    // Utiliser queueMicrotask pour permettre au UI de se rendre d'abord
    queueMicrotask(() => {
      try {
        const parseStartTime = performance.now();
        console.log("[useChessGame] Début parsing PGN, longueur:", pgn.length);

        const game = new Chess();
        const loadStartTime = performance.now();
        game.loadPgn(pgn);
        console.log(
          `[useChessGame] loadPgn: ${performance.now() - loadStartTime}ms`,
        );

        const historyStartTime = performance.now();
        const history = game.history({ verbose: true });
        console.log(
          `[useChessGame] history: ${performance.now() - historyStartTime}ms, ${history.length} coups`,
        );

        const parsedMoves: ParsedGameMove[] = [];
        const moveHistoryArray: Move[] = [];
        const fenMap = new Map<number, string>();

        // Position de départ
        const tempGame = new Chess();
        fenMap.set(-1, tempGame.fen());

        let moveIndex = 0;
        const loopStartTime = performance.now();

        // Parser tous les coups en une seule fois (plus rapide que par batch)
        // Le parsing par batch était trop lent à cause des setTimeout multiples
        for (const move of history) {
          tempGame.move(move);
          const moveNumber = Math.floor(moveIndex / 2) + 1;
          const isWhiteMove = moveIndex % 2 === 0;
          const currentFen = tempGame.fen();

          // Stocker le FEN pour cet index
          fenMap.set(moveIndex, currentFen);

          if (isWhiteMove) {
            parsedMoves.push({
              moveNumber,
              white: move.san,
              fen: currentFen,
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

        // Fin du parsing
        const loopTime = performance.now() - loopStartTime;
        const totalTime = performance.now() - parseStartTime;
        console.log(
          `[useChessGame] Parsing terminé en ${totalTime}ms (loop: ${loopTime}ms)`,
        );

        setParsedData({
          chess: game,
          moves: parsedMoves,
          moveHistory: moveHistoryArray,
          fenCache: fenMap,
        });
        setIsParsing(false);
      } catch (err: any) {
        console.error("[useChessGame] Erreur lors du parsing du PGN:", err);
        setError(err?.message || "Erreur lors du parsing du PGN");
        setParsedData({
          chess: null,
          moves: [],
          moveHistory: [],
          fenCache: new Map<number, string>(),
        });
        setIsParsing(false);
      }
    });

    return () => {
      // Cleanup si le composant se démonte
      setIsParsing(false);
    };
  }, [pgn]);

  const { chess, moves, moveHistory, fenCache } = parsedData;

  // Réinitialiser l'index quand le PGN change
  useEffect(() => {
    setCurrentMoveIndex(-1);
  }, [pgn]);

  const currentFen = useMemo(() => {
    // Utiliser le cache précalculé au lieu de rejouer les coups
    const cached = fenCache.get(currentMoveIndex);
    if (cached) {
      return cached;
    }

    // Fallback si pas dans le cache (ne devrait pas arriver)
    if (currentMoveIndex === -1) {
      return "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    }

    if (currentMoveIndex >= moveHistory.length && chess) {
      return chess.fen();
    }

    return "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  }, [currentMoveIndex, fenCache, moveHistory.length, chess]);

  const goToMove = useCallback(
    (index: number) => {
      const maxIndex = moveHistory.length - 1;
      setCurrentMoveIndex(Math.max(-1, Math.min(index, maxIndex)));
    },
    [moveHistory.length],
  );

  const goToStart = useCallback(() => setCurrentMoveIndex(-1), []);
  const goToEnd = useCallback(
    () => setCurrentMoveIndex(moveHistory.length - 1),
    [moveHistory.length],
  );
  const goToPrevious = useCallback(() => {
    setCurrentMoveIndex((prev) => Math.max(-1, prev - 1));
  }, []);
  const goToNext = useCallback(() => {
    setCurrentMoveIndex((prev) => Math.min(moveHistory.length - 1, prev + 1));
  }, [moveHistory.length]);

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
    isParsing,
  };
};
