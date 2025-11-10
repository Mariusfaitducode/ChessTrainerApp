// Classification complète des coups d'échecs
import { compareMoves } from "./move-comparison";

export type MoveQuality =
  | "best" // Meilleur coup (joué = best_move) ou perte < 50 cp
  | "excellent" // Coup excellent (perte 50-100 centipawns)
  | "good" // Bon coup (perte 100-200 centipawns)
  | "inaccuracy" // Imprécision (perte 200-300 centipawns)
  | "mistake" // Erreur (perte 300-500 centipawns)
  | "blunder"; // Erreur grave (perte > 500 centipawns)

export type GamePhase = "opening" | "middlegame" | "endgame";

export interface MoveClassification {
  move_quality: MoveQuality;
  game_phase: GamePhase;
  evaluation_loss: number; // Perte d'évaluation en centipawns (0 si meilleur coup)
}

/**
 * Détermine la phase de la partie selon le numéro du coup
 * - Ouverture : coups 1-15 (environ 7-8 coups par joueur)
 * - Milieu : coups 16-40
 * - Final : coups 41+
 */
export function determineGamePhase(moveNumber: number): GamePhase {
  if (moveNumber <= 15) {
    return "opening";
  } else if (moveNumber <= 40) {
    return "middlegame";
  } else {
    return "endgame";
  }
}

/**
 * Classifie un coup de manière complète :
 * - Qualité du coup (best, excellent, good, inaccuracy, mistake, blunder)
 * - Niveau d'erreur (pour compatibilité avec l'ancien système)
 * - Phase de partie (opening, middlegame, endgame)
 *
 * @param evalBefore Évaluation avant le coup (en centipawns, du point de vue des blancs)
 * @param evalAfter Évaluation après le coup joué (en centipawns, du point de vue des blancs)
 * @param evalBestAfter Évaluation après le meilleur coup (en centipawns, du point de vue des blancs) - null si non disponible
 * @param isWhite True si c'est le joueur blanc qui a joué
 * @param playedMove Coup joué (SAN ou LAN)
 * @param bestMove Meilleur coup selon l'analyse (SAN ou LAN)
 * @param fen FEN de la position avant le coup
 * @param moveNumber Numéro du coup (1, 2, 3, ...)
 */
export function classifyMove(
  evalBefore: number,
  evalAfter: number,
  evalBestAfter: number | null,
  isWhite: boolean,
  playedMove: string,
  bestMove: string | null,
  fen: string,
  moveNumber: number,
): MoveClassification {
  // Déterminer la phase de partie
  const game_phase = determineGamePhase(moveNumber);

  // Si pas d'évaluation, on ne peut pas classifier
  if (evalBefore === 0 && evalAfter === 0) {
    return {
      move_quality: "good", // Par défaut, considérer comme bon
      game_phase,
      evaluation_loss: 0,
    };
  }

  // Vérifier d'abord si le coup joué est le meilleur coup
  // (même si l'évaluation change, si c'est le meilleur coup, c'est "best")
  // Si les deux sont en UCI, comparaison directe (plus rapide)
  // Sinon, fallback sur compareMoves pour compatibilité
  const movesAreEqual =
    playedMove.toLowerCase() === bestMove?.toLowerCase() ||
    (bestMove && compareMoves(playedMove, bestMove, fen));

  if (movesAreEqual) {
    return {
      move_quality: "best",
      game_phase,
      evaluation_loss: 0,
    };
  }

  // Calculer la perte d'évaluation
  //
  // MÉTHODE PRÉCISE (si evalBestAfter disponible) :
  // La perte = différence entre l'évaluation après le meilleur coup et après le coup joué
  // (toutes deux du point de vue des blancs)
  //
  // MÉTHODE APPROXIMATIVE (si evalBestAfter non disponible) :
  // Utilise la différence avant/après le coup joué comme approximation
  //
  // L'API retourne toujours l'évaluation du point de vue des blancs
  // (positif = avantage blanc, négatif = avantage noir)
  let loss: number;

  if (evalBestAfter !== null) {
    // MÉTHODE PRÉCISE : Comparer directement avec l'évaluation du meilleur coup
    // Les deux évaluations sont du point de vue des blancs
    // La perte = valeur absolue de la différence
    //
    // Exemple :
    // - evalBestAfter = +100 cp (avantage blanc après meilleur coup)
    // - evalAfter = +50 cp (avantage blanc après coup joué)
    // - Perte = |100 - 50| = 50 cp
    loss = Math.abs(evalBestAfter - evalAfter);
  } else {
    // MÉTHODE APPROXIMATIVE : Utiliser la différence avant/après le coup joué
    //
    // L'idée : Si le coup joué est bon, l'évaluation après devrait être proche de l'inverse
    // de l'évaluation avant (du point de vue de l'adversaire).
    //
    // Pour les blancs :
    // - evalBefore = +100 cp (avantage blanc avant le coup)
    // - Si le meilleur coup est joué, evalAfter ≈ -100 cp (du point de vue des noirs)
    // - Si un mauvais coup est joué, evalAfter sera différent (moins favorable)
    // - Perte approximative = |evalBefore - (-evalAfter)| = |evalBefore + evalAfter|
    //
    // Pour les noirs :
    // - evalBefore = -100 cp (avantage noir avant le coup, du point de vue des blancs)
    // - Si le meilleur coup est joué, evalAfter ≈ +100 cp (du point de vue des blancs)
    // - Perte approximative = |(-evalBefore) - evalAfter| = |evalAfter - evalBefore|
    if (isWhite) {
      // Blanc : perte = |evalBefore + evalAfter|
      // Si evalBefore = +100 et evalAfter = -100, perte = 0 (meilleur coup)
      // Si evalBefore = +100 et evalAfter = -50, perte = 50 (petite perte)
      loss = Math.abs(evalBefore + evalAfter);
    } else {
      // Noir : perte = |evalAfter - evalBefore|
      // Si evalBefore = -100 et evalAfter = +100, perte = 0 (meilleur coup)
      // Si evalBefore = -100 et evalAfter = +50, perte = 50 (petite perte)
      loss = Math.abs(evalAfter - evalBefore);
    }
  }

  // Si la perte est nulle, le coup améliore ou maintient la position
  // Dans ce cas, c'est un bon coup (best)
  if (loss <= 0) {
    return {
      move_quality: "best",
      game_phase,
      evaluation_loss: 0,
    };
  }

  // Classifier selon la perte (en centipawns)
  // Standards Lichess/Chess.com :
  // - Best: < 50 cp
  // - Excellent: 50-100 cp
  // - Good: 100-200 cp
  // - Inaccuracy: 200-300 cp
  // - Mistake: 300-500 cp
  // - Blunder: > 500 cp
  let move_quality: MoveQuality;

  if (loss > 500) {
    // Perte > 5 pawns (Blunder)
    move_quality = "blunder";
  } else if (loss > 300) {
    // Perte entre 3-5 pawns (Mistake)
    move_quality = "mistake";
  } else if (loss > 200) {
    // Perte entre 2-3 pawns (Inaccuracy)
    move_quality = "inaccuracy";
  } else if (loss > 100) {
    // Perte entre 1-2 pawns (Good)
    move_quality = "good";
  } else if (loss > 50) {
    // Perte entre 0.5-1 pawn (Excellent)
    move_quality = "excellent";
  } else {
    // Perte < 50 centipawns (Best - quasi parfait)
    move_quality = "best";
  }

  return {
    move_quality,
    game_phase,
    evaluation_loss: Math.round(loss),
  };
}
