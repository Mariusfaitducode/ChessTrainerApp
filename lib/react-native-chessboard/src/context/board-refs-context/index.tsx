import type { Move, Square } from 'chess.js';
import React, {
  createContext,
  useCallback,
  useImperativeHandle,
  useRef,
} from 'react';
import {
  ChessboardState,
  getChessboardState,
} from '../../helpers/get-chessboard-state';
import type { ChessPieceRef } from '../../components/piece';
import type { HighlightedSquareRefType } from '../../components/highlighted-squares/highlighted-square';

import { useChessEngine } from '../chess-engine-context/hooks';
import { useSetBoard } from '../board-context/hooks';

const PieceRefsContext = createContext<React.MutableRefObject<Record<
  Square,
  React.MutableRefObject<ChessPieceRef>
> | null> | null>(null);

const SquareRefsContext = createContext<React.MutableRefObject<Record<
  Square,
  React.MutableRefObject<HighlightedSquareRefType>
> | null> | null>(null);

export type ChessboardRef = {
  move: (_: {
    from: Square;
    to: Square;
    promotion?: string;
  }) => Promise<Move | undefined> | undefined;
  highlight: (_: { square: Square; color?: string }) => void;
  resetAllHighlightedSquares: () => void;
  resetBoard: (fen?: string) => void;
  navigateToPosition: (params: {
    targetFen: string;
    moveHistory?: Move[];
    currentIndex?: number;
    targetIndex?: number;
  }) => Promise<void>;
  getState: () => ChessboardState;
};

const BoardRefsContextProviderComponent = React.forwardRef<
  ChessboardRef,
  { children?: React.ReactNode }
