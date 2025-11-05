import { useEffect, useRef, memo, useState } from "react";
import { View, StyleSheet, Image } from "react-native";
import Chessboard, {
  type ChessboardRef,
} from "@/lib/react-native-chessboard/src";
import type { PieceType } from "@/lib/react-native-chessboard/src/types";
import type { Move } from "chess.js";

const PIECES =
  require("@/lib/react-native-chessboard/lib/commonjs/constants").PIECES;

interface ChessboardWrapperProps {
  fen?: string;
  moveHistory?: Move[];
  currentMoveIndex?: number;
  onMove?: (move: { from: string; to: string; promotion?: string }) => boolean;
  boardOrientation?: "white" | "black";
  showCoordinates?: boolean;
  lastMove?: { from: string; to: string };
  highlightSquares?: string[];
}

const ChessboardWrapperComponent = ({
  fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  moveHistory = [],
  currentMoveIndex = -1,
  onMove,
  boardOrientation = "white",
  showCoordinates = true,
  lastMove,
  highlightSquares = [],
}: ChessboardWrapperProps) => {
  const chessboardRef = useRef<ChessboardRef>(null);
  const containerRef = useRef<View>(null);
  const [boardSize, setBoardSize] = useState<number>(0);
  const initialFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  const isMountedRef = useRef(false);
  const currentFenRef = useRef<string>(fen);
  const currentIndexRef = useRef<number>(currentMoveIndex);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isNavigatingRef = useRef(false);

  // Mesurer la taille du container avec onLayout
  const handleLayout = (event: any) => {
    const { width } = event.nativeEvent.layout;
    if (width > 0 && width !== boardSize) {
      setBoardSize(width);
    }
  };

  // Initialisation après le montage
  useEffect(() => {
    if (boardSize > 0 && chessboardRef.current && !isMountedRef.current) {
      isMountedRef.current = true;
      currentFenRef.current = fen;
      currentIndexRef.current = currentMoveIndex;
      // Initialiser avec le FEN initial
      requestAnimationFrame(() => {
        if (chessboardRef.current) {
          chessboardRef.current.resetBoard(fen);
        }
      });
    }
  }, [boardSize, fen, currentMoveIndex]);

  // Navigation avec animations
  useEffect(() => {
    if (
      !isMountedRef.current ||
      !chessboardRef.current ||
      isNavigatingRef.current ||
      (fen === currentFenRef.current &&
        currentMoveIndex === currentIndexRef.current)
    ) {
      return;
    }

    // Annuler l'appel précédent s'il existe
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Debounce : attendre un peu avant d'appliquer la mise à jour
    // Utiliser requestAnimationFrame pour s'assurer qu'on n'est pas pendant le render
    requestAnimationFrame(() => {
      timeoutRef.current = setTimeout(async () => {
        if (
          !chessboardRef.current ||
          (fen === currentFenRef.current &&
            currentMoveIndex === currentIndexRef.current)
        ) {
          return;
        }

        isNavigatingRef.current = true;
        currentFenRef.current = fen;
        const previousIndex = currentIndexRef.current;
        currentIndexRef.current = currentMoveIndex;

        try {
          // Utiliser navigateToPosition pour avoir les animations quand possible
          await chessboardRef.current.navigateToPosition({
            targetFen: fen,
            moveHistory: moveHistory.length > 0 ? moveHistory : undefined,
            currentIndex: previousIndex,
            targetIndex: currentMoveIndex,
          });
        } catch (err) {
          console.error("[Chessboard] Erreur lors de la navigation:", err);
          // Fallback : utiliser resetBoard
          if (chessboardRef.current) {
            chessboardRef.current.resetBoard(fen);
          }
        } finally {
          isNavigatingRef.current = false;
        }
      }, 16); // ~1 frame à 60fps
    });

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [fen, currentMoveIndex, moveHistory]);

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
            fen={initialFen}
            gestureEnabled={!!onMove}
            visualizationMode={!onMove}
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
            durations={{ move: 20 }}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    aspectRatio: 1,
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
