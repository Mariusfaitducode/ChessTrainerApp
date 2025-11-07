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
      // Utiliser un état JS normal au lieu d'un SharedValue pour éviter les problèmes dans .enabled()
      const [pieceEnabledState, setPieceEnabledState] = useState(true);
      const pieceEnabled = useSharedValue(true);
      // Synchroniser pieceEnabled avec pieceEnabledState
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

      const gestureEnabled = useDerivedValue(
        () => {
          'worklet';
          return (
            turn.value === id.charAt(0) && gestureEnabledFromChessboardProps
          );
        },
        // Les shared values ne doivent pas être dans les dépendances
        // Le worklet accède toujours à la valeur actuelle
        [id, gestureEnabledFromChessboardProps]
      );

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

      const wrappedOnMoveForJSThread = useCallback(
        ({ move }: { move: Move }) => {
          onMove(move.from, move.to);
        },
        [onMove]
      );

      const moveTo = useCallback(
        (from: Square, to: Square) => {
          return new Promise<Move | undefined>((resolve) => {
            const move = validateMove(from, to);
            const { x, y } = toTranslation(move ? move.to : from);
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
                if (move) {
                  runOnJS(wrappedOnMoveForJSThread)({ move });
                  // Ideally I must call the resolve method
                  // inside the "wrappedOnMoveForJSThread" after
                  // the "onMove" function.
                  // Unfortunately I'm not able to pass a
                  // function in the RunOnJS params
                  runOnJS(resolve)(move);
                } else {
                  runOnJS(resolve)(undefined);
                }
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
          wrappedOnMoveForJSThread,
        ]
      );

      // Fonction JS normale pour appeler moveTo avec les bonnes coordonnées
      const movePieceJS = useCallback(
        (from: Square, to: Square) => {
          moveTo(from, to);
        },
        [moveTo]
      );

      // Fonction worklet pour calculer la position de départ et appeler la fonction JS
      const movePieceWorklet = useCallback(() => {
        'worklet';
        // Calculer la position de départ dans le worklet
        const from = toPosition({ x: offsetX.value, y: offsetY.value });
        // Calculer la position de fin (déjà calculée dans onEnd)
        const endPos = toPosition({
          x: translateX.value,
          y: translateY.value,
        });
        // Appeler la fonction JS avec les deux positions
        runOnJS(movePieceJS)(from, endPos);
        // Ne pas mettre offsetX/offsetY/translateX/translateY dans les dépendances car ce sont des shared values
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [movePieceJS, toPosition]);

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

      // onStartTap ne doit PAS être un worklet car il est appelé depuis handleOnBeginJS (JS)
      // Il doit être une fonction JS normale qui appelle onSelectPiece directement
      const onStartTap = useCallback(
        (squareParam: Square) => {
          if (!onSelectPiece) {
            return;
          }
          onSelectPiece(squareParam);
        },
        [onSelectPiece]
      );

      const globalMoveTo = useCallback(
        (move: Move) => {
          refs?.current?.[move.from].current.moveTo?.(move.to);
        },
        [refs]
      );

      // Fonction pour mettre à jour le scale (doit être un worklet)
      const updateScale = useCallback(() => {
        'worklet';
        scale.value = withTiming(1.2);
      }, [scale]);

      // Fonction JS séparée pour la logique qui nécessite des fonctions JS
      const handleOnBeginJS = useCallback(
        ({
          currentSquare,
          previousSquare,
          isEnabled,
        }: {
          currentSquare: Square;
          previousSquare: Square | null;
          isEnabled: boolean;
        }) => {
          // Valider le coup si une pièce était déjà sélectionnée
          if (previousSquare) {
            const move = validateMove(previousSquare, currentSquare);
            if (move) {
              globalMoveTo(move);
              return;
            }
          }

          // Si le geste n'est pas activé, ne rien faire
          if (!isEnabled) {
            return;
          }

          // Appeler onStartTap d'abord (JS)
          onStartTap(square);

          // Mettre à jour le scale via runOnUI (worklet) APRÈS onStartTap
          // pour éviter les problèmes de timing
          runOnUI(updateScale)();
        },
        [globalMoveTo, onStartTap, square, validateMove, updateScale]
      );

      // handleOnBegin doit être un worklet mais ne peut pas utiliser directement
      // des fonctions JS. On doit séparer la logique worklet de la logique JS.
      const handleOnBeginWorklet = useCallback(() => {
        'worklet';
        // Lire les valeurs dans le worklet
        const currentTranslateX = translateX.value;
        const currentTranslateY = translateY.value;
        const prevSquare = selectedSquare.value;
        const isEnabled = gestureEnabled.value;

        // Calculer la position actuelle dans le worklet
        const currentPos = toPosition({
          x: currentTranslateX,
          y: currentTranslateY,
        });

        // Passer les valeurs nécessaires à la fonction JS
        runOnJS(handleOnBeginJS)({
          currentSquare: currentPos,
          previousSquare: prevSquare,
          isEnabled,
        });
      }, [
        gestureEnabled,
        selectedSquare,
        translateX,
        translateY,
        toPosition,
        handleOnBeginJS,
      ]);

      // Calculer enabled avec une valeur JS normale (pas de SharedValue)
      // pour éviter les problèmes dans .enabled() sur mobile
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
