// Service de génération d'exercices depuis les analyses
import { Chess } from "chess.js";
import type { GameAnalysis, Game } from "@/types/games";
import type { Exercise } from "@/types/exercises";

interface ExerciseGenerationContext {
  game: Game;
  userUsernames: string[]; // Usernames normalisés de l'utilisateur
}

/**
 * Normalise un username pour la comparaison
 */
const normalizeUsername = (username: string | null): string => {
  return username?.toLowerCase().trim().replace(/\s+/g, "") || "";
};

/**
 * Détermine si c'est le joueur utilisateur qui a joué ce coup
 */
const isUserMove = (
  moveNumber: number,
  game: Game,
  userUsernames: string[],
): boolean => {
  // moveNumber commence à 1
  // moveNumber impair = coup blanc (1, 3, 5, ...)
  // moveNumber pair = coup noir (2, 4, 6, ...)
  const isWhiteMove = moveNumber % 2 === 1;

  const whitePlayer = normalizeUsername(game.white_player);
  const blackPlayer = normalizeUsername(game.black_player);

  if (isWhiteMove) {
    return userUsernames.some((username) => username === whitePlayer);
  } else {
    return userUsernames.some((username) => username === blackPlayer);
  }
};

/**
 * Extrait la pièce du coup SAN pour générer un hint
 * Ex: "Nf3" -> "Déplacez le cavalier"
 */
