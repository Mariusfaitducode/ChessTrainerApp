import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";

import { useDataService } from "./useDataService";
import { useSupabase } from "./useSupabase";
import { useGuestMode } from "./useGuestMode";
import {
  analyzeGame,
  prepareAnalysesForInsert,
} from "@/services/chess/analyzer";
import {
  generateExercisesForGame,
  generateExercisesForGameGuest,
} from "@/utils/exercise";
import { useChessPlatform } from "./useChessPlatform";
import type { Game } from "@/types/games";

interface AnalyzeGameOptions {
  onProgress?: (current: number, total: number) => void;
  depth?: number;
}

/**
 * Hook pour analyser une partie d'échecs
 */
export const useAnalyzeGame = () => {
  const dataService = useDataService();
  const { supabase } = useSupabase();
  const { isGuest } = useGuestMode();
  const queryClient = useQueryClient();
  const { platforms } = useChessPlatform();

  const analyze = useMutation({
    mutationFn: async ({
      game,
      options = {},
    }: {
      game: Game;
      options?: AnalyzeGameOptions;
    }) => {
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

      // Préparer les analyses pour insertion
      const analysesToInsert = prepareAnalysesForInsert(game.id, analyses);

      // Sauvegarder via le service unifié
      await dataService.saveAnalyses(game.id, analysesToInsert);
      await dataService.updateGameAnalyzedAt(game.id, new Date().toISOString());

      // Invalider les caches
      queryClient.invalidateQueries({ queryKey: ["game-analyses", game.id] });
      queryClient.invalidateQueries({ queryKey: ["games"] });
      queryClient.invalidateQueries({ queryKey: ["game-metadata", game.id] });

      // Générer les exercices en différé
      setTimeout(() => {
        if (isGuest) {
          generateExercisesForGameGuest(
            game.id,
            game,
            platforms,
            queryClient,
            "useAnalyzeGame",
          );
        } else {
          generateExercisesForGame(
            supabase,
            game.id,
            game,
            platforms,
            queryClient,
            "useAnalyzeGame",
          );
        }
      }, 100);

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
