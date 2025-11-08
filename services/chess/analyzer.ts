// Service d'analyse utilisant l'API Chess-API.com
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
  evaluation: number; // en centipawns
  depth: number;
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

interface ChessApiResponse {
  eval: number; // Évaluation en pawns (négatif = noir gagne, positif = blanc gagne)
  move: string; // Meilleur coup en LAN (Long Algebraic Notation, ex: "b7b8q")
  san?: string; // Meilleur coup en SAN (Standard Algebraic Notation, ex: "b8=Q+")
  depth: number;
  centipawns?: string; // Évaluation en centipawns (string)
  text?: string;
  type?: "move" | "bestmove" | "info";
  error?: string;
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
 * Normalise un FEN pour l'API Chess-API.com
 * L'API peut être sensible au format exact, donc on normalise :
 * - On s'assure d'avoir exactement 6 champs
 * - On nettoie les espaces
 * - On reconstruit le FEN depuis chess.js pour garantir le format
 */
const normalizeFenForApi = (fen: string): string => {
  try {
    // Recharger le FEN dans chess.js pour obtenir un format standardisé
    const tempGame = new Chess();
    tempGame.load(fen);
    // chess.js génère toujours un FEN standardisé avec 6 champs
    return tempGame.fen();
  } catch {
    // Si le FEN est invalide, on retourne l'original (sera rejeté par isValidFen)
    return fen;
  }
};

/**
 * Analyse une position avec l'API Chess-API.com (Stockfish en temps réel)
 */
export const analyzePosition = async (
  fen: string,
  depth: number = 13,
): Promise<AnalysisResult> => {
  const apiDepth = Math.min(depth, 20);

  // Valider le FEN avant d'appeler l'API
  if (!isValidFen(fen)) {
    console.error(
      `[Analyzer] FEN invalide: ${fen.substring(0, 50)}... (tronqué)`,
    );
    return { bestMove: null, evaluation: 0, depth: 0 };
  }

  // Normaliser le FEN pour l'API (format standardisé)
  const normalizedFen = normalizeFenForApi(fen);

  try {
    const response = await fetch("https://chess-api.com/v1", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        fen: normalizedFen,
        depth: apiDepth,
        variants: 1,
        maxThinkingTime: 30,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `[Analyzer] Erreur HTTP ${response.status}: ${errorText || response.statusText}`,
      );
      return { bestMove: null, evaluation: 0, depth: 0 };
    }

    const data: ChessApiResponse = await response.json();

    // Vérifier les erreurs de l'API
    if (data.error) {
      console.error(
        `[Analyzer] Erreur API: ${data.error} (FEN original: ${fen.substring(0, 50)}..., FEN normalisé: ${normalizedFen.substring(0, 50)}...)`,
      );
      return { bestMove: null, evaluation: 0, depth: 0 };
    }

    // L'API retourne l'évaluation en pawns directement (eval)
    // et le meilleur coup dans "move" (LAN) ou "san" (SAN)
    if (!data.move || data.eval === undefined) {
      console.warn("[Analyzer] Données incomplètes:", data);
      return { bestMove: null, evaluation: 0, depth: 0 };
    }

    // Utiliser SAN si disponible (plus lisible), sinon LAN
    const bestMove = data.san || data.move;

    // Convertir l'évaluation en centipawns
    const evaluationInCentipawns = Math.round(data.eval * 100);

    // Log pour débogage (peut être retiré en production)
    if (process.env.NODE_ENV === "development") {
      console.log(
        `[Analyzer] Position analysée: eval=${data.eval} pawns (${evaluationInCentipawns} cp), bestMove=${bestMove}, depth=${data.depth}`,
      );
    }

    return {
      bestMove,
      // L'évaluation est déjà en pawns, on la convertit en centipawns pour la cohérence interne
      // (même si on la reconvertira en pawns plus tard pour la DB)
      evaluation: evaluationInCentipawns,
      depth: data.depth || apiDepth,
    };
  } catch (error: any) {
    console.error("[Analyzer] Erreur analyse position:", error);
    return { bestMove: null, evaluation: 0, depth: 0 };
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
      analysisBefore = await analyzePosition(currentFen, depth);
      evalBefore = analysisBefore.evaluation;
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
      analysisAfter = await analyzePosition(fenAfter, depth);
      evalAfter = analysisAfter.evaluation;
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
            const analysisBestAfter = await analyzePosition(
              fenBestAfter,
              depth,
            );
            evalBestAfter = analysisBestAfter.evaluation;
          }
        }
      } catch {
        // Si l'analyse du meilleur coup échoue, utiliser l'approximation
        console.warn(
          `[Analyzer] Impossible d'analyser le meilleur coup pour le coup ${i + 1}`,
        );
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
