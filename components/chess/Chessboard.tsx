import { useEffect, useRef } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import Chessboard, { type ChessboardRef } from "react-native-chessboard";

interface ChessboardWrapperProps {
  fen?: string;
  onMove?: (move: { from: string; to: string; promotion?: string }) => boolean;
  boardOrientation?: "white" | "black";
  showCoordinates?: boolean;
  lastMove?: { from: string; to: string };
  highlightSquares?: string[];
}

export const ChessboardWrapper = ({
  fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  onMove,
  boardOrientation = "white",
  showCoordinates = true,
  lastMove,
  highlightSquares = [],
}: ChessboardWrapperProps) => {
  const chessboardRef = useRef<ChessboardRef>(null);
  const boardSize = Math.min(Dimensions.get("window").width - 32, 400);

  // Mettre à jour la position quand le FEN change
  // Note: react-native-chessboard gère automatiquement le highlight du dernier coup
  useEffect(() => {
    if (chessboardRef.current && fen) {
      chessboardRef.current.resetBoard(fen);
    }
  }, [fen]);

  // Highlight des cases spécifiées (si nécessaire)
  useEffect(() => {
    if (chessboardRef.current) {
      // Réinitialiser d'abord
      chessboardRef.current.resetAllHighlightedSquares();

      // Highlight du dernier coup (react-native-chessboard le fait déjà automatiquement)
      // On peut ajouter d'autres highlights si nécessaire
      if (highlightSquares.length > 0) {
        highlightSquares.forEach((square) => {
          chessboardRef.current?.highlight({
            square: square as any,
          });
        });
      }
    }
  }, [highlightSquares]);

  return (
    <View style={styles.container}>
      <Chessboard
        ref={chessboardRef}
        fen={fen}
        gestureEnabled={!!onMove} // Désactiver les gestes si onMove n'est pas fourni
        withLetters={showCoordinates}
        withNumbers={showCoordinates}
        boardSize={boardSize}
        onMove={(info) => {
          if (onMove) {
            onMove({
              from: info.move.from,
              to: info.move.to,
              promotion: info.move.promotion,
            });
            // Note: react-native-chessboard gère automatiquement la validation des coups
            // Si le coup est invalide, il ne sera pas joué
          }
        }}
        colors={{
          black: "#B58863",
          white: "#F0D9B5",
          lastMoveHighlight: "rgba(255, 255, 0, 0.4)",
        }}
        durations={{ move: 150 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 16,
  },
});
