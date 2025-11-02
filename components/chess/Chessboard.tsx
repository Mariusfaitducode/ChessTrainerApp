import { useEffect, useRef, memo } from "react";
import { View, StyleSheet, Dimensions, InteractionManager } from "react-native";
import Chessboard, { type ChessboardRef } from "react-native-chessboard";

interface ChessboardWrapperProps {
  fen?: string;
  onMove?: (move: { from: string; to: string; promotion?: string }) => boolean;
  boardOrientation?: "white" | "black";
  showCoordinates?: boolean;
  lastMove?: { from: string; to: string };
  highlightSquares?: string[];
}

const ChessboardWrapperComponent = ({
  fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  onMove,
  boardOrientation = "white",
  showCoordinates = true,
  lastMove,
  highlightSquares = [],
}: ChessboardWrapperProps) => {
  const chessboardRef = useRef<ChessboardRef>(null);
  const boardSize = Math.min(Dimensions.get("window").width - 32, 400);
  const previousFenRef = useRef<string | undefined>(undefined);

  // Mettre à jour la position quand le FEN change
  // Utiliser requestAnimationFrame pour éviter les warnings Reanimated
  useEffect(() => {
    if (chessboardRef.current && fen && fen !== previousFenRef.current) {
      const startTime = performance.now();
      const isFirstRender = previousFenRef.current === undefined;

      const updateBoard = () => {
        if (chessboardRef.current) {
          try {
            // Appeler directement resetBoard sans double wrapping
            // react-native-chessboard gère déjà les animations en interne
            chessboardRef.current.resetBoard(fen);
            const resetTime = performance.now() - startTime;
            if (resetTime > 100) {
              // Logger seulement si > 100ms pour éviter le spam
              console.log(`[Chessboard] resetBoard terminé en ${resetTime}ms`);
            }
            previousFenRef.current = fen;
          } catch (err) {
            console.error("[Chessboard] Erreur lors du resetBoard:", err);
          }
        }
      };

      // Différer légèrement pour permettre au composant de se rendre d'abord
      // Mais pas trop pour éviter la latence
      if (isFirstRender) {
        // Premier render: utiliser queueMicrotask pour être rapide
        queueMicrotask(updateBoard);
      } else {
        // Updates suivants: utiliser InteractionManager seulement si nécessaire
        // Sinon updateBoard directement pour plus de vitesse
        if (InteractionManager.runAfterInteractions) {
          InteractionManager.runAfterInteractions(updateBoard);
        } else {
          queueMicrotask(updateBoard);
        }
      }
    }
  }, [fen]);

  // Highlight des cases spécifiées (si nécessaire) - seulement si highlightSquares change
  const previousHighlightSquaresRef = useRef<string>("");
  useEffect(() => {
    const highlightKey = highlightSquares.join(",");
    if (
      chessboardRef.current &&
      highlightKey !== previousHighlightSquaresRef.current
    ) {
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
      previousHighlightSquaresRef.current = highlightKey;
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

// Mémoriser le composant pour éviter les re-renders inutiles
export const ChessboardWrapper = memo(ChessboardWrapperComponent);
