import { useQuery } from "@tanstack/react-query";

import { useSupabase } from "./useSupabase";
import { useChessPlatform } from "./useChessPlatform";
import type { Exercise } from "@/types/exercises";

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

      const { data, error } = await supabase
        .from("exercises")
        .select("*")
        .eq("id", exerciseId)
        .single();

      if (error) throw error;
      if (!data) return null;

      const enriched: Exercise = { ...data };

      // Enrichir avec les informations de la partie si game_id existe
      if (data.game_id) {
        const { data: game } = await supabase
          .from("games")
          .select("*")
          .eq("id", data.game_id)
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
            enriched.opponent = game.white_player || game.black_player || null;
          }
        }
      }

      // Récupérer l'analyse pour calculer la perte d'évaluation
      if (data.game_analysis_id && data.game_id) {
        const { data: analysis } = await supabase
          .from("game_analyses")
          .select("*")
          .eq("id", data.game_analysis_id)
          .single();

        if (
          analysis &&
          analysis.evaluation !== null &&
          analysis.move_number > 1
        ) {
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
            const isWhiteMove = analysis.move_number % 2 === 1;
            // Les évaluations sont en pawns dans la DB, on les convertit en centipawns pour le calcul
            const evalBefore = previousAnalysis.evaluation * 100;
            const evalAfter = analysis.evaluation * 100;

            // Utiliser la même formule que classifyMistake (qui attend des centipawns)
            const loss = isWhiteMove
              ? evalBefore + evalAfter // Blanc : avant + après (inversé)
              : evalAfter - evalBefore; // Noir : après - avant (inversés)

            // Convertir en centipawns pour le stockage (evaluation_loss est en centipawns)
            if (loss > 0) {
              enriched.evaluation_loss = Math.round(loss);
            }
          }
        }
      }

      return enriched;
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
