import React from "react";
import { VisualizationMode } from "./modes/VisualizationMode";
import { ExerciseMode } from "./modes/ExerciseMode";
import { GameMode } from "./modes/GameMode";
import type {
  VisualizationModeProps,
  ExerciseModeProps,
  GameModeProps,
} from "./modes/types";

// Types discriminants pour les props par mode
type ChessboardProps =
  | ({
      mode: "visualization";
    } & VisualizationModeProps)
  | ({
      mode: "exercise";
    } & ExerciseModeProps)
  | ({
      mode: "game";
    } & GameModeProps);

/**
 * Composant Chessboard principal - orchestrateur des différents modes
 *
 * @example
 * // Mode visualization
 * <Chessboard
 *   mode="visualization"
 *   fen={currentFen}
 *   moveHistory={moveHistory}
 *   currentMoveIndex={currentMoveIndex}
 *   boardOrientation="white"
 * />
 *
 * @example
 * // Mode exercise
 * <Chessboard
 *   mode="exercise"
 *   fen={exercise.fen}
 *   onMove={handleMove}
 *   highlightSquares={selectedSquares}
 *   boardOrientation="white"
 * />
 *
 * @example
 * // Mode game
 * <Chessboard
 *   mode="game"
 *   fen={currentFen}
 *   onMove={handleMove}
 *   moveHistory={moveHistory}
 *   currentMoveIndex={currentMoveIndex}
 *   boardOrientation="white"
 * />
 */
export function Chessboard(props: ChessboardProps) {
  switch (props.mode) {
    case "visualization":
      return <VisualizationMode {...props} />;
    case "exercise":
      return <ExerciseMode {...props} />;
    case "game":
      return <GameMode {...props} />;
    default:
      // TypeScript devrait empêcher ce cas, mais on le gère pour la sécurité
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _exhaustive: never = props;
      return null;
  }
}

// Export des types pour faciliter l'utilisation
export type { ChessboardProps };
export type {
  VisualizationModeProps,
  ExerciseModeProps,
  GameModeProps,
} from "./modes/types";
