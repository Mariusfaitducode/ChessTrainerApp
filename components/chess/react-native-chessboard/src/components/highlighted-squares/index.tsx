/* eslint-disable react/display-name */
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useChessboardProps } from '../../context/props-context/hooks';

import { useBoard } from '../../context/board-context/hooks';
import { useReversePiecePosition } from '../../notation';
import { HighlightedSquare } from './highlighted-square';
import { useSquareRefs } from '../../context/board-refs-context/hooks';

const HighlightedSquares: React.FC = React.memo(() => {
  // Utiliser le board du contexte pour éviter les re-renders inutiles
  const board = useBoard();
  const { pieceSize } = useChessboardProps();
  const { toPosition, toTranslation } = useReversePiecePosition();
  const refs = useSquareRefs();

  return (
    <View
      style={{
        ...StyleSheet.absoluteFillObject,
      }}
    >
      {board.map((row: any[], y: number) =>
        row.map((_: any, x: number) => {
          const square = toPosition({ x: x * pieceSize, y: y * pieceSize });
          const translation = toTranslation(square);

          return (
            <HighlightedSquare
              key={`${x}-${y}`}
              ref={refs?.current?.[square]}
              style={[
                styles.highlightedSquare,
                {
                  width: pieceSize,
                  transform: [
                    { translateX: translation.x },
                    { translateY: translation.y },
                  ],
                },
              ]}
            />
          );
        })
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  highlightedSquare: {
    position: 'absolute',
    aspectRatio: 1,
  },
});

export { HighlightedSquares };
