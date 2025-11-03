import { useEffect, useRef, memo, useState } from "react";
import { View, StyleSheet, InteractionManager, Image } from "react-native";
import Chessboard, { type ChessboardRef } from "react-native-chessboard";
import type { PieceType } from "react-native-chessboard/lib/typescript/types";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const PIECES = require("react-native-chessboard/lib/commonjs/constants").PIECES;

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
  const containerRef = useRef<View>(null);
  const [boardSize, setBoardSize] = useState<number>(0);
  const previousFenRef = useRef<string | undefined>(undefined);

  // Mesurer la taille du container avec onLayout
  const handleLayout = (event: any) => {
    const { width } = event.nativeEvent.layout;
    if (width > 0 && width !== boardSize) {
      setBoardSize(width);
    }
  };

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
    <View ref={containerRef} style={styles.container} onLayout={handleLayout}>
      {boardSize > 0 && (
        <View
          style={[
            styles.boardWrapper,
            boardOrientation === "black" && styles.boardFlipped,
          ]}
        >
          <Chessboard
            ref={chessboardRef}
            fen={fen}
            gestureEnabled={!!onMove} // Désactiver les gestes si onMove n'est pas fourni
            // Désactiver les coordonnées quand inversé car elles seront à l'envers
            withLetters={showCoordinates && boardOrientation === "white"}
            withNumbers={showCoordinates && boardOrientation === "white"}
            boardSize={boardSize}
            // Inverser la rotation des pièces pour compenser la rotation du plateau
            renderPiece={
              boardOrientation === "black"
                ? (piece: PieceType) => {
                    const pieceSize = boardSize / 8;
                    return (
                      <Image
                        source={PIECES[piece]}
                        style={[
                          { width: pieceSize, height: pieceSize },
                          styles.pieceFlipped,
                        ]}
                      />
                    );
                  }
                : undefined
            }
            onMove={(info) => {
              if (onMove) {
                // Si le plateau est inversé, on doit inverser les coordonnées des coups
                let from = info.move.from;
                let to = info.move.to;
                if (boardOrientation === "black") {
                  // Inverser les coordonnées : a1 -> h8, h8 -> a1, etc.
                  const flipSquare = (square: string): string => {
                    const file = square[0];
                    const rank = square[1];
                    const newFile = String.fromCharCode(
                      97 + (7 - (file.charCodeAt(0) - 97)),
                    );
                    const newRank = String(8 - parseInt(rank) + 1);
                    return (newFile + newRank) as any;
                  };
                  from = flipSquare(from) as typeof from;
                  to = flipSquare(to) as typeof to;
                }
                onMove({
                  from,
                  to,
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
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    aspectRatio: 1, // Garder un ratio 1:1 pour l'échiquier
  },
  boardWrapper: {
    width: "100%",
    height: "100%",
  },
  boardFlipped: {
    transform: [{ rotate: "180deg" }],
  },
  pieceFlipped: {
    transform: [{ rotate: "180deg" }],
  },
});

// Mémoriser le composant pour éviter les re-renders inutiles
export const ChessboardWrapper = memo(ChessboardWrapperComponent);