>(function BoardRefsContextProviderComponent({ children }, ref) {
  const chess = useChessEngine();
  const board = chess.board();
  const setBoard = useSetBoard();

  // There must be a better way of doing this.
  const generateBoardRefs = useCallback(() => {
    let acc = {};
    for (let x = 0; x < board.length; x++) {
      const row = board[x];
      for (let y = 0; y < row.length; y++) {
        const col = String.fromCharCode(97 + Math.round(x));

        const row = `${8 - Math.round(y)}`;
        const square = `${col}${row}` as Square;

        // eslint-disable-next-line react-hooks/rules-of-hooks
        acc = { ...acc, [square]: useRef(null) };
      }
    }
    return acc as any;
  }, [board]);

  const pieceRefs: React.MutableRefObject<Record<
    Square,
    React.MutableRefObject<ChessPieceRef>
  > | null> = useRef(generateBoardRefs());

  const squareRefs: React.MutableRefObject<Record<
    Square,
    React.MutableRefObject<HighlightedSquareRefType>
  > | null> = useRef(generateBoardRefs());

  useImperativeHandle(
    ref,
    () => ({
      move: ({ from, to, promotion }) => {
        return pieceRefs?.current?.[from].current?.moveTo?.(to);
      },
      highlight: ({ square, color }) => {
        squareRefs.current?.[square].current.highlight({
          backgroundColor: color,
        });
      },
      resetAllHighlightedSquares: () => {
        for (let x = 0; x < board.length; x++) {
          const row = board[x];
          for (let y = 0; y < row.length; y++) {
            const col = String.fromCharCode(97 + Math.round(x));

            const row = `${8 - Math.round(y)}`;
            const square = `${col}${row}` as Square;
            squareRefs.current?.[square].current.reset();
          }
        }
      },
      getState: () => {
        return getChessboardState(chess);
      },
      resetBoard: (fen) => {
        chess.reset();
        if (fen) chess.load(fen);
        // Différer setBoard pour éviter les warnings Reanimated
        // Utiliser requestAnimationFrame pour s'assurer que ça se fait après le render
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setBoard(chess.board());
          });
        });
      },
      navigateToPosition: async ({
        targetFen,
        moveHistory,
        currentIndex,
        targetIndex,
      }) => {
        // Si on a moveHistory, utiliser move() pour avoir les animations
        if (
          moveHistory &&
          moveHistory.length > 0 &&
          currentIndex !== undefined &&
          targetIndex !== undefined &&
          targetIndex >= -1 &&
          targetIndex < moveHistory.length
        ) {
          // Si on avance : ne jouer que les nouveaux coups
          if (targetIndex > currentIndex) {
            // Synchroniser le chess engine avec la position actuelle
            chess.reset();
            for (let i = 0; i <= currentIndex && i < moveHistory.length; i++) {
              chess.move(moveHistory[i]);
            }

            // Mettre à jour le board
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                setBoard(chess.board());
              });
            });

            // Attendre un peu pour que le board se mette à jour
            await new Promise((resolve) => setTimeout(resolve, 50));

            // Réinitialiser tous les highlights avant de jouer les coups
            // Faire cela de manière synchrone pour éviter les clignotements
            const currentBoardBefore = chess.board();
            for (let x = 0; x < currentBoardBefore.length; x++) {
              const row = currentBoardBefore[x];
              for (let y = 0; y < row.length; y++) {
                const col = String.fromCharCode(97 + Math.round(x));
                const rowStr = `${8 - Math.round(y)}`;
                const square = `${col}${rowStr}` as Square;
                squareRefs.current?.[square]?.current?.reset();
              }
            }

            // Petit délai pour s'assurer que les resets sont appliqués
            await new Promise((resolve) => setTimeout(resolve, 10));

            // Jouer seulement les nouveaux coups avec animations
            for (let i = currentIndex + 1; i <= targetIndex; i++) {
              const move = moveHistory[i];
              if (move && pieceRefs?.current?.[move.from]?.current) {
                // Réinitialiser le highlight du coup précédent
                if (i > currentIndex + 1) {
                  const prevMove = moveHistory[i - 1];
                  if (prevMove) {
                    squareRefs.current?.[prevMove.from]?.current?.reset();
                    squareRefs.current?.[prevMove.to]?.current?.reset();
                  }
                }

                // Jouer le coup avec animation
                await pieceRefs.current[move.from].current.moveTo(move.to);
                // Mettre à jour le chess engine
                chess.move(move);

                // Délai minimal entre les coups - juste assez pour que l'animation commence
                await new Promise((resolve) => setTimeout(resolve, 20));
              }
            }

            // Mettre à jour le board final
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                setBoard(chess.board());
              });
            });

            // Attendre que le re-render soit terminé avant d'appliquer le highlight
            // Appliquer le highlight UNE SEULE FOIS après tous les mouvements et le setBoard
            await new Promise((resolve) => setTimeout(resolve, 100));

            // Appliquer le highlight du dernier coup après que tout soit stabilisé
            if (targetIndex >= 0) {
              const lastMove = moveHistory[targetIndex];
              if (lastMove) {
                const fromRef = squareRefs.current?.[lastMove.from]?.current;
                const toRef = squareRefs.current?.[lastMove.to]?.current;
                if (fromRef && toRef) {
                  fromRef.highlight({
                    backgroundColor: undefined,
                  });
                  toRef.highlight({
                    backgroundColor: undefined,
                  });
                }
              }
            }
          } else if (targetIndex < currentIndex) {
            // Retour en arrière : charger directement la FEN (plus rapide)
            chess.reset();
            if (targetFen) {
              chess.load(targetFen);
            } else {
              // Rejouer jusqu'à targetIndex si pas de FEN
              for (let i = 0; i <= targetIndex && i < moveHistory.length; i++) {
                chess.move(moveHistory[i]);
              }
            }

            // Mettre à jour le board immédiatement
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                setBoard(chess.board());
              });
            });

            // Réinitialiser les highlights et appliquer le highlight du dernier coup
            await new Promise((resolve) => setTimeout(resolve, 100));
            const currentBoard = chess.board();
            for (let x = 0; x < currentBoard.length; x++) {
              const row = currentBoard[x];
              for (let y = 0; y < row.length; y++) {
                const col = String.fromCharCode(97 + Math.round(x));
                const rowStr = `${8 - Math.round(y)}`;
                const square = `${col}${rowStr}` as Square;
                squareRefs.current?.[square]?.current?.reset();
              }
            }

            if (targetIndex >= 0) {
              const lastMove = moveHistory[targetIndex];
              if (lastMove) {
                await new Promise((resolve) => setTimeout(resolve, 50));
                squareRefs.current?.[lastMove.from]?.current?.highlight({
                  backgroundColor: undefined,
                });
                squareRefs.current?.[lastMove.to]?.current?.highlight({
                  backgroundColor: undefined,
                });
              }
            }
          } else {
            // Même position : juste mettre à jour le highlight
            if (targetIndex >= 0) {
              const lastMove = moveHistory[targetIndex];
              if (lastMove) {
                const currentBoard = chess.board();
                for (let x = 0; x < currentBoard.length; x++) {
                  const row = currentBoard[x];
                  for (let y = 0; y < row.length; y++) {
                    const col = String.fromCharCode(97 + Math.round(x));
                    const rowStr = `${8 - Math.round(y)}`;
                    const square = `${col}${rowStr}` as Square;
                    squareRefs.current?.[square]?.current?.reset();
                  }
                }
                await new Promise((resolve) => setTimeout(resolve, 50));
                squareRefs.current?.[lastMove.from]?.current?.highlight({
                  backgroundColor: undefined,
                });
                squareRefs.current?.[lastMove.to]?.current?.highlight({
                  backgroundColor: undefined,
                });
              }
            }
          }

          return;
        }

        // Fallback : utiliser resetBoard si pas de moveHistory
        chess.reset();
        if (targetFen) chess.load(targetFen);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setBoard(chess.board());
          });
        });
      },
    }),
    [board, chess, setBoard]
  );

  return (
    <PieceRefsContext.Provider value={pieceRefs}>
      <SquareRefsContext.Provider value={squareRefs}>
        {children}
      </SquareRefsContext.Provider>
    </PieceRefsContext.Provider>
  );
});

const BoardRefsContextProvider = React.memo(BoardRefsContextProviderComponent);

export { PieceRefsContext, SquareRefsContext, BoardRefsContextProvider };
