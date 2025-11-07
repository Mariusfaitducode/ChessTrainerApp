import type { Move } from "chess.js";

export interface MoveInfo {
  from: string;
  to: string;
  promotion?: string;
}

export interface CommonChessboardProps {
  fen: string;
  boardOrientation: "white" | "black";
  showCoordinates?: boolean;
}

export interface VisualizationModeProps extends CommonChessboardProps {
  moveHistory: Move[];
  currentMoveIndex: number;
  onNavigate?: (index: number) => void;
}

export interface ExerciseModeProps extends CommonChessboardProps {
  onMove: (move: MoveInfo) => boolean;
  highlightSquares?: string[];
}

export interface GameModeProps extends CommonChessboardProps {
  onMove: (move: MoveInfo) => void;
  moveHistory?: Move[];
  currentMoveIndex?: number;
}

