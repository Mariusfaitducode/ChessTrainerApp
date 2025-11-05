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
      console.error(
        `[Analyzer] Erreur HTTP ${response.status}: ${errorText || response.statusText}`,
      );
      return { bestMove: null, evaluation: 0, depth: 0 };
    }

    const data: ChessApiResponse = await response.json();

    // Vérifier les erreurs de l'API
    if (data.error) {
      console.error(
        `[Analyzer] Erreur API: ${data.error} (FEN: ${fen.substring(0, 50)}...)`,
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

/**
 * Détermine le niveau d'erreur en comparant l'évaluation avant et après le coup
 *
 * @param evalBefore Évaluation avant le coup (en centipawns, du point de vue du joueur qui joue)
 * @param evalAfter Évaluation après le coup joué (en centipawns, du point de vue du joueur qui vient de jouer)
 * @param isWhite True si c'est le joueur blanc qui a joué
 *
 * Seuils typiques (en centipawns):
 * - Blunder: perte > 200 centipawns (2 pawns)
 * - Mistake: perte entre 100-200 centipawns (1-2 pawns)
 * - Inaccuracy: perte entre 50-100 centipawns (0.5-1 pawn)
 */
const classifyMistake = (
  evalBefore: number,
  evalAfter: number,
  isWhite: boolean,
): MistakeLevel => {
  // Si pas d'évaluation, on ne peut pas classifier
  if (evalBefore === 0 && evalAfter === 0) {
    return null;
  }

  // L'API retourne toujours l'évaluation du point de vue des blancs
  // (positif = avantage blanc, négatif = avantage noir)
  //
  // Pour calculer la perte du point de vue du joueur qui vient de jouer :
  // - Avant le coup : évaluation du point de vue du joueur qui va jouer
  // - Après le coup : évaluation du point de vue de l'adversaire (inversée)
  //
  // Pour blanc : perte = evalBefore - (-evalAfter) = evalBefore + evalAfter
  // Pour noir : perte = (-evalBefore) - (-evalAfter) = evalAfter - evalBefore
  const loss = isWhite
    ? evalBefore + evalAfter // Blanc : avant + après (inversé)
    : evalAfter - evalBefore; // Noir : après - avant (inversés)

  // Si la perte est négative ou nulle, le coup n'a pas empiré la position
  if (loss <= 0) {
    return null;
  }

  // Classifier selon la perte (en centipawns)
  if (loss > 200) {
    return "blunder"; // Perte > 2 pawns
  } else if (loss > 100) {
    return "mistake"; // Perte entre 1-2 pawns
  } else if (loss > 50) {
    return "inaccuracy"; // Perte entre 0.5-1 pawn
  }

  // Perte < 50 centipawns, pas une erreur significative
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
    const isWhiteMove = i % 2 === 0;

    // Vérifier que le FEN avant est valide
    if (!isValidFen(currentFen)) {
      console.error(
        `[Analyzer] FEN invalide avant le coup ${i + 1}: ${currentFen.substring(0, 50)}...`,
      );
      // Continuer avec le coup suivant
      continue;
    }

    // Analyser la position AVANT le coup
    const analysisBefore = await analyzePosition(currentFen, depth);
    const evalBefore = analysisBefore.evaluation;

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

    // Analyser la position APRÈS le coup joué
    const analysisAfter = await analyzePosition(fenAfter, depth);
    const evalAfter = analysisAfter.evaluation;

    // Classifier l'erreur
    const mistakeLevel = classifyMistake(evalBefore, evalAfter, isWhiteMove);

    analyses.push({
      fen: currentFen,
      moveNumber: i + 1,
      playedMove: playedMoveSan,
      bestMove: analysisBefore.bestMove,
      // On stocke l'évaluation APRÈS le coup (position actuelle)
      evaluation: evalAfter,
      mistakeLevel,
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
