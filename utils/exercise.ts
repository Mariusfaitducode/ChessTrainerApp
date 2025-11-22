// Utilitaires pour les exercices
import type { Game, GameAnalysis } from "@/types/games";
import { generateExercisesFromAnalyses } from "@/services/chess/exercise-generator";
import { generateExercisesFromAnalysesGuest } from "@/services/chess/exercise-generator";
import { LocalStorage } from "@/utils/local-storage";
import type { QueryClient } from "@tanstack/react-query";
import type { Exercise } from "@/types/exercises";

/**
 * Récupère les usernames normalisés de l'utilisateur depuis les plateformes
 */
export const getUserUsernames = (
  platforms: { platform_username: string | null }[],
): string[] => {
  return platforms
    .map((p) => p.platform_username)
    .filter((username): username is string => !!username)
    .map((username) => username.toLowerCase().trim().replace(/\s+/g, ""));
};

/**
 * Génère les exercices pour une partie analysée en différé
 * Cette fonction encapsule toute la logique de récupération, validation et génération
 */
export const generateExercisesForGame = async (
  supabase: any,
  gameId: string,
  game: Game,
  platforms: { platform_username: string | null }[],
  queryClient: QueryClient,
  context?: string, // Pour les logs (ex: "useAnalyzeGame" ou "useAnalyzeGames")
): Promise<void> => {
  try {
    // Récupérer les analyses depuis la DB (pour avoir les IDs)
    const { data: dbAnalyses, error: fetchError } = await supabase
      .from("game_analyses")
      .select("*")
      .eq("game_id", gameId)
      .order("move_number", { ascending: true });

    if (fetchError) {
      console.error(
        `[${context || "ExerciseGenerator"}] Erreur récupération analyses pour exercices (game ${gameId}):`,
        fetchError,
      );
      return;
    }

    if (!dbAnalyses || dbAnalyses.length === 0) {
      if (context) {
        console.log(
          `[${context}] Aucune analyse trouvée pour générer les exercices (game ${gameId})`,
        );
      }
      return;
    }

    // Vérifier que l'utilisateur a des usernames configurés
    const userUsernames = getUserUsernames(platforms);
    if (userUsernames.length === 0) {
      if (context) {
        console.log(
          `[${context}] Aucun username trouvé pour générer les exercices (game ${gameId})`,
        );
      }
      return;
    }

    // Générer les exercices
    await generateExercisesFromAnalyses(
      supabase,
      dbAnalyses as GameAnalysis[],
      game,
      userUsernames,
    );

    // Invalider le cache des exercices
    queryClient.invalidateQueries({ queryKey: ["exercises"] });
  } catch (error: any) {
    // Logger silencieusement, ne pas bloquer l'utilisateur
    console.error(
      `[${context || "ExerciseGenerator"}] Erreur génération exercices (game ${gameId}):`,
      error,
    );
  }
};

/**
 * Génère les exercices pour une partie analysée en mode guest
 * Version adaptée pour LocalStorage
 */
export const generateExercisesForGameGuest = async (
  gameId: string,
  game: Game,
  platforms: { platform_username: string | null }[],
  queryClient: QueryClient,
  context?: string,
): Promise<void> => {
  try {
    // Récupérer les analyses depuis LocalStorage
    const guestAnalyses = await LocalStorage.getAnalyses(gameId);

    if (!guestAnalyses || guestAnalyses.length === 0) {
      if (context) {
        console.log(
          `[${context}] Aucune analyse trouvée pour générer les exercices (game ${gameId})`,
        );
      }
      return;
    }

    // Vérifier que l'utilisateur a des usernames configurés
    const userUsernames = getUserUsernames(platforms);
    if (userUsernames.length === 0) {
      if (context) {
        console.log(
          `[${context}] Aucun username trouvé pour générer les exercices (game ${gameId})`,
        );
      }
      return;
    }

    // Générer les exercices
    await generateExercisesFromAnalysesGuest(
      guestAnalyses as GameAnalysis[],
      game,
      userUsernames,
    );

    // Invalider le cache des exercices
    queryClient.invalidateQueries({ queryKey: ["exercises"] });
  } catch (error: any) {
    // Logger silencieusement, ne pas bloquer l'utilisateur
    console.error(
      `[${context || "ExerciseGenerator"}] Erreur génération exercices (game ${gameId}):`,
      error,
    );
  }
};
