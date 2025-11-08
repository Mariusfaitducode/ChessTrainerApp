import { useQuery } from "@tanstack/react-query";

import { useSupabase } from "./useSupabase";
import { useChessPlatform } from "./useChessPlatform";
import type { Exercise } from "@/types/exercises";
import type { Game, GameAnalysis, UserPlatform } from "@/types/database";
import { enrichExercise } from "@/utils/exercise-enrichment";

export const useExercise = (exerciseId: string | undefined) => {
  const { supabase } = useSupabase();
  const { platforms } = useChessPlatform();

  const {
    data: exercise,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["exercise", exerciseId, platforms],
    queryFn: async () => {
      if (!exerciseId) return null;

      // 1. Récupérer l'exercice avec JOINs pour game et analysis
      const { data, error } = await supabase
        .from("exercises")
        .select(
          `
          *,
          games (*),
          game_analyses!exercises_game_analysis_id_fkey (*)
        `,
        )
        .eq("id", exerciseId)
        .single();

      if (error) throw error;
      if (!data) return null;

      const game = (data.games as unknown as Game) || null;
      const analysis = (data.game_analyses as unknown as GameAnalysis) || null;

      // 2. Récupérer l'analyse précédente si nécessaire
      let previousAnalysis: GameAnalysis | null = null;
      if (analysis && analysis.move_number > 1 && analysis.game_id) {
        const { data: prevData } = await supabase
          .from("game_analyses")
          .select("*")
          .eq("game_id", analysis.game_id)
          .eq("move_number", analysis.move_number - 1)
          .single();

        if (prevData) {
          previousAnalysis = prevData as GameAnalysis;
        }
      }

      // 3. Enrichir l'exercice
      return enrichExercise(
        data as Exercise,
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
