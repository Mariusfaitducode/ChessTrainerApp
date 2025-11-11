// Utilitaires pour enrichir les exercices avec les données de la partie et de l'analyse

import type {
  Exercise,
  Game,
  GameAnalysis,
  UserPlatform,
} from "@/types/database";

/**
 * Détermine l'adversaire d'un exercice en comparant les usernames de l'utilisateur
 * avec les joueurs de la partie
 */
export function determineOpponent(
  game: Game | null,
  userPlatforms: UserPlatform[],
): string | null {
  if (!game) return null;

  const userUsernames = userPlatforms
    .map((p) => p.platform_username?.toLowerCase().trim())
    .filter((u): u is string => !!u);

  const whitePlayer = game.white_player?.toLowerCase().trim() || "";
  const blackPlayer = game.black_player?.toLowerCase().trim() || "";

  const isUserWhite = userUsernames.some((u) => u === whitePlayer);
  const isUserBlack = userUsernames.some((u) => u === blackPlayer);

  if (isUserWhite) {
    return game.black_player || "Noirs";
  } else if (isUserBlack) {
    return game.white_player || "Blancs";
  } else {
    return game.white_player || game.black_player || null;
  }
}

/**
 * Calcule la perte d'évaluation entre deux analyses consécutives
 * Retourne la perte en centipawns
 */
export function calculateEvaluationLoss(
  analysis: GameAnalysis | null,
  previousAnalysis: GameAnalysis | null,
): number | undefined {
  if (
    !analysis ||
    !previousAnalysis ||
    analysis.evaluation === null ||
    previousAnalysis.evaluation === null ||
    analysis.move_number <= 1
  ) {
    return undefined;
  }

  // move_number impair = blanc, pair = noir
  const isWhiteMove = analysis.move_number % 2 === 1;

  // Les évaluations sont en pawns dans la DB, on les convertit en centipawns
  const evalBefore = previousAnalysis.evaluation * 100;
  const evalAfter = analysis.evaluation * 100;

  // Utiliser la même formule que classifyMistake (qui attend des centipawns)
  const loss = isWhiteMove
    ? evalBefore + evalAfter // Blanc : avant + après (inversé)
    : evalAfter - evalBefore; // Noir : après - avant (inversés)

  // Retourner seulement si la perte est positive
  return loss > 0 ? Math.round(loss) : undefined;
}

/**
 * Convertit les hints depuis Json vers string[]
 */
export function parseHints(hints: any): string[] | null {
  if (!hints) return null;
  if (Array.isArray(hints)) {
    return hints.filter((h): h is string => typeof h === "string");
  }
  return null;
}

/**
 * Enrichit un exercice avec les données de la partie et de l'analyse
 */
export function enrichExercise(
  exercise: Exercise,
  game: Game | null,
  analysis: GameAnalysis | null,
  previousAnalysis: GameAnalysis | null,
  userPlatforms: UserPlatform[],
): Exercise {
  const enriched: Exercise = {
    ...exercise,
    hints: parseHints(exercise.hints),
  };

  // Déterminer l'adversaire
  enriched.opponent = determineOpponent(game, userPlatforms);

  // Ajouter les données de l'analyse
  if (analysis) {
    enriched.move_quality = analysis.move_quality || null;
    enriched.played_move = analysis.played_move || null;
    // Le FEN dans game_analyses est le FEN avant le coup
    enriched.fen_before = analysis.fen || null;
    enriched.move_number = analysis.move_number || null;
    // Utiliser evaluation_loss directement depuis la DB (déjà calculé par le backend)
    // Si non disponible, essayer de le calculer avec previousAnalysis comme fallback
    if (
      analysis.evaluation_loss !== null &&
      analysis.evaluation_loss !== undefined
    ) {
      // Convertir de centipawns (stocké en DB) en centipawns (même unité)
      enriched.evaluation_loss = Math.round(analysis.evaluation_loss);
    } else {
      // Fallback : calculer si non disponible dans la DB
      enriched.evaluation_loss = calculateEvaluationLoss(
        analysis,
        previousAnalysis,
      );
    }
  }

  return enriched;
}
