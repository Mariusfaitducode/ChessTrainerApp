import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { useDataService } from "./useDataService";
import { useChessPlatform } from "./useChessPlatform";
import { useGuestMode } from "./useGuestMode";
import type { Exercise } from "@/types/exercises";
import type { Game, GameAnalysis, UserPlatform } from "@/types/database";
import { enrichExercise } from "@/utils/exercise-enrichment";

export const useExercises = (completed?: boolean) => {
  const dataService = useDataService();
  const { platforms } = useChessPlatform();
  const { isGuest } = useGuestMode();
  const queryClient = useQueryClient();

  const {
    data: exercises,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["exercises", completed, platforms, isGuest ? "guest" : "authenticated"],
    queryFn: async () => {
      // Récupérer les exercices depuis le service unifié
      const exercisesData = await dataService.getExercises(completed);

      if (exercisesData.length === 0) return [] as Exercise[];

      // Enrichir les exercices avec les données de game et analysis
      const enrichedExercises: Exercise[] = [];

      for (const exercise of exercisesData) {
        let game: Game | null = null;
        let analysis: GameAnalysis | null = null;
        let previousAnalysis: GameAnalysis | null = null;

        // En mode authentifié, game et analysis sont déjà attachés via les JOINs Supabase
        // En mode guest, on doit les récupérer séparément
        if (isGuest) {
          if (exercise.game_id) {
            game = await dataService.getGame(exercise.game_id);
          }

          if (exercise.game_analysis_id && exercise.game_id) {
            const analyses = await dataService.getAnalyses(exercise.game_id);
            analysis = analyses.find((a) => a.id === exercise.game_analysis_id) || null;

            if (analysis && analysis.move_number > 1) {
              previousAnalysis =
                analyses.find((a) => a.move_number === analysis!.move_number - 1) ||
                null;
            }
          }
        } else {
          // Mode authentifié : game et analysis sont déjà attachés
          game = (exercise.games as unknown as Game) || null;
          analysis = (exercise.game_analyses as unknown as GameAnalysis) || null;

          // Récupérer l'analyse précédente si nécessaire
          if (analysis && analysis.move_number > 1 && analysis.game_id) {
            const analyses = await dataService.getAnalyses(analysis.game_id);
            previousAnalysis =
              analyses.find((a) => a.move_number === analysis!.move_number - 1) ||
              null;
          }
        }

        enrichedExercises.push(
          enrichExercise(
            exercise as Exercise,
            game,
            analysis,
            previousAnalysis,
            platforms as UserPlatform[],
          ),
        );
      }

      return enrichedExercises;
    },
  });

  const updateExercise = useMutation({
    mutationFn: async ({
      exerciseId,
      updates,
    }: {
      exerciseId: string;
      updates: Partial<Exercise>;
    }) => {
      await dataService.updateExercise(exerciseId, updates);
      // Récupérer l'exercice mis à jour
      return (await dataService.getExercise(exerciseId)) as Exercise;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exercises"] });
    },
  });

  const completeExercise = useMutation({
    mutationFn: async ({
      exerciseId,
      score,
      currentAttempts,
    }: {
      exerciseId: string;
      score: number;
      currentAttempts: number;
    }) => {
      await dataService.updateExercise(exerciseId, {
        completed: true,
        score,
        completed_at: new Date().toISOString(),
        attempts: currentAttempts + 1,
      });
      // Récupérer l'exercice mis à jour
      return (await dataService.getExercise(exerciseId)) as Exercise;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exercises"] });
    },
  });

  return {
    exercises: exercises ?? [],
    isLoading,
    error,
    refetch,
    updateExercise: updateExercise.mutateAsync,
    completeExercise: completeExercise.mutateAsync,
  };
};
