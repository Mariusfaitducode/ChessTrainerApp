import React, { useImperativeHandle } from 'react';
import { StyleProp, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useChessboardProps } from '../../context/props-context/hooks';

type HighlightedSquareProps = {
  style?: StyleProp<ViewStyle>;
};

export type HighlightedSquareRefType = {
  isHighlighted: () => boolean;
  reset: () => void;
  highlight: (_?: { backgroundColor?: string }) => void;
};

const HighlightedSquareComponent = React.forwardRef<
  HighlightedSquareRefType,
  HighlightedSquareProps
>(function HighlightedSquareComponent({ style }, ref) {
  const {
    colors: { lastMoveHighlight },
  } = useChessboardProps();
  const backgroundColor = useSharedValue(lastMoveHighlight);
  const isHighlighted = useSharedValue(false);

  useImperativeHandle(
    ref,
    () => ({
      reset: () => {
        // Différer pour éviter les warnings Reanimated pendant le render
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            isHighlighted.value = false;
          });
        });
      },
      highlight: ({ backgroundColor: bg } = {}) => {
        // Appliquer immédiatement - pas besoin de différer ici
        // car c'est appelé depuis navigateToPosition qui est déjà dans un contexte asynchrone
        backgroundColor.value = bg ?? lastMoveHighlight;
        isHighlighted.value = true;
      },
      isHighlighted: () => {
        // Accès à .value dans une fonction, pas dans le render
        return isHighlighted.value;
      },
    }),
    [backgroundColor, isHighlighted, lastMoveHighlight]
  );

  const rHighlightedSquareStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(isHighlighted.value ? 1 : 0),
      backgroundColor: backgroundColor.value,
    };
  }, []);

  return (
    <Animated.View
      style={[styles.highlightedSquare, style, rHighlightedSquareStyle]}
    />
  );
});

const styles = StyleSheet.create({
  highlightedSquare: {
    position: 'absolute',
    aspectRatio: 1,
  },
});

const HighlightedSquare = React.memo(HighlightedSquareComponent);

export { HighlightedSquare };
