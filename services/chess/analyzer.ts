// Service d'analyse utilisant l'API Chess-API.com
import { Chess } from "chess.js";
import type { GameAnalysis } from "@/types/games";
import type { MistakeLevel } from "@/types/chess";

interface AnalysisResult {
  bestMove: string | null;
  evaluation: number; // en centipawns
  depth: number;
}

interface PositionAnalysis {
  fen: string;
  moveNumber: number;
  playedMove: string;
  bestMove: string | null;
  evaluation: number;
  mistakeLevel: MistakeLevel;
}

interface ChessApiResponse {
  evaluation: number;
  bestMove: string;
  depth: number;
}

/**
 * Analyse une position avec l'API Chess-API.com (Stockfish en temps réel)
 */
export const analyzePosition = async (
  fen: string,
  depth: number = 13,
): Promise<AnalysisResult> => {
  const apiDepth = Math.min(depth, 20);

  try {
    const response = await fetch("https://chess-api.com/v1", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        fen,
        depth: apiDepth,
        variants: 1,
        maxThinkingTime: 30,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Erreur API: ${response.status} ${errorText || response.statusText}`,
      );
    }

    const data: ChessApiResponse = await response.json();

    if (!data.bestMove || data.evaluation === undefined) {
      return { bestMove: null, evaluation: 0, depth: 0 };
    }

    return {
      bestMove: data.bestMove,
      evaluation: data.evaluation,
      depth: data.depth || apiDepth,
    };
  } catch (error: any) {
    console.error("[Analyzer] Erreur analyse position:", error);
    return { bestMove: null, evaluation: 0, depth: 0 };
  }
};

/**
 * Détermine le niveau d'erreur en comparant le coup joué au meilleur coup
 * TODO: Implémenter la comparaison réelle
 */
const classifyMistake = (
  _playedEval: number,
  _bestEval: number,
  _isWhite: boolean,
): MistakeLevel => {
  return null;
};

/**
 * Analyse tous les coups d'une partie
 */
export const analyzeGame = async (
  pgn: string,
  options: {
    depth?: number;
    onProgress?: (current: number, total: number) => void;
  },
): Promise<PositionAnalysis[]> => {
  const { depth = 13, onProgress } = options;

  const game = new Chess();
  try {
    game.loadPgn(pgn);
  } catch (error) {
    console.error("[Analyzer] Erreur chargement PGN:", error);
    throw new Error("PGN invalide");
  }

  const history = game.history({ verbose: true });
  const analyses: PositionAnalysis[] = [];
  const tempGame = new Chess();

  for (let i = 0; i < history.length; i++) {
    const move = history[i];
    const currentFen = tempGame.fen();
    const analysis = await analyzePosition(currentFen, depth);

    tempGame.move(move);
    const playedMoveSan = move.san;

    analyses.push({
      fen: currentFen,
      moveNumber: i + 1,
      playedMove: playedMoveSan,
      bestMove: analysis.bestMove,
      evaluation: analysis.evaluation,
      mistakeLevel: classifyMistake(
        analysis.evaluation,
        analysis.evaluation,
        i % 2 === 0,
      ),
    });

    onProgress?.(i + 1, history.length);
  }

  return analyses;
};

/**
 * Convertit les analyses en format DB
 */
export const prepareAnalysesForInsert = (
  gameId: string,
  analyses: PositionAnalysis[],
): Omit<GameAnalysis, "id" | "created_at">[] => {
  return analyses.map((analysis) => ({
    game_id: gameId,
    move_number: analysis.moveNumber,
    fen: analysis.fen,
    evaluation: analysis.evaluation / 100, // centipawns → pawns
    best_move: analysis.bestMove,
    played_move: analysis.playedMove,
    mistake_level: analysis.mistakeLevel,
    analysis_data: null,
  }));
};
