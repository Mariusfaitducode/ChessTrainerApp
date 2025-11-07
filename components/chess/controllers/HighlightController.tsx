import { useEffect, useRef } from "react";
import type { ChessboardRef } from "@/lib/react-native-chessboard/src";

interface HighlightControllerProps {
  chessboardRef: React.RefObject<ChessboardRef | null>;
  squares?: string[];
  lastMove?: { from: string; to: string };
  autoHighlightLastMove?: boolean;
}

/**
 * Controller pour gérer les highlights du plateau
 * Synchronise avec les re-renders et évite les clignotements
 */
export function useHighlightController({
  chessboardRef,
  squares = [],
  lastMove,
  autoHighlightLastMove = false,
}: HighlightControllerProps) {
  const previousSquaresRef = useRef<string>("");
  const previousLastMoveRef = useRef<string>("");

  useEffect(() => {
    if (!chessboardRef.current) {
      return;
    }

    const squaresKey = squares.join(",");
    const lastMoveKey = lastMove
      ? `${lastMove.from}-${lastMove.to}`
      : "";

    // Si rien n'a changé, ne rien faire
    if (
      squaresKey === previousSquaresRef.current &&
      lastMoveKey === previousLastMoveRef.current
    ) {
      return;
    }

    previousSquaresRef.current = squaresKey;
    previousLastMoveRef.current = lastMoveKey;

    // Réinitialiser tous les highlights
    chessboardRef.current.resetAllHighlightedSquares();

    // Appliquer les nouveaux highlights après un petit délai
    // pour éviter les clignotements
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!chessboardRef.current) {
          return;
        }

        // Highlight des squares personnalisés
        squares.forEach((square) => {
          chessboardRef.current?.highlight({
            square: square as any,
          });
        });

        // Highlight du dernier coup si demandé
        if (autoHighlightLastMove && lastMove) {
          chessboardRef.current.highlight({
            square: lastMove.from as any,
          });
          chessboardRef.current.highlight({
            square: lastMove.to as any,
          });
        }
      });
    });
  }, [squares, lastMove, autoHighlightLastMove, chessboardRef]);
}

