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

  console.log(
    `[Analyzer] Envoi requête analyse partie à ${endpoint} - depth: ${depth}`,
  );

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
    return data.analyses.map((analysis) => ({
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
        | "blunder",
      game_phase: analysis.game_phase as "opening" | "middlegame" | "endgame",
      evaluation_loss: analysis.evaluation_loss, // En centipawns
    })) as GameAnalysis[];
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
  return analyses.map((analysis) => ({
    game_id: gameId,
    move_number: analysis.move_number,
    fen: analysis.fen,
    evaluation: analysis.evaluation, // Déjà en pawns
    best_move: analysis.best_move, // UCI
    played_move: analysis.played_move, // UCI
    move_quality: analysis.move_quality,
    game_phase: analysis.game_phase,
    evaluation_loss: analysis.evaluation_loss, // En centipawns
    analysis_data: null,
  }));
};
