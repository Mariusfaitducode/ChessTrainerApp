import { useQuery } from "@tanstack/react-query";

import { useDataService } from "./useDataService";
import { useChessPlatform } from "./useChessPlatform";
import { useGuestMode } from "./useGuestMode";
import type { Exercise } from "@/types/exercises";
import type { Game, GameAnalysis, UserPlatform } from "@/types/database";
import { enrichExercise } from "@/utils/exercise-enrichment";

export const useExercise = (exerciseId: string | undefined) => {
  const dataService = useDataService();
  const { platforms } = useChessPlatform();
  const { isGuest } = useGuestMode();

  const {
    data: exercise,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["exercise", exerciseId, platforms, isGuest ? "guest" : "authenticated"],
    queryFn: async () => {
      if (!exerciseId) return null;

      // Récupérer l'exercice depuis le service unifié
      const exerciseData = await dataService.getExercise(exerciseId);
      if (!exerciseData) return null;

      let game: Game | null = null;
      let analysis: GameAnalysis | null = null;
      let previousAnalysis: GameAnalysis | null = null;

      // En mode authentifié, game et analysis sont déjà attachés via les JOINs Supabase
      // En mode guest, on doit les récupérer séparément
      if (isGuest) {
        if (exerciseData.game_id) {
          game = await dataService.getGame(exerciseData.game_id);
        }

        if (exerciseData.game_analysis_id && exerciseData.game_id) {
          const analyses = await dataService.getAnalyses(exerciseData.game_id);
          analysis = analyses.find((a) => a.id === exerciseData.game_analysis_id) || null;

          if (analysis && analysis.move_number > 1) {
            previousAnalysis =
              analyses.find((a) => a.move_number === analysis!.move_number - 1) ||
              null;
          }
        }
      } else {
        // Mode authentifié : game et analysis sont déjà attachés
        game = (exerciseData.games as unknown as Game) || null;
        analysis = (exerciseData.game_analyses as unknown as GameAnalysis) || null;

        // Récupérer l'analyse précédente si nécessaire
        if (analysis && analysis.move_number > 1 && analysis.game_id) {
          const analyses = await dataService.getAnalyses(analysis.game_id);
          previousAnalysis =
            analyses.find((a) => a.move_number === analysis!.move_number - 1) ||
            null;
        }
      }

      // Enrichir l'exercice
      return enrichExercise(
        exerciseData as Exercise,
        game,
        analysis,
        previousAnalysis,
        platforms as UserPlatform[],
      );
    },
    enabled: !!exerciseId,
  });

  return {
    exercise: exercise ?? null,
    isLoading,
    error,
    refetch,
  };
};
