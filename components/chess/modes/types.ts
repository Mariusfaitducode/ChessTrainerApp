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
  previousFen?: string; // FEN de la position précédente pour synchroniser le chess engine
  onNavigate?: (index: number) => void;
}

export interface ExerciseModeProps extends CommonChessboardProps {
  onMove: (move: MoveInfo) => boolean | Promise<boolean>;
  highlightSquares?: string[];
  onRefReady?: (ref: any) => void;
}

export interface GameModeProps extends CommonChessboardProps {
  onMove: (move: MoveInfo) => void;
  moveHistory?: Move[];
  currentMoveIndex?: number;
}
