import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Chess, Square } from 'chess.js';
import { colors } from '@/theme';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;

type PieceSymbol = 'p' | 'n' | 'b' | 'r' | 'q' | 'k' | 'P' | 'N' | 'B' | 'R' | 'Q' | 'K';

interface ChessboardProps {
  fen: string;
  orientation: 'w' | 'b';
  interactive?: boolean;
  onMove?: (uci: string) => boolean;
  highlights?: Partial<Record<Square, 'goodMove' | 'badMove' | 'selected'>>;
  size?: number;
}

const PIECE_TO_UNICODE: Record<PieceSymbol, string> = {
  P: '\u2659', N: '\u2658', B: '\u2657', R: '\u2656', Q: '\u2655', K: '\u2654',
  p: '\u265F', n: '\u265E', b: '\u265D', r: '\u265C', q: '\u265B', k: '\u265A',
};

export function Chessboard({
  fen,
  orientation,
  interactive = false,
  onMove,
  highlights = {},
  size = 320,
}: ChessboardProps) {
  const squareSize = size / 8;
  const [selected, setSelected] = useState<Square | null>(null);

  const board = useMemo(() => {
    try {
      return new Chess(fen).board();
    } catch {
      return new Chess().board();
    }
  }, [fen]);

  const squares = useMemo(() => {
    const out: { square: Square; file: number; rank: number; piece: PieceSymbol | null }[] = [];
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const cell = board[r][f];
        const displayRank = orientation === 'w' ? 7 - r : r;
        const displayFile = orientation === 'w' ? f : 7 - f;
        const sq = (FILES[f] + (8 - r)) as Square;
        out.push({
          square: sq,
          file: displayFile,
          rank: displayRank,
          piece: cell ? (cell.color === 'w' ? cell.type.toUpperCase() : cell.type) as PieceSymbol : null,
        });
      }
    }
    return out;
  }, [board, orientation]);

  const handleTap = (sq: Square) => {
    if (!interactive || !onMove) return;
    if (!selected) {
      setSelected(sq);
      return;
    }
    if (selected === sq) {
      setSelected(null);
      return;
    }
    const uci = selected + sq;
    const ok = onMove(uci);
    setSelected(ok ? null : sq);
  };

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {squares.map(({ square, file, rank }) => {
          const isLight = (file + rank) % 2 === 1;
          const hl = highlights[square];
          let fill: string = isLight ? colors.board.light : colors.board.dark;
          if (hl === 'goodMove') fill = colors.board.goodMove;
          else if (hl === 'badMove') fill = colors.board.badMove;
          else if (selected === square) fill = colors.board.highlightTo;
          return (
            <Rect
              key={square}
              x={file * squareSize}
              y={(7 - rank) * squareSize}
              width={squareSize}
              height={squareSize}
              fill={fill}
            />
          );
        })}
      </Svg>
      <View style={StyleSheet.absoluteFill}>
        {squares.map(({ square, file, rank, piece }) => (
          <TapZone
            key={square}
            x={file * squareSize}
            y={(7 - rank) * squareSize}
            size={squareSize}
            piece={piece}
            onTap={() => handleTap(square)}
          />
        ))}
      </View>
    </View>
  );
}

function TapZone({
  x,
  y,
  size,
  piece,
  onTap,
}: {
  x: number;
  y: number;
  size: number;
  piece: PieceSymbol | null;
  onTap: () => void;
}) {
  const tap = Gesture.Tap().onEnd(() => onTap());
  return (
    <GestureDetector gesture={tap}>
      <View
        style={{
          position: 'absolute',
          left: x,
          top: y,
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {piece && (
          <Text style={{ fontSize: size * 0.7 }}>{PIECE_TO_UNICODE[piece]}</Text>
        )}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: { alignSelf: 'center' },
});
