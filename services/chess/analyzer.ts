// Service d'analyse via backend FastAPI + Stockfish
import { Chess } from "chess.js";
import type { GameAnalysis } from "@/types/games";
import {
  classifyMove,
  type MoveQuality,
  type GamePhase,
} from "./move-classification";
import { compareMoves } from "./move-comparison";

interface AnalysisResult {
  bestMove: string | null;
  evaluation: number; // en centipawns (du point de vue des blancs)
  depth: number;
  mateIn?: number | null;
}

interface PositionAnalysis {
  fen: string;
  moveNumber: number;
  playedMove: string;
  bestMove: string | null;
  evaluation: number;
  moveQuality: MoveQuality;
  gamePhase: GamePhase;
  evaluationLoss: number;
}

interface BackendAnalysisResponse {
  best_move: string | null; // Toujours en SAN maintenant
  best_move_uci: string | null; // UCI pour référence
  evaluation: number;
  evaluation_type: "cp" | "mate";
  depth: number;
  mate_in?: number | null;
  nodes?: number;
  analysis_time_ms?: number;
  error?: string;
  detail?: string;
}

/**
 * Valide un FEN en essayant de le charger dans chess.js
 */
const isValidFen = (fen: string): boolean => {
  try {
    const tempGame = new Chess();
    tempGame.load(fen);
    return true;
  } catch {
    return false;
  }
};

/**
 * Normalise un FEN pour l'analyse
 * - On s'assure d'avoir exactement 6 champs
 * - On nettoie les espaces
 * - On reconstruit le FEN depuis chess.js pour garantir le format
 */
const normalizeFenForAnalysis = (fen: string): string => {
  try {
    const tempGame = new Chess();
    tempGame.load(fen);
    return tempGame.fen();
  } catch {
    return fen;
  }
};

// convertEngineMoveToSan supprimé - le backend retourne maintenant toujours SAN

/**
 * Analyse une position via le backend FastAPI (Stockfish natif)
 */
export const analyzePosition = async (
  fen: string,
  depth: number = 13,
): Promise<AnalysisResult> => {
  // Depth fixe à 13 comme demandé
  const apiDepth = 13;

  if (!isValidFen(fen)) {
    const error = `FEN invalide: ${fen.substring(0, 50)}...`;
    console.error(`[Analyzer] ${error}`);
    throw new Error(error);
  }

  const normalizedFen = normalizeFenForAnalysis(fen);
  const analysisApiUrl = process.env.EXPO_PUBLIC_ANALYSIS_API_URL;

  if (!analysisApiUrl) {
    const error = "EXPO_PUBLIC_ANALYSIS_API_URL manquant";
    console.error(`[Analyzer] ${error}`);
    throw new Error(error);
  }

  const endpoint = `${analysisApiUrl.replace(/\/$/, "")}/analyze-position`;

  console.log(
    `[Analyzer] Envoi requête à ${endpoint} - FEN: ${normalizedFen.substring(0, 50)}..., depth: ${apiDepth}`,
  );

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fen: normalizedFen,
        depth: apiDepth,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      const error = `Erreur HTTP ${response.status}: ${errorText || response.statusText}`;
      console.error(`[Analyzer] ${error}`);
      throw new Error(error);
    }

    const data: BackendAnalysisResponse = await response.json();

    // Gestion des erreurs applicatives
    if (data.error || data.detail) {
      const error = `Erreur backend: ${data.error || data.detail}`;
      console.error(`[Analyzer] ${error} (FEN: ${fen.substring(0, 50)}...)`);
      throw new Error(error);
    }

    // Le backend retourne déjà best_move en SAN (plus besoin de conversion)
    const bestMoveSan = data.best_move;

    // Convertir l'évaluation en centipawns utilisables
    let evaluation = Math.round(data.evaluation ?? 0);
    let mateIn = data.mate_in ?? null;

    if (data.evaluation_type === "mate") {
      if (typeof mateIn === "number" && mateIn !== 0) {
        const sign = mateIn > 0 ? 1 : -1;
        // Utiliser une valeur très élevée pour représenter un mate imminent
        evaluation = sign * (100000 - Math.min(Math.abs(mateIn), 100) * 10);
      } else {
        // Valeur par défaut si mate sans mate_in
        evaluation = data.evaluation >= 0 ? 100000 : -100000;
      }
    }

    if (
      typeof __DEV__ !== "undefined"
        ? __DEV__
        : process.env.NODE_ENV !== "production"
    ) {
      console.log(
        `[Analyzer] Backend: eval=${evaluation} cp (type=${data.evaluation_type}), bestMove=${bestMoveSan}, depth=${data.depth}, mateIn=${mateIn}`,
      );
    }

    return {
      bestMove: bestMoveSan,
      evaluation,
      depth: data.depth ?? apiDepth,
      mateIn,
    };
  } catch (error: any) {
    console.error("[Analyzer] Erreur analyse position:", error);
    // Arrêter l'analyse en cas d'erreur (throw au lieu de retourner un résultat vide)
    throw error;
  }
};

