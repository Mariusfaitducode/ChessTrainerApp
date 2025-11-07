import type { Square } from 'chess.js';
import React, {
  createContext,
  useCallback,
  useImperativeHandle,
  useMemo,
} from 'react';
import type { SharedValue } from 'react-native-reanimated';
import { useSharedValue } from 'react-native-reanimated';
import type { PieceType } from '../../types';
import { getChessboardState } from '../../helpers/get-chessboard-state';

import { useReversePiecePosition } from '../../notation';
import { useSetBoard } from '../board-context/hooks';
import { useBoardPromotion } from '../board-promotion-context/hooks';
import type { ChessboardRef } from '../board-refs-context';
import { usePieceRefs } from '../board-refs-context/hooks';
import { useChessEngine } from '../chess-engine-context/hooks';
import { useChessboardProps } from '../props-context/hooks';

type BoardOperationsContextType = {
  selectableSquares: SharedValue<Square[]>;
  onMove: (from: Square, to: Square) => void;
  onSelectPiece: (square: Square) => void;
  moveTo: (to: Square) => void;
  isPromoting: (from: Square, to: Square) => boolean;
  selectedSquare: SharedValue<Square | null>;
  turn: SharedValue<'w' | 'b'>;
};

const BoardOperationsContext = createContext<BoardOperationsContextType>(
  {} as any
);

export type BoardOperationsRef = {
  reset: () => void;
  resetHighlights: () => void;
};

