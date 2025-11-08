import type { Move, Square } from 'chess.js';
import React, {
  useCallback,
  useImperativeHandle,
  useState,
  useEffect,
} from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  runOnUI,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useChessboardProps } from '../../context/props-context/hooks';
import { useBoardOperations } from '../../context/board-operations-context/hooks';
import { useBoardPromotion } from '../../context/board-promotion-context/hooks';
import { usePieceRefs } from '../../context/board-refs-context/hooks';
import { useChessEngine } from '../../context/chess-engine-context/hooks';
import { useReversePiecePosition } from '../../notation';
import type { PieceType, Vector } from '../../types';

import { ChessPiece } from './visual-piece';

type PieceProps = {
  id: PieceType;
  startPosition: Vector;
  square: Square;
  size: number;
};

export type ChessPieceRef = {
  moveTo: (square: Square) => Promise<Move | undefined>;
  enable: (activate: boolean) => void;
};

const Piece = React.memo(
  React.forwardRef<ChessPieceRef, PieceProps>(
    ({ id, startPosition, square, size }, ref) => {
      const chess = useChessEngine();
      const refs = usePieceRefs();
      const [pieceEnabledState, setPieceEnabledState] = useState(true);
      const pieceEnabled = useSharedValue(true);

      useEffect(() => {
        pieceEnabled.value = pieceEnabledState;
      }, [pieceEnabledState, pieceEnabled]);
      const { isPromoting } = useBoardPromotion();
      const { onSelectPiece, onMove, selectedSquare, turn } =
        useBoardOperations();

      const {
        durations: { move: moveDuration },
        gestureEnabled: gestureEnabledFromChessboardProps,
      } = useChessboardProps();

      const gestureEnabled = useDerivedValue(() => {
        'worklet';
        return turn.value === id.charAt(0) && gestureEnabledFromChessboardProps;
      }, [id, gestureEnabledFromChessboardProps]);

      const { toPosition, toTranslation } = useReversePiecePosition();

      const isGestureActive = useSharedValue(false);
      const offsetX = useSharedValue(0);
      const offsetY = useSharedValue(0);
      const scale = useSharedValue(1);

      const translateX = useSharedValue(startPosition.x * size);
      const translateY = useSharedValue(startPosition.y * size);

      const validateMove = useCallback(
        (from: Square, to: Square) => {
          return chess
            .moves({ verbose: true })
            .find((m: any) => m.from === from && m.to === to);
        },
        [chess]
      );

      const validateMoveRef = React.useRef(validateMove);
      const onMoveRef = React.useRef(onMove);
      const resolveCallbacksRef = React.useRef<
        Map<number, (value: Move | undefined) => void>
      >(new Map());
      const resolveIdCounterRef = React.useRef(0);

      useEffect(() => {
        validateMoveRef.current = validateMove;
        onMoveRef.current = onMove;
      }, [validateMove, onMove]);

      function callOnMove(from: Square, to: Square) {
        onMoveRef.current?.(from, to);
      }

      function resolvePromise(
        from: Square,
        to: Square,
        resolveId: number,
        hasMove: boolean
      ) {
        const resolve = resolveCallbacksRef.current.get(resolveId);
        if (resolve) {
          const move = hasMove ? validateMoveRef.current(from, to) : undefined;
          resolve(move || undefined);
          resolveCallbacksRef.current.delete(resolveId);
        }
      }

      const moveTo = useCallback(
        (from: Square, to: Square) => {
          return new Promise<Move | undefined>((resolve) => {
            const move = validateMove(from, to);
            const moveFrom = move ? move.from : from;
            const moveToSquare = move ? move.to : to;
            const hasMove = !!move;

            const { x, y } = toTranslation(moveToSquare);
            const resolveId = resolveIdCounterRef.current++;
            resolveCallbacksRef.current.set(resolveId, resolve);

            translateX.value = withTiming(x, { duration: moveDuration }, () => {
              offsetX.value = translateX.value;
            });
            translateY.value = withTiming(
              y,
              { duration: moveDuration },
              (isFinished) => {
                if (!isFinished) return;
                offsetY.value = translateY.value;
                isGestureActive.value = false;
                if (hasMove) {
                  runOnJS(callOnMove)(moveFrom, moveToSquare);
                }
                runOnJS(resolvePromise)(
                  moveFrom,
                  moveToSquare,
                  resolveId,
                  hasMove
                );
              }
            );
          });
        },
        [
          isGestureActive,
          moveDuration,
          offsetX,
          offsetY,
          toTranslation,
          translateX,
          translateY,
          validateMove,
        ]
      );

      const movePieceRef = React.useRef(moveTo);
      useEffect(() => {
        movePieceRef.current = moveTo;
      }, [moveTo]);

      function movePieceJS(from: Square, to: Square) {
        movePieceRef.current(from, to);
      }

      const movePieceWorklet = useCallback(() => {
        'worklet';
        const from = toPosition({ x: offsetX.value, y: offsetY.value });
        const endPos = toPosition({
          x: translateX.value,
          y: translateY.value,
        });
        runOnJS(movePieceJS)(from, endPos);
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);

      useImperativeHandle(ref, () => {
        return {
          moveTo: (to: Square) => {
            return moveTo(square, to);
          },
          enable: (active: boolean) => {
            setPieceEnabledState(active);
            pieceEnabled.value = active;
          },
        };
      }, [moveTo, pieceEnabled, square]);

      const onSelectPieceRef = React.useRef(onSelectPiece);
      const validateMoveRefForBegin = React.useRef(validateMove);
      const globalMoveToRef = React.useRef((move: Move) => {
        const moveFrom = move.from;
        const moveTo = move.to;
        refs?.current?.[moveFrom]?.current?.moveTo?.(moveTo);
      });

      useEffect(() => {
        onSelectPieceRef.current = onSelectPiece;
        validateMoveRefForBegin.current = validateMove;
        globalMoveToRef.current = (move: Move) => {
          const moveFrom = move.from;
          const moveTo = move.to;
          refs?.current?.[moveFrom]?.current?.moveTo?.(moveTo);
        };
      }, [onSelectPiece, validateMove, refs]);

      function handleOnBeginJS(
        currentSquare: Square,
        previousSquare: Square | null,
        isEnabled: boolean
      ) {
        if (previousSquare) {
          const move = validateMoveRefForBegin.current(
            previousSquare,
            currentSquare
          );
          if (move) {
            globalMoveToRef.current(move);
            return;
          }
        }

        if (!isEnabled) {
          return;
        }

        onSelectPieceRef.current?.(square);
        runOnUI(() => {
          'worklet';
          scale.value = withTiming(1.2);
        })();
      }

      const handleOnBeginWorklet = useCallback(() => {
        'worklet';
        const currentPos = toPosition({
          x: translateX.value,
          y: translateY.value,
        });
        runOnJS(handleOnBeginJS)(
          currentPos,
          selectedSquare.value,
          gestureEnabled.value
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);

      const gestureEnabledForCreation = !isPromoting && pieceEnabledState;

      const gesture = Gesture.Pan()
        .enabled(gestureEnabledForCreation)
        .onBegin(() => {
          'worklet';
          offsetX.value = translateX.value;
          offsetY.value = translateY.value;
          handleOnBeginWorklet();
        })
        .onStart(() => {
          'worklet';
          if (!gestureEnabled.value) {
            return;
          }
          isGestureActive.value = true;
        })
        .onUpdate(({ translationX, translationY }) => {
          'worklet';
          if (!gestureEnabled.value) return;
          translateX.value = offsetX.value + translationX;
          translateY.value = offsetY.value + translationY;
        })
        .onEnd(() => {
          'worklet';
          if (!gestureEnabled.value) {
            return;
          }
          // Appeler le worklet qui gère le calcul et l'appel JS
          movePieceWorklet();
        })
        .onFinalize(() => {
          'worklet';
          scale.value = withTiming(1);
        });

      const style = useAnimatedStyle(() => {
        return {
          position: 'absolute',
          opacity: withTiming(pieceEnabled.value ? 1 : 0),
          zIndex: isGestureActive.value ? 100 : 10,
          transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { scale: scale.value },
          ],
        };
      });

      const underlay = useAnimatedStyle(() => {
        const position = toPosition({
          x: translateX.value,
          y: translateY.value,
        });
        const translation = toTranslation(position);
        return {
          position: 'absolute',
          width: size * 2,
          height: size * 2,
          borderRadius: size,
          zIndex: 0,
          backgroundColor: isGestureActive.value
            ? 'rgba(0, 0, 0, 0.1)'
            : 'transparent',
          transform: [
            { translateX: translation.x - size / 2 },
            { translateY: translation.y - size / 2 },
          ],
        };
      }, [size]);

      return (
        <>
          <Animated.View style={underlay} />
          <GestureDetector gesture={gesture}>
            <Animated.View style={style}>
              <ChessPiece id={id} />
            </Animated.View>
          </GestureDetector>
        </>
      );
    }
  ),
  (prev, next) =>
    prev.id === next.id &&
    prev.size === next.size &&
    prev.square === next.square
);

export default Piece;
