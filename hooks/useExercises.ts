import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { useSupabase } from "./useSupabase";
import { useChessPlatform } from "./useChessPlatform";
import type { Exercise } from "@/types/exercises";

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
      let query = supabase.from("exercises").select("*");

      if (completed !== undefined) {
        query = query.eq("completed", completed);
      }

      const { data, error } = await query.order("created_at", {
        ascending: false,
      });

      if (error) throw error;
      if (!data || data.length === 0) return [] as Exercise[];

      // Enrichir les exercices avec les informations de la partie et de l'analyse
      const enrichedExercises = await Promise.all(
        data.map(async (exercise) => {
          const enriched: Exercise = { ...exercise };

          // Récupérer la partie si game_id existe
          if (exercise.game_id) {
            const { data: game } = await supabase
              .from("games")
              .select("*")
              .eq("id", exercise.game_id)
              .single();

            if (game) {
              // Déterminer l'adversaire
              const userUsernames = platforms
                .map((p) => p.platform_username?.toLowerCase().trim())
                .filter((u): u is string => !!u);

              const whitePlayer = game.white_player?.toLowerCase().trim() || "";
              const blackPlayer = game.black_player?.toLowerCase().trim() || "";

              const isUserWhite = userUsernames.some((u) => u === whitePlayer);
              const isUserBlack = userUsernames.some((u) => u === blackPlayer);

              if (isUserWhite) {
                enriched.opponent = game.black_player || "Noirs";
              } else if (isUserBlack) {
                enriched.opponent = game.white_player || "Blancs";
              } else {
                enriched.opponent =
                  game.white_player || game.black_player || null;
              }
            }
          }

          // Récupérer l'analyse pour calculer la perte d'évaluation
          if (exercise.game_analysis_id && exercise.game_id) {
            const { data: analysis } = await supabase
              .from("game_analyses")
              .select("*")
              .eq("id", exercise.game_analysis_id)
              .single();

            if (
              analysis &&
              analysis.evaluation !== null &&
              analysis.move_number > 1
            ) {
              // Récupérer l'analyse précédente pour calculer la perte
              const { data: previousAnalysis } = await supabase
                .from("game_analyses")
                .select("*")
                .eq("game_id", analysis.game_id)
                .eq("move_number", analysis.move_number - 1)
                .single();

              if (
                previousAnalysis &&
                previousAnalysis.evaluation !== null &&
                analysis.evaluation !== null
              ) {
                // move_number impair = blanc, pair = noir
                const isWhiteMove = analysis.move_number % 2 === 1;
                const evalBefore = previousAnalysis.evaluation;
                const evalAfter = analysis.evaluation;

                // Calculer la perte selon la formule de classifyMistake
                const loss = isWhiteMove
                  ? evalBefore + evalAfter // Blanc : avant + après (inversé)
                  : evalAfter - evalBefore; // Noir : après - avant (inversés)

                if (loss > 0) {
                  enriched.evaluation_loss = Math.round(loss);
                }
              }
            }
          }

          return enriched;
        }),
      );

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
