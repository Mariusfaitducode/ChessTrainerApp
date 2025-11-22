import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";

import { useSupabase } from "./useSupabase";
import { useGuestMode } from "./useGuestMode";
import { LocalStorage } from "@/utils/local-storage";
import {
  analyzeGame,
  prepareAnalysesForInsert,
} from "@/services/chess/analyzer";
import { insertAnalyses } from "@/utils/analysis";
import { generateExercisesForGame } from "@/utils/exercise";
import { useChessPlatform } from "./useChessPlatform";
import type { Game } from "@/types/games";
import type { GameAnalysis } from "@/types/database";

interface AnalyzeGameOptions {
  onProgress?: (current: number, total: number) => void;
  depth?: number;
}

/**
 * Hook pour analyser une partie d'échecs
 */
export const useAnalyzeGame = () => {
  const { supabase, session } = useSupabase();
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

      if (isGuest) {
        // Mode guest : stocker dans LocalStorage
        const analysesToInsert = prepareAnalysesForInsert(game.id, analyses);
        
        // Sauvegarder les analyses
        await LocalStorage.saveAnalyses(game.id, analysesToInsert as GameAnalysis[]);

        // Mettre à jour analyzed_at dans LocalStorage
        const games = await LocalStorage.getGames();
        const gameIndex = games.findIndex((g) => g.id === game.id);
        if (gameIndex !== -1) {
          games[gameIndex].analyzed_at = new Date().toISOString();
          await LocalStorage.saveGames(games);
        }

        // Invalider les caches
        queryClient.invalidateQueries({ queryKey: ["game-analyses", game.id] });
        queryClient.invalidateQueries({ queryKey: ["games"] });
        queryClient.invalidateQueries({ queryKey: ["game-metadata", game.id] });

        // Générer les exercices en différé (pour mode guest aussi)
        setTimeout(() => {
          // TODO: Adapter generateExercisesForGame pour mode guest
          // Pour l'instant, on skip la génération d'exercices en mode guest
          console.log("[useAnalyzeGame] Génération d'exercices en mode guest - à implémenter");
        }, 100);
      } else {
        // Mode authentifié : utiliser Supabase
        if (!session?.user) {
          throw new Error("Vous devez être connecté pour analyser une partie");
        }

        const analysesToInsert = prepareAnalysesForInsert(game.id, analyses);
        await insertAnalyses(supabase, game.id, analysesToInsert);

        // Invalider les caches
        queryClient.invalidateQueries({ queryKey: ["game-analyses", game.id] });
        queryClient.invalidateQueries({ queryKey: ["games"] });
        queryClient.invalidateQueries({ queryKey: ["game-metadata", game.id] });

        // Générer les exercices en différé (pour ne pas bloquer l'analyse)
        setTimeout(() => {
          generateExercisesForGame(
            supabase,
            game.id,
            game,
            platforms,
            queryClient,
            "useAnalyzeGame",
          );
        }, 100); // Petit délai pour laisser l'insertion se terminer
      }

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