const getPieceFromMove = (move: string): string => {
  // Retirer les annotations (+, #, =, etc.)
  const cleanMove = move.replace(/[+#=!?]/g, "");

  // Détecter le type de pièce
  if (cleanMove.startsWith("O-O")) {
    return "roque";
  }

  // Extraire la première lettre (ou la case si c'est un pion)
  const firstChar = cleanMove[0];

  // Si c'est une majuscule, c'est une pièce
  if (firstChar >= "A" && firstChar <= "Z") {
    const pieceMap: Record<string, string> = {
      K: "roi",
      Q: "dame",
      R: "tour",
      B: "fou",
      N: "cavalier",
      P: "pion",
    };
    return pieceMap[firstChar] || "pièce";
  }

  // Sinon, c'est un coup de pion
  return "pion";
};

/**
 * Génère un hint basique à partir du meilleur coup
 */
const generateHint = (bestMove: string | null): string | null => {
  if (!bestMove) return null;

  const piece = getPieceFromMove(bestMove);
  return `Déplacez le ${piece}`;
};

/**
 * Génère la description de l'exercice
 */
const generateDescription = (
  moveNumber: number,
  playedMove: string,
): string => {
  const movePair = Math.floor((moveNumber - 1) / 2) + 1;
  const isWhite = moveNumber % 2 === 1;
  const moveLabel = isWhite ? "blancs" : "noirs";

  return `Position après le coup ${movePair} (${moveLabel}). Vous avez fait l'erreur : ${playedMove}`;
};

/**
 * Crée un exercice à partir d'une analyse de blunder
 */
const createExerciseFromAnalysis = (
  analysis: GameAnalysis,
  context: ExerciseGenerationContext,
): Omit<Exercise, "id" | "created_at"> | null => {
  // Vérifier que c'est bien un blunder
  if (analysis.mistake_level !== "blunder") {
    return null;
  }

  // Vérifier que c'est le joueur utilisateur qui a fait l'erreur
  //   if (!isUserMove(analysis.move_number, context.game, context.userUsernames)) {
  //     return null;
  //   }

  // Vérifier que best_move existe
  if (!analysis.best_move) {
    console.warn(
      `[ExerciseGenerator] Pas de best_move pour l'analyse ${analysis.id}`,
    );
    return null;
  }

  // Vérifier que le meilleur coup est différent du coup joué
  // Normaliser les deux coups pour la comparaison (retirer les annotations)
  const normalizeMove = (move: string): string => {
    return move
      .replace(/[+#=!?]/g, "")
      .trim()
      .toLowerCase();
  };

  const normalizedBestMove = normalizeMove(analysis.best_move);
  const normalizedPlayedMove = normalizeMove(analysis.played_move);

  if (normalizedBestMove === normalizedPlayedMove) {
    console.log(
      `[ExerciseGenerator] Le meilleur coup est le même que le coup joué pour l'analyse ${analysis.id}. Ignoré.`,
    );
    return null;
  }

  // Générer le hint
  const hint = generateHint(analysis.best_move);
  const hints = hint ? [hint] : null;

  // Générer la description
  const description = generateDescription(
    analysis.move_number,
    analysis.played_move,
  );

  return {
    user_id: context.game.user_id,
    game_id: context.game.id,
    game_analysis_id: analysis.id,
    fen: analysis.fen,
    position_description: description,
    exercise_type: "find_best_move",
    correct_move: analysis.best_move,
    hints,
    difficulty: null, // Pas utilisé pour l'instant
    completed: false,
    score: 0,
    attempts: 0,
    completed_at: null,
  };
};

/**
 * Génère tous les exercices à partir des analyses d'une partie
 */
export const generateExercisesFromAnalyses = async (
  supabase: any,
  analyses: GameAnalysis[],
  game: Game,
  userUsernames: string[],
): Promise<number> => {
  console.log(
    `[ExerciseGenerator] Génération d'exercices pour ${analyses.length} analyses`,
  );

  const context: ExerciseGenerationContext = {
    game,
    userUsernames,
  };

  // Filtrer uniquement les blunders
  const blunders = analyses.filter((a) => a.mistake_level === "blunder");
  console.log(`[ExerciseGenerator] ${blunders.length} blunders trouvés`);

  // Créer les exercices
  const exercisesToCreate: Omit<Exercise, "id" | "created_at">[] = [];

  for (const analysis of blunders) {
    const exercise = createExerciseFromAnalysis(analysis, context);
    if (exercise) {
      exercisesToCreate.push(exercise);
    }
  }

  if (exercisesToCreate.length === 0) {
    console.log("[ExerciseGenerator] Aucun exercice à créer");
    return 0;
  }

  console.log(
    `[ExerciseGenerator] ${exercisesToCreate.length} exercices à créer`,
  );

  // Vérifier l'existence avant insertion pour éviter les doublons
  const exercisesToInsert: Omit<Exercise, "id" | "created_at">[] = [];

  for (const exercise of exercisesToCreate) {
    try {
      // Vérifier si un exercice existe déjà avec la même FEN et le même correct_move
      const { data: existing, error } = await supabase
        .from("exercises")
        .select("id")
        .eq("user_id", exercise.user_id)
        .eq("fen", exercise.fen)
        .eq("correct_move", exercise.correct_move)
        .maybeSingle();

      if (error) {
        console.error(
          `[ExerciseGenerator] Erreur vérification existence:`,
          error,
        );
        continue;
      }

      if (existing) {
        console.log(
          `[ExerciseGenerator] Exercice déjà existant pour FEN ${exercise.fen} et move ${exercise.correct_move}`,
        );
        continue;
      }

      exercisesToInsert.push(exercise);
    } catch (error: any) {
      console.error(
        `[ExerciseGenerator] Erreur lors de la vérification:`,
        error,
      );
      // Continuer avec le suivant
    }
  }

  if (exercisesToInsert.length === 0) {
    console.log("[ExerciseGenerator] Tous les exercices existent déjà");
    return 0;
  }

  // Insérer les exercices
  try {
    const { error: insertError } = await supabase
      .from("exercises")
      .insert(exercisesToInsert);

    if (insertError) {
      console.error(
        `[ExerciseGenerator] Erreur insertion exercices:`,
        insertError,
      );
      throw insertError;
    }

    console.log(
      `[ExerciseGenerator] ${exercisesToInsert.length} exercices créés avec succès`,
    );
    return exercisesToInsert.length;
  } catch (error: any) {
    console.error(`[ExerciseGenerator] Erreur:`, error);
    throw error;
  }
};
