import React, { useRef } from "react";
import { ChessboardCore } from "../core/ChessboardCore";
import { useInteractionController } from "../controllers/InteractionController";
import { useHighlightController } from "../controllers/HighlightController";
import type { ExerciseModeProps } from "./types";
import type { ChessboardRef } from "@/components/chess/react-native-chessboard/src";

export function ExerciseMode({
  fen,
  onMove,
  highlightSquares = [],
  boardOrientation,
  showCoordinates = true,
}: ExerciseModeProps) {
  const chessboardRef = useRef<ChessboardRef | null>(null);

  // Interaction controller - gère les interactions et validations
  const { gestureEnabled, onMove: handleMove } = useInteractionController({
    onMove,
    enabled: true,
  });

  // Highlight controller - highlights personnalisés (squares sélectionnées)
  useHighlightController({
    chessboardRef,
    squares: highlightSquares,
    autoHighlightLastMove: false,
  });

  return (
    <ChessboardCore
      ref={chessboardRef}
      fen={fen}
      boardOrientation={boardOrientation}
      showCoordinates={showCoordinates}
      gestureEnabled={gestureEnabled}
      onMove={handleMove}
      onRefReady={(ref) => {
        // S'assurer que le ref est bien mis à jour
        if (ref) {
          chessboardRef.current = ref;
        }
      }}
    />
  );
}