function BoardOperationsContextProviderComponent(
  {
    children,
    controller,
  }: { controller?: ChessboardRef; children?: React.ReactNode },
  ref: React.ForwardedRef<BoardOperationsRef>
) {
  const chess = useChessEngine();
  const setBoard = useSetBoard();
  const {
    pieceSize,
    onMove: onChessboardMoveCallback,
    colors: { checkmateHighlight },
  } = useChessboardProps();
  const { toTranslation } = useReversePiecePosition();
  const selectableSquares = useSharedValue<Square[]>([]);
  const selectedSquare = useSharedValue<Square | null>(null);
  const { showPromotionDialog } = useBoardPromotion();
  const pieceRefs = usePieceRefs();

  const turn = useSharedValue(chess.turn());

  useImperativeHandle(
    ref,
    () => ({
      reset: () => {
        // Utiliser requestAnimationFrame pour éviter les warnings Reanimated
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            selectableSquares.value = [];
            // Ne pas reset les highlights ici - ils sont gérés par navigateToPosition
            // controller?.resetAllHighlightedSquares();
            turn.value = chess.turn();
          });
        });
      },
      resetHighlights: () => {
        // Méthode séparée pour reset les highlights si nécessaire
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            controller?.resetAllHighlightedSquares();
          });
        });
      },
    }),
    [chess, controller, selectableSquares, turn]
  );

  const isPromoting = useCallback(
    (from: Square, to: Square) => {
      if (!to.includes('8') && !to.includes('1')) return false;

      const val = toTranslation(from);
      const x = Math.floor(val.x / pieceSize);
      const y = Math.floor(val.y / pieceSize);
      const piece = chess.board()[y][x];

      return (
        piece?.type === chess.PAWN &&
        ((to.includes('8') && piece.color === chess.WHITE) ||
          (to.includes('1') && piece.color === chess.BLACK))
      );
    },
    [chess, pieceSize, toTranslation]
  );

  const findKing = useCallback(
    (type: 'wk' | 'bk') => {
      const board = chess.board();
      for (let x = 0; x < board.length; x++) {
        const row = board[x];
        for (let y = 0; y < row.length; y++) {
          const col = String.fromCharCode(97 + Math.round(x));

          const row = `${8 - Math.round(y)}`;
          const square = `${col}${row}` as Square;

          const piece = chess.get(square);
          if (piece?.color === type.charAt(0) && piece.type === type.charAt(1))
            return square;
        }
      }
      return null;
    },
    [chess]
  );

  const moveProgrammatically = useCallback(
    (from: Square, to: Square, promotionPiece?: PieceType) => {
      const move = chess.move({
        from,
        to,
        promotion: promotionPiece as any,
      });

      // Différer la mise à jour de turn pour éviter les warnings
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          turn.value = chess.turn();
        });
      });

      if (move == null) return;

      const isCheckmate = chess.in_checkmate();

      if (isCheckmate) {
        const kingType = chess.turn() === 'w' ? 'wk' : 'bk';
        const square = findKing(kingType);
        if (!square) return;
        controller?.highlight({ square, color: checkmateHighlight });
      }

      // Appeler le callback et vérifier si le coup doit être défait
      const shouldUndo =
        onChessboardMoveCallback?.({
          move,
          state: {
            ...getChessboardState(chess),
            in_promotion: promotionPiece != null,
          },
        }) === false;

      // Si le callback retourne false, défaire le coup
      if (shouldUndo) {
        chess.undo();
        setBoard(chess.board());
        return;
      }

      setBoard(chess.board());
    },
    [
      checkmateHighlight,
      chess,
      controller,
      findKing,
      onChessboardMoveCallback,
      setBoard,
      turn,
    ]
  );

  const onMove = useCallback(
    (from: Square, to: Square) => {
      // Différer les mises à jour des shared values pour éviter les warnings
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          selectableSquares.value = [];
          selectedSquare.value = null;
        });
      });
      const lastMove = { from, to };
      controller?.resetAllHighlightedSquares();
      controller?.highlight({ square: lastMove.from });
      controller?.highlight({ square: lastMove.to });

      const in_promotion = isPromoting(from, to);
      if (!in_promotion) {
        moveProgrammatically(from, to);
        return;
      }

      pieceRefs?.current?.[to]?.current?.enable(false);
      showPromotionDialog({
        type: chess.turn(),
        onSelect: (piece) => {
          moveProgrammatically(from, to, piece);
          pieceRefs?.current?.[to]?.current?.enable(true);
        },
      });
    },
    [
      chess,
      controller,
      isPromoting,
      moveProgrammatically,
      pieceRefs,
      selectableSquares,
      selectedSquare,
      showPromotionDialog,
    ]
  );

  const onSelectPiece = useCallback(
    (square: Square) => {
      // Calculer les coups valides AVANT de différer
      const validMoves = chess.moves({ square }) ?? [];
      const validSquares = validMoves.map((move: string) => {
        const splittedSquare = move.split('x');
        if (splittedSquare.length === 0) {
          return move;
        }
        return splittedSquare[splittedSquare.length - 1] as Square;
      });

      // Différer les mises à jour des shared values pour éviter les warnings
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          selectedSquare.value = square;
          selectableSquares.value = validSquares;
        });
      });
    },
    [chess, selectableSquares, selectedSquare]
  );

  const moveTo = useCallback(
    (to: Square) => {
      // Accès à .value dans le corps du callback, pas dans les dépendances

      const currentSquare = selectedSquare.value;
      if (currentSquare != null) {
        controller?.move({ from: currentSquare, to: to });
        return true;
      }
      return false;
    },
    [controller, selectedSquare]
  );

  const value = useMemo(() => {
    return {
      onMove,
      onSelectPiece,
      moveTo,
      selectableSquares,
      selectedSquare,
      isPromoting,
      turn,
    };
  }, [
    isPromoting,
    moveTo,
    onMove,
    onSelectPiece,
    selectableSquares,
    selectedSquare,
    turn,
  ]);

  return (
    <BoardOperationsContext.Provider value={value}>
      {children}
    </BoardOperationsContext.Provider>
  );
}

const BoardOperationsContextProviderComponentWithRef = React.forwardRef<
  BoardOperationsRef,
  { controller?: ChessboardRef; children?: React.ReactNode }
>(BoardOperationsContextProviderComponent);

BoardOperationsContextProviderComponentWithRef.displayName =
  'BoardOperationsContextProvider';

const BoardOperationsContextProvider = React.memo(
  BoardOperationsContextProviderComponentWithRef
);

export { BoardOperationsContextProvider, BoardOperationsContext };
