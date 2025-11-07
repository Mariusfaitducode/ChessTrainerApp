import type { Square } from 'chess.js';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  type SharedValue,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from 'react-native-reanimated';
import { useChessboardProps } from '../../context/props-context/hooks';

import { useReversePiecePosition } from '../../notation';

type PlaceholderDotProps = {
  x: number;
  y: number;
  selectableSquares: SharedValue<Square[]>;
  moveTo?: (to: Square) => void;
};

const PlaceholderDotComponent: React.FC<PlaceholderDotProps> = ({
  x,
  y,
  selectableSquares,
  moveTo,
}) => {
  const { pieceSize } = useChessboardProps();
  const { toPosition, toTranslation } = useReversePiecePosition();

  const currentSquare = toPosition({ x: x * pieceSize, y: y * pieceSize });
  const translation = useMemo(
    () => toTranslation(currentSquare),
    [currentSquare, toTranslation]
  );

  const isSelectable = useDerivedValue(() => {
    'worklet';
    try {
      const squares = selectableSquares.value;
      if (!Array.isArray(squares) || squares.length === 0) {
        return false;
      }
      // Vérifier que currentSquare est bien une string avant d'utiliser includes
      const currentSquareStr = String(currentSquare);
      return (
        squares
          .map((square) => {
            const squareStr = String(square);
            return (
              squareStr === currentSquareStr ||
              squareStr.includes(currentSquareStr)
            );
          })
          .filter((v) => v).length > 0
      );
    } catch {
      return false;
    }
  }, [currentSquare]);

  const rPlaceholderStyle = useAnimatedStyle(() => {
    const canBeSelected = isSelectable.value;
    return { opacity: withTiming(canBeSelected ? 0.15 : 0) };
  }, []);

  // Handler pour onTouchEnd - doit être une fonction JS normale, pas un worklet
  const handleTouchEnd = React.useCallback(() => {
    // Accéder à isSelectable.value dans un callback JS est OK
    if (isSelectable.value && moveTo) {
      moveTo(currentSquare);
    }
  }, [currentSquare, isSelectable, moveTo]);

  return (
    <View
      onTouchEnd={handleTouchEnd}
      style={[
        styles.placeholderContainer,
        {
          width: pieceSize,
          padding: pieceSize / 3.2,
          transform: [
            { translateX: translation.x },
            { translateY: translation.y },
          ],
        },
      ]}
    >
      <Animated.View
        style={[
          { borderRadius: pieceSize },
          styles.placeholder,
          rPlaceholderStyle,
        ]}
      />
    </View>
  );
};

const PlaceholderDot = React.memo(PlaceholderDotComponent);
PlaceholderDot.displayName = 'PlaceholderDot';

const styles = StyleSheet.create({
  placeholderContainer: {
    position: 'absolute',
    aspectRatio: 1,
    backgroundColor: 'transparent',
  },
  placeholder: {
    flex: 1,
    backgroundColor: 'black',
    opacity: 0.2,
  },
});

export { PlaceholderDot };
