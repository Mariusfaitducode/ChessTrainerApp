import { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from "react-native";

import { colors, borders, shadows } from "@/theme";

interface ChessboardSimpleProps {
  fen: string;
  boardOrientation?: "white" | "black";
  onSquarePress?: (square: string) => void;
  highlightSquares?: string[];
  lastMove?: { from: string; to: string };
}

/**
 * Échiquier simple basé sur le FEN
 * Affiche les pièces avec des emojis Unicode
 */
export const ChessboardSimple = ({
  fen,
  boardOrientation = "white",
  onSquarePress,
  highlightSquares = [],
  lastMove,
}: ChessboardSimpleProps) => {
  const boardSize = Math.min(Dimensions.get("window").width - 32, 400);
  const squareSize = boardSize / 8;

  // Parser le FEN pour obtenir la position
  const board = useMemo(() => {
    const [position] = fen.split(" ");
    const rows = position.split("/");
    const squares: { piece: string; square: string }[][] = [];

    for (let row = 0; row < 8; row++) {
      const rowSquares: { piece: string; square: string }[] = [];
      let col = 0;
      for (const char of rows[row]) {
        if (/\d/.test(char)) {
          // Nombre = cases vides
          for (let i = 0; i < parseInt(char); i++) {
            const square = String.fromCharCode(97 + col) + (8 - row);
            rowSquares.push({ piece: "", square });
            col++;
          }
        } else {
          // Pièce
          const square = String.fromCharCode(97 + col) + (8 - row);
          rowSquares.push({ piece: char, square });
          col++;
        }
      }
      squares.push(rowSquares);
    }

    return boardOrientation === "white" ? squares : [...squares].reverse();
  }, [fen, boardOrientation]);

  const getPieceEmoji = (piece: string): string => {
    const pieces: Record<string, string> = {
      P: "♙",
      R: "♖",
      N: "♘",
      B: "♗",
      Q: "♕",
      K: "♔",
      p: "♟",
      r: "♜",
      n: "♞",
      b: "♝",
      q: "♛",
      k: "♚",
    };
    return pieces[piece] || "";
  };

  const isSquareHighlighted = (square: string): boolean => {
    return highlightSquares.includes(square);
  };

  const isLastMoveSquare = (square: string): boolean => {
    return lastMove?.from === square || lastMove?.to === square;
  };

  const getSquareColor = (row: number, col: number, square: string): string => {
    if (isSquareHighlighted(square)) {
      return colors.success.light;
    }
    if (isLastMoveSquare(square)) {
      return colors.warning.light;
    }
    return (row + col) % 2 === 0 ? "#F0D9B5" : "#B58863";
  };

  return (
    <View style={[styles.container, { width: boardSize, height: boardSize }]}>
      {board.map((row, rowIndex) =>
        row.map(({ piece, square }, colIndex) => {
          const squareColor = getSquareColor(
            boardOrientation === "white" ? rowIndex : 7 - rowIndex,
            boardOrientation === "white" ? colIndex : 7 - colIndex,
            square,
          );

          return (
            <TouchableOpacity
              key={`${rowIndex}-${colIndex}`}
              style={[
                styles.square,
                {
                  width: squareSize,
                  height: squareSize,
                  backgroundColor: squareColor,
                },
              ]}
              onPress={() => onSquarePress?.(square)}
              activeOpacity={0.7}
            >
              <Text style={styles.piece}>{getPieceEmoji(piece)}</Text>
            </TouchableOpacity>
          );
        }),
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderWidth: borders.width.medium,
    borderColor: colors.accent[400],
    borderRadius: borders.radius.lg,
    overflow: "hidden",
    ...shadows.md,
  },
  square: {
    justifyContent: "center",
    alignItems: "center",
  },
  piece: {
    fontSize: 32,
  },
});
