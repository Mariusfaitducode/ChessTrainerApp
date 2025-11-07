import React, { useRef } from "react";
import { ChessboardCore } from "../core/ChessboardCore";
import { useNavigationController } from "../controllers/NavigationController";
import { useHighlightController } from "../controllers/HighlightController";
import type { VisualizationModeProps } from "./types";
import type { ChessboardRef } from "@/lib/react-native-chessboard/src";

export function VisualizationMode({
  fen,
  moveHistory,
  currentMoveIndex,
  boardOrientation,
  showCoordinates = true,
}: VisualizationModeProps) {
  const chessboardRef = useRef<ChessboardRef | null>(null);

  // Navigation controller - gère la navigation dans l'historique
  useNavigationController({
    chessboardRef,
    moveHistory,
    currentIndex: currentMoveIndex,
    targetFen: fen,
    enabled: true,
  });

  // Highlight controller - highlight automatique du dernier coup
  const lastMove =
    currentMoveIndex >= 0 && moveHistory[currentMoveIndex]
      ? {
          from: moveHistory[currentMoveIndex].from,
          to: moveHistory[currentMoveIndex].to,
        }
      : undefined;

  useHighlightController({
    chessboardRef,
    lastMove,
    autoHighlightLastMove: true,
  });

  return (
    <ChessboardCore
      ref={chessboardRef}
      fen={fen}
      boardOrientation={boardOrientation}
      showCoordinates={showCoordinates}
      gestureEnabled={false}
      onRefReady={(ref) => {
        // S'assurer que le ref est bien mis à jour
        if (ref) {
          chessboardRef.current = ref;
        }
      }}
    />
  );
}

