import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { useSupabase } from "./useSupabase";
import { useChessPlatform } from "./useChessPlatform";
import type { Exercise } from "@/types/exercises";
import type { Game, GameAnalysis, UserPlatform } from "@/types/database";
import { enrichExercise } from "@/utils/exercise-enrichment";

export const useExercises = (completed?: boolean) => {
  const { supabase } = useSupabase();
  const { platforms } = useChessPlatform();
  const queryClient = useQueryClient();

  const {
    data: exercises,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["exercises", completed, platforms],
    queryFn: async () => {
      // 1. Récupérer les exercices avec JOINs pour games et analyses
      let query = supabase.from("exercises").select(
        `
          *,
          games (*),
          game_analyses!exercises_game_analysis_id_fkey (*)
        `,
      );

      if (completed !== undefined) {
        query = query.eq("completed", completed);
      }

      const { data: exercisesData, error: exercisesError } = await query.order(
        "created_at",
        {
          ascending: false,
        },
      );

      if (exercisesError) throw exercisesError;
      if (!exercisesData || exercisesData.length === 0) return [] as Exercise[];

      // 2. Récupérer toutes les analyses nécessaires en une seule requête
      // (pour calculer evaluation_loss, on a besoin de l'analyse précédente)
      const gameIds = exercisesData
        .map((ex) => ex.game_id)
        .filter((id): id is string => !!id);

      let allAnalyses: GameAnalysis[] = [];
      if (gameIds.length > 0) {
        const { data: analysesData, error: analysesError } = await supabase
          .from("game_analyses")
          .select("*")
          .in("game_id", gameIds)
          .order("game_id, move_number", { ascending: true });

        if (analysesError) throw analysesError;
        allAnalyses = (analysesData as GameAnalysis[]) || [];
      }

      // 3. Créer un index des analyses par game_id et move_number pour lookup rapide
      const analysesByGameAndMove = new Map<
        string,
        Map<number, GameAnalysis>
      >();
      allAnalyses.forEach((analysis) => {
        if (!analysesByGameAndMove.has(analysis.game_id)) {
          analysesByGameAndMove.set(analysis.game_id, new Map());
        }
        analysesByGameAndMove
          .get(analysis.game_id)!
          .set(analysis.move_number, analysis);
      });

      // 4. Enrichir les exercices côté client
      const enrichedExercises = exercisesData.map((exercise) => {
        const game = (exercise.games as unknown as Game) || null;
        const analysis =
          (exercise.game_analyses as unknown as GameAnalysis) || null;

        // Trouver l'analyse précédente si nécessaire
        let previousAnalysis: GameAnalysis | null = null;
        if (analysis && analysis.move_number > 1 && analysis.game_id) {
          const gameAnalyses = analysesByGameAndMove.get(analysis.game_id);
          if (gameAnalyses) {
            previousAnalysis =
              gameAnalyses.get(analysis.move_number - 1) || null;
          }
        }

        return enrichExercise(
          exercise as Exercise,
          game,
          analysis,
          previousAnalysis,
          platforms as UserPlatform[],
        );
      });

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
      const { data, error } = await supabase
        .from("exercises")
        .update(updates)
        .eq("id", exerciseId)
        .select()
        .single();

      if (error) throw error;
      return data as Exercise;
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
      const { data, error } = await supabase
        .from("exercises")
        .update({
          completed: true,
          score,
          completed_at: new Date().toISOString(),
          attempts: currentAttempts + 1,
        })
        .eq("id", exerciseId)
        .select()
        .single();

      if (error) throw error;
      return data as Exercise;
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
