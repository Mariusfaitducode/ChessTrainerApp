import React, { useRef } from "react";
import { ChessboardCore } from "../core/ChessboardCore";
import { useInteractionController } from "../controllers/InteractionController";
import { useNavigationController } from "../controllers/NavigationController";
import { useHighlightController } from "../controllers/HighlightController";
import type { GameModeProps } from "./types";
import type { ChessboardRef } from "@/lib/react-native-chessboard/src";

export function GameMode({
  fen,
  onMove,
  moveHistory = [],
  currentMoveIndex = -1,
  boardOrientation,
  showCoordinates = true,
}: GameModeProps) {
  const chessboardRef = useRef<ChessboardRef | null>(null);

  // Interaction controller - gère les interactions pour jouer
  const { gestureEnabled, onMove: handleMove } = useInteractionController({
    onMove,
    enabled: true,
  });

  // Navigation controller - gère la navigation dans l'historique
  useNavigationController({
    chessboardRef,
    moveHistory,
    currentIndex: currentMoveIndex,
    targetFen: fen,
    enabled: moveHistory.length > 0,
  });

  // Highlight controller - highlights automatiques + personnalisés
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

