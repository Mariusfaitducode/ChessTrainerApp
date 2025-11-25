// Service d'analyse via backend FastAPI + Stockfish
import type { GameAnalysis } from "@/types/games";

interface BackendGameAnalysisResponse {
  move_number: number;
  fen: string;
  evaluation: number; // En pawns
  best_move: string | null; // UCI
  played_move: string; // UCI
  move_quality: string;
  game_phase: string;
  evaluation_loss: number; // En centipawns
  evaluation_type: string; // "cp" ou "mate"
  mate_in: number | null; // Nombre de coups jusqu'au mat
}

interface BackendAnalyzeGameResponse {
  analyses: BackendGameAnalysisResponse[];
}

/**
 * Analyse complète d'une partie via le backend
 */
export const analyzeGame = async (
  pgn: string,
  options: {
    depth?: number;
    onProgress?: (current: number, total: number) => void;
  },
): Promise<GameAnalysis[]> => {
  const { depth = 13, onProgress } = options;

  const analysisApiUrl = process.env.EXPO_PUBLIC_ANALYSIS_API_URL;
  if (!analysisApiUrl) {
    throw new Error("EXPO_PUBLIC_ANALYSIS_API_URL manquant");
  }

  const endpoint = `${analysisApiUrl.replace(/\/$/, "")}/analyze-game`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pgn,
        depth,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      const error = `Erreur HTTP ${response.status}: ${errorText || response.statusText}`;
      console.error(`[Analyzer] ${error}`);
      throw new Error(error);
    }

    const data: BackendAnalyzeGameResponse = await response.json();

    // Notifier le progrès
    if (onProgress) {
      onProgress(data.analyses.length, data.analyses.length);
    }

    // Convertir les analyses du backend en format frontend
    // Note: On retourne un format compatible avec GameAnalysis mais sans les champs DB (id, created_at, etc.)
    // Ces champs seront ajoutés lors de l'insertion dans la DB
    return data.analyses.map((analysis) => {
      const result = {
        move_number: analysis.move_number,
        fen: analysis.fen,
        evaluation: analysis.evaluation, // Déjà en pawns
        best_move: analysis.best_move, // UCI
        played_move: analysis.played_move, // UCI
        move_quality: analysis.move_quality as
          | "best"
          | "excellent"
          | "good"
          | "inaccuracy"
          | "mistake"
          | "blunder"
          | "miss",
        game_phase: analysis.game_phase as "opening" | "middlegame" | "endgame",
        evaluation_loss: analysis.evaluation_loss, // En centipawns
        evaluation_type: analysis.evaluation_type || null,
        mate_in: analysis.mate_in || null,
      };
      // Log pour debug
      if (analysis.evaluation_type === "mate" || analysis.mate_in !== null) {
        console.log(
          `[Analyzer] Analyse reçue avec mat - move_number: ${result.move_number}, evaluation_type: ${result.evaluation_type}, mate_in: ${result.mate_in}`,
        );
      }
      return result;
    }) as GameAnalysis[];
  } catch (error: any) {
    console.error("[Analyzer] Erreur analyse partie:", error);
    throw error;
  }
};

/**
 * Convertit les analyses en format DB
 */
export const prepareAnalysesForInsert = (
  gameId: string,
  analyses: GameAnalysis[],
): Omit<GameAnalysis, "id" | "created_at">[] => {
  return analyses.map((analysis) => {
    const result = {
      game_id: gameId,
      move_number: analysis.move_number,
      fen: analysis.fen,
      evaluation: analysis.evaluation, // Déjà en pawns
      best_move: analysis.best_move, // UCI
      played_move: analysis.played_move, // UCI
      move_quality: analysis.move_quality,
      game_phase: analysis.game_phase,
      evaluation_loss: analysis.evaluation_loss, // En centipawns
      evaluation_type: analysis.evaluation_type || null,
      mate_in: analysis.mate_in || null,
      analysis_data: null,
    };
    // Log pour debug
    if (analysis.evaluation_type === "mate" || analysis.mate_in !== null) {
      console.log(
        `[Analyzer] Analyse avec mat - move_number: ${analysis.move_number}, evaluation_type: ${analysis.evaluation_type}, mate_in: ${analysis.mate_in}`,
      );
    }
    return result;
  });
};

interface ClassifyMoveResponse {
  move_quality:
    | "best"
    | "excellent"
    | "good"
    | "inaccuracy"
    | "mistake"
    | "blunder";
  evaluation_loss: number; // En centipawns
  best_move: string | null; // UCI - meilleur coup dans la position initiale
  opponent_best_move: string | null; // UCI - meilleur coup de l'adversaire après le coup joué
  evaluation_before: number; // En pawns
  evaluation_after: number; // En pawns
  evaluation_type_after: "cp" | "mate"; // Type d'évaluation après le coup
  mate_in_after: number | null; // Nombre de coups jusqu'au mat (si evaluation_type_after === "mate")
}

/**
 * Classifie un coup joué dans une position
 */
export const classifyMove = async (
  fen: string,
  moveUci: string,
  depth: number = 13,
): Promise<ClassifyMoveResponse> => {
  const analysisApiUrl = process.env.EXPO_PUBLIC_ANALYSIS_API_URL;
  if (!analysisApiUrl) {
    throw new Error("EXPO_PUBLIC_ANALYSIS_API_URL manquant");
  }

  const endpoint = `${analysisApiUrl.replace(/\/$/, "")}/classify-move`;

  try {
    const requestBody = {
      fen,
      move_uci: moveUci,
      depth,
    };

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      const error = `Erreur HTTP ${response.status}: ${errorText || response.statusText}`;
      console.error(`[Analyzer] ${error}`);
      throw new Error(error);
    }

    const data: ClassifyMoveResponse = await response.json();
    return data;
  } catch (error: any) {
    console.error("[Analyzer] Erreur classification coup:", error);
    throw error;
  }
};
