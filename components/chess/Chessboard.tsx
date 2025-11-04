import { useEffect, useRef, memo, useState } from "react";
import { View, StyleSheet, Image } from "react-native";
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
  // FEN initial pour l'initialisation uniquement - ne change jamais après le montage
  const [initialFen] = useState(() => fen);
  const currentFenRef = useRef<string>(fen);
  const isMountedRef = useRef(false);

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
      currentFenRef.current = initialFen;
      // Initialiser avec le FEN initial
      requestAnimationFrame(() => {
        if (chessboardRef.current) {
          chessboardRef.current.resetBoard(initialFen);
        }
      });
    }
  }, [boardSize, initialFen]);

  // Mettre à jour la position quand le FEN change (après le montage initial)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingFenRef = useRef<string | null>(null);

  useEffect(() => {
    if (
      !isMountedRef.current ||
      !chessboardRef.current ||
      fen === currentFenRef.current
    ) {
      return;
    }

    // Stocker le FEN en attente
    pendingFenRef.current = fen;

    // Annuler l'appel précédent s'il existe
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Debounce : attendre un peu avant d'appliquer la mise à jour
    // Cela évite les appels multiples rapides
    timeoutRef.current = setTimeout(() => {
      const fenToApply = pendingFenRef.current;
      if (
        fenToApply &&
        chessboardRef.current &&
        fenToApply !== currentFenRef.current
      ) {
        currentFenRef.current = fenToApply;
        pendingFenRef.current = null;

        // Utiliser double requestAnimationFrame pour s'assurer que l'appel se fait après le render complet
        // Cela évite d'accéder aux shared values Reanimated pendant le render
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (chessboardRef.current) {
              try {
                chessboardRef.current.resetBoard(fenToApply);
              } catch (err) {
                console.error("[Chessboard] Erreur lors du resetBoard:", err);
              }
            }
          });
        });
      }
    }, 16); // ~1 frame à 60fps

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
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
            fen={initialFen}
            gestureEnabled={!!onMove}
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
