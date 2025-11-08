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

  // Créer une fonction stable pour resetAllHighlightedSquares qui n'utilise pas board
  const resetAllHighlightedSquaresStable = useCallback(() => {
    // Différer pour éviter les warnings Reanimated
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // Utiliser chess.board() au lieu de board pour éviter les dépendances
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
      });
    });
  }, [chess]);

  const highlightStable = useCallback(
    ({ square, color }: { square: Square; color?: string }) => {
      // Différer pour éviter les warnings Reanimated
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          squareRefs.current?.[square]?.current?.highlight({
            backgroundColor: color,
          });
        });
      });
    },
    []
  );

  useImperativeHandle(
    ref,
    () => ({
      move: ({ from, to, promotion }) => {
        return pieceRefs?.current?.[from].current?.moveTo?.(to);
      },
      highlight: highlightStable,
      resetAllHighlightedSquares: resetAllHighlightedSquaresStable,
      getState: () => {
        return getChessboardState(chess);
      },
      resetBoard: (fen) => {
        chess.reset();
        if (fen) chess.load(fen);
        // Différer setBoard pour éviter les warnings Reanimated
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setBoard(chess.board());
          });
        });
      },
    }),
    [chess, setBoard, highlightStable, resetAllHighlightedSquaresStable]
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