// classifyMistake a été remplacé par classifyMove dans move-classification.ts
// Cette fonction est conservée pour compatibilité mais ne devrait plus être utilisée

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
    const isWhiteMove = i % 2 === 0;

    // Vérifier que le FEN avant est valide
    if (!isValidFen(currentFen)) {
      console.error(
        `[Analyzer] FEN invalide avant le coup ${i + 1}: ${currentFen.substring(0, 50)}...`,
      );
      // Continuer avec le coup suivant
      continue;
    }

    // Vérifier si la partie est terminée (checkmate/stalemate)
    // Dans ce cas, on peut utiliser une évaluation par défaut
    const isGameOver =
      tempGame.isCheckmate() || tempGame.isStalemate() || tempGame.isDraw();

    // Analyser la position AVANT le coup
    let analysisBefore: AnalysisResult;
    let evalBefore: number;

    if (isGameOver) {
      // Pour les positions terminées, utiliser une évaluation par défaut
      // Checkmate = très grande évaluation, Stalemate/Draw = 0
      if (tempGame.isCheckmate()) {
        evalBefore = tempGame.turn() === "w" ? -10000 : 10000; // Le joueur qui doit jouer est mat
      } else {
        evalBefore = 0; // Stalemate ou draw
      }
      analysisBefore = { bestMove: null, evaluation: evalBefore, depth: 0 };
    } else {
      try {
        analysisBefore = await analyzePosition(currentFen, depth);
        evalBefore = analysisBefore.evaluation;
      } catch (error: any) {
        console.error(
          `[Analyzer] Erreur analyse position avant coup ${i + 1}:`,
          error,
        );
        // Arrêter l'analyse en cas d'erreur
        throw new Error(
          `Erreur lors de l'analyse du coup ${i + 1}: ${error.message || error}`,
        );
      }
    }

    // Jouer le coup
    try {
      tempGame.move(move);
    } catch (error: any) {
      console.error(
        `[Analyzer] Erreur lors du coup ${i + 1} (${move.san}):`,
        error,
      );
      // Continuer avec le coup suivant
      continue;
    }

    const playedMoveSan = move.san;
    const fenAfter = tempGame.fen();

    // Vérifier que le FEN après est valide
    if (!isValidFen(fenAfter)) {
      console.error(
        `[Analyzer] FEN invalide après le coup ${i + 1}: ${fenAfter.substring(0, 50)}...`,
      );
      // Continuer avec le coup suivant
      continue;
    }

    // Vérifier si la partie est terminée après ce coup
    const isGameOverAfter =
      tempGame.isCheckmate() || tempGame.isStalemate() || tempGame.isDraw();

    // Analyser la position APRÈS le coup joué
    let analysisAfter: AnalysisResult;
    let evalAfter: number;

    if (isGameOverAfter) {
      // Pour les positions terminées, utiliser une évaluation par défaut
      if (tempGame.isCheckmate()) {
        evalAfter = tempGame.turn() === "w" ? -10000 : 10000; // Le joueur qui doit jouer est mat
      } else {
        evalAfter = 0; // Stalemate ou draw
      }
      analysisAfter = { bestMove: null, evaluation: evalAfter, depth: 0 };
    } else {
      try {
        analysisAfter = await analyzePosition(fenAfter, depth);
        evalAfter = analysisAfter.evaluation;
      } catch (error: any) {
        console.error(
          `[Analyzer] Erreur analyse position après coup ${i + 1}:`,
          error,
        );
        // Arrêter l'analyse en cas d'erreur
        throw new Error(
          `Erreur lors de l'analyse du coup ${i + 1}: ${error.message || error}`,
        );
      }
    }

    // Calculer l'évaluation après le meilleur coup (pour comparaison précise)
    // Si bestMove existe et est différent du coup joué, analyser la position après le meilleur coup
    let evalBestAfter: number | null = null;
    if (
      analysisBefore.bestMove &&
      !compareMoves(playedMoveSan, analysisBefore.bestMove, currentFen)
    ) {
      try {
        const tempGameForBest = new Chess(currentFen);
        const bestMoveObj = tempGameForBest.move(analysisBefore.bestMove);
        if (bestMoveObj) {
          const fenBestAfter = tempGameForBest.fen();
          if (
            !tempGameForBest.isCheckmate() &&
            !tempGameForBest.isStalemate() &&
            !tempGameForBest.isDraw()
          ) {
            try {
              const analysisBestAfter = await analyzePosition(
                fenBestAfter,
                depth,
              );
              evalBestAfter = analysisBestAfter.evaluation;
            } catch (error: any) {
              // Si l'analyse du meilleur coup échoue, arrêter l'analyse
              console.error(
                `[Analyzer] Erreur analyse meilleur coup pour le coup ${i + 1}:`,
                error,
              );
              throw new Error(
                `Erreur lors de l'analyse du meilleur coup pour le coup ${i + 1}: ${error.message || error}`,
              );
            }
          }
        }
      } catch (error: any) {
        // Si erreur lors de la préparation de l'analyse du meilleur coup, arrêter
        console.error(
          `[Analyzer] Erreur préparation analyse meilleur coup pour le coup ${i + 1}:`,
          error,
        );
        throw error;
      }
    }

    // Classifier le coup de manière complète
    const classification = classifyMove(
      evalBefore,
      evalAfter,
      evalBestAfter,
      isWhiteMove,
      playedMoveSan,
      analysisBefore.bestMove,
      currentFen,
      i + 1,
    );

    analyses.push({
      fen: currentFen,
      moveNumber: i + 1,
      playedMove: playedMoveSan,
      bestMove: analysisBefore.bestMove,
      // On stocke l'évaluation APRÈS le coup (position actuelle)
      evaluation: evalAfter,
      moveQuality: classification.move_quality,
      gamePhase: classification.game_phase,
      evaluationLoss: classification.evaluation_loss,
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
    move_quality: analysis.moveQuality,
    game_phase: analysis.gamePhase,
    evaluation_loss: analysis.evaluationLoss,
    analysis_data: null,
  }));
};
