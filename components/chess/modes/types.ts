import type { Move } from "chess.js";
import type { GameAnalysis } from "@/types/database";

export interface MoveInfo {
  from: string;
  to: string;
  promotion?: string;
}

export interface CommonChessboardProps {
  fen: string;
  boardOrientation: "white" | "black";
  showCoordinates?: boolean;
  analysisData?: GameAnalysis | null;
  showBestMoveArrow?: boolean;
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
  lastMove?: { from: string; to: string } | null;
}

export interface GameModeProps extends CommonChessboardProps {
  onMove: (move: MoveInfo) => void;
  moveHistory?: Move[];
  currentMoveIndex?: number;
}
