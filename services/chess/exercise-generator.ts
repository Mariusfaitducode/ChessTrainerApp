// Service de génération d'exercices depuis les analyses
import { Chess } from "chess.js";
import type { GameAnalysis, Game } from "@/types/games";
import type { Exercise } from "@/types/exercises";
import { compareMoves } from "./move-comparison";
import { generateUUIDSync } from "@/utils/uuid";
import { LocalStorage } from "@/utils/local-storage";

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
 * Extrait la pièce du coup UCI pour générer un hint
 * Ex: "g1f3" -> "Déplacez le cavalier"
 */
const getPieceFromUci = (moveUci: string, fen: string): string => {
  try {
    const game = new Chess(fen);
    const moveObj = game.move(moveUci);
    if (!moveObj) return "pièce";

    // Déterminer la pièce déplacée
    const piece = moveObj.piece;
    const pieceMap: Record<string, string> = {
      p: "pion",
      n: "cavalier",
      b: "fou",
      r: "tour",
      q: "dame",
      k: "roi",
    };
    return pieceMap[piece] || "pièce";
  } catch {
    return "pièce";
  }
};

/**
 * Génère un hint basique à partir du meilleur coup (UCI)
 */
const generateHint = (
  bestMoveUci: string | null,
  fen: string,
): string | null => {
  if (!bestMoveUci) return null;
  const piece = getPieceFromUci(bestMoveUci, fen);
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
  // Vérifier que c'est bien un blunder (basé sur move_quality)
  if (analysis.move_quality !== "blunder") {
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
  // Les deux sont maintenant en UCI, comparaison directe
  const movesAreEqual =
    analysis.best_move?.toLowerCase() === analysis.played_move?.toLowerCase();

  if (movesAreEqual) {
    console.log(
      `[ExerciseGenerator] Le meilleur coup (${analysis.best_move}) est identique au coup joué (${analysis.played_move}) pour l'analyse ${analysis.id}. Ignoré.`,
    );
    return null;
  }

  // Générer le hint (basé sur UCI, pas besoin de SAN)
  const hint = generateHint(analysis.best_move, analysis.fen);
  const hints = hint ? [hint] : null;

  // Générer la description (utiliser directement UCI, conversion en SAN côté frontend si nécessaire)
  const description = generateDescription(
    analysis.move_number,
    analysis.played_move, // UCI - conversion en SAN côté frontend si nécessaire
  );

  return {
    user_id: context.game.user_id,
    game_id: context.game.id,
    game_analysis_id: analysis.id,
    fen: analysis.fen,
    position_description: description,
    exercise_type: "find_best_move",
    correct_move: analysis.best_move, // Stocker en UCI
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

  // Filtrer uniquement les blunders (basé sur move_quality)
  const blunders = analyses.filter((a) => a.move_quality === "blunder");
  console.log(`[ExerciseGenerator] ${blunders.length} blunders trouvés`);

  // Créer les exercices avec leur analyse associée
  const exercisesWithAnalysis: {
    exercise: Omit<Exercise, "id" | "created_at">;
    analysis: GameAnalysis;
  }[] = [];

  for (const analysis of blunders) {
    const exercise = createExerciseFromAnalysis(analysis, context);
    if (exercise) {
      exercisesWithAnalysis.push({ exercise, analysis });
    }
  }

  if (exercisesWithAnalysis.length === 0) {
    console.log("[ExerciseGenerator] Aucun exercice à créer");
    return 0;
  }

  console.log(
    `[ExerciseGenerator] ${exercisesWithAnalysis.length} exercices à créer`,
  );

  // Vérifier l'existence avant insertion pour éviter les doublons
  const exercisesToInsert: Omit<Exercise, "id" | "created_at">[] = [];

  for (const { exercise, analysis } of exercisesWithAnalysis) {
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

      // Validation finale : vérifier une dernière fois que best_move ≠ played_move
      // (sécurité supplémentaire au cas où la comparaison aurait échoué)
      const finalCheck = compareMoves(
        exercise.correct_move,
        analysis.played_move,
        exercise.fen,
      );

      if (finalCheck) {
        console.error(
          `[ExerciseGenerator] ERREUR: Tentative de créer un exercice avec best_move === played_move !`,
          `best_move=${exercise.correct_move}, played_move=${analysis.played_move}, analysis_id=${analysis.id}`,
        );
        continue; // Ne pas insérer cet exercice
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

/**
 * Génère tous les exercices à partir des analyses d'une partie (mode guest)
 * Version adaptée pour LocalStorage
 */
export const generateExercisesFromAnalysesGuest = async (
  analyses: GameAnalysis[],
  game: Game,
  userUsernames: string[],
): Promise<number> => {
  console.log(
    `[ExerciseGenerator] Génération d'exercices (guest) pour ${analyses.length} analyses`,
  );

  const context: ExerciseGenerationContext = {
    game,
    userUsernames,
  };

  // Filtrer uniquement les blunders (basé sur move_quality)
  const blunders = analyses.filter((a) => a.move_quality === "blunder");
  console.log(`[ExerciseGenerator] ${blunders.length} blunders trouvés`);

  // Créer les exercices avec leur analyse associée
  const exercisesWithAnalysis: {
    exercise: Omit<Exercise, "id" | "created_at">;
    analysis: GameAnalysis;
  }[] = [];

  for (const analysis of blunders) {
    const exercise = createExerciseFromAnalysis(analysis, context);
    if (exercise) {
      exercisesWithAnalysis.push({ exercise, analysis });
    }
  }

  if (exercisesWithAnalysis.length === 0) {
    console.log("[ExerciseGenerator] Aucun exercice à créer");
    return 0;
  }

  console.log(
    `[ExerciseGenerator] ${exercisesWithAnalysis.length} exercices à créer`,
  );

  // Récupérer les exercices existants depuis LocalStorage
  const existingExercises = await LocalStorage.getExercises();
  const existingSet = new Set(
    existingExercises.map(
      (e) => `${e.fen}_${e.correct_move}_${e.user_id || "guest"}`,
    ),
  );

  // Vérifier l'existence avant insertion pour éviter les doublons
  const exercisesToInsert: Omit<Exercise, "id" | "created_at">[] = [];

  for (const { exercise, analysis } of exercisesWithAnalysis) {
    try {
      // Vérifier si un exercice existe déjà avec la même FEN et le même correct_move
      const exerciseKey = `${exercise.fen}_${exercise.correct_move}_${exercise.user_id || "guest"}`;
      if (existingSet.has(exerciseKey)) {
        console.log(
          `[ExerciseGenerator] Exercice déjà existant pour FEN ${exercise.fen} et move ${exercise.correct_move}`,
        );
        continue;
      }

      // Validation finale : vérifier une dernière fois que best_move ≠ played_move
      const finalCheck = compareMoves(
        exercise.correct_move,
        analysis.played_move,
        exercise.fen,
      );

      if (finalCheck) {
        console.error(
          `[ExerciseGenerator] ERREUR: Tentative de créer un exercice avec best_move === played_move !`,
          `best_move=${exercise.correct_move}, played_move=${analysis.played_move}, analysis_id=${analysis.id}`,
        );
        continue; // Ne pas insérer cet exercice
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

  // Insérer les exercices dans LocalStorage avec IDs temporaires
  const exercisesWithIds: Exercise[] = exercisesToInsert.map((exercise) => ({
    ...exercise,
    id: generateUUIDSync(),
    created_at: new Date().toISOString(),
  })) as Exercise[];

  // Ajouter chaque exercice à LocalStorage
  for (const exercise of exercisesWithIds) {
    await LocalStorage.addExercise(exercise);
  }

  console.log(
    `[ExerciseGenerator] ${exercisesToInsert.length} exercices créés avec succès (guest)`,
  );
  return exercisesToInsert.length;
};
