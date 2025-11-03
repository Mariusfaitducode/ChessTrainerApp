import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";

import { useSupabase } from "./useSupabase";
import {
  analyzeGame,
  prepareAnalysesForInsert,
} from "@/services/chess/analyzer";
import { insertAnalyses } from "@/utils/analysis";
import type { Game } from "@/types/games";

interface AnalyzeGameOptions {
  onProgress?: (current: number, total: number) => void;
  depth?: number;
}

/**
 * Hook pour analyser une partie d'échecs
 */
export const useAnalyzeGame = () => {
  const { supabase, session } = useSupabase();
  const queryClient = useQueryClient();

  const analyze = useMutation({
    mutationFn: async ({
      game,
      options = {},
    }: {
      game: Game;
      options?: AnalyzeGameOptions;
    }) => {
      if (!session?.user) {
        throw new Error("Vous devez être connecté pour analyser une partie");
      }

      if (!game.pgn) {
        throw new Error("PGN manquant pour cette partie");
      }

      const analyses = await analyzeGame(game.pgn, {
        depth: options.depth ?? 13,
        onProgress: options.onProgress,
      });

      if (analyses.length === 0) {
        throw new Error("Aucune analyse générée");
      }

      const analysesToInsert = prepareAnalysesForInsert(game.id, analyses);
      await insertAnalyses(supabase, game.id, analysesToInsert);

      // Invalider les caches
      queryClient.invalidateQueries({ queryKey: ["game-analyses", game.id] });
      queryClient.invalidateQueries({ queryKey: ["games"] });
      queryClient.invalidateQueries({ queryKey: ["game-metadata", game.id] });

      return analyses;
    },
    onError: (error: Error) => {
      Alert.alert("Erreur", error.message || "Erreur lors de l'analyse");
    },
  });

  return {
    analyze: analyze.mutateAsync,
    isAnalyzing: analyze.isPending,
    error: analyze.error,
  };
};
