import { useState, useRef } from "react";
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

interface AnalyzeGamesOptions {
  depth?: number;
}

interface Progress {
  gameId: string;
  current: number;
  total: number;
  completed: boolean;
}

export const useAnalyzeGames = () => {
  const dataService = useDataService();
  const { supabase } = useSupabase();
  const { isGuest } = useGuestMode();
  const queryClient = useQueryClient();
  const { platforms } = useChessPlatform();
  const [progress, setProgress] = useState<Record<string, Progress>>({});
  const [isAnalyzingInternal, setIsAnalyzingInternal] = useState(false);
  const analyzingRef = useRef(false);

  const analyzeGames = useMutation({
    mutationFn: async ({
      games,
      options = {},
    }: {
      games: Game[];
      options?: AnalyzeGamesOptions;
    }) => {
      if (games.length === 0) {
        throw new Error("Aucune partie à analyser");
      }

      // Marquer comme en cours d'analyse
      analyzingRef.current = true;
      setIsAnalyzingInternal(true);

      const depth = options.depth ?? 13;
      const results: {
        gameId: string;
        success: boolean;
        error?: string;
      }[] = [];

      // Initialiser le progress avec un état "en cours" même si total est 0
      const initialProgress: Record<string, Progress> = {};
      games.forEach((game) => {
        initialProgress[game.id] = {
          gameId: game.id,
          current: 0,
          total: 0, // Sera mis à jour par onProgress
          completed: false,
        };
      });
      setProgress(initialProgress);

      // Analyser les parties séquentiellement
      for (const game of games) {
        try {
          if (!game.pgn) {
            results.push({
              gameId: game.id,
              success: false,
              error: "PGN manquant",
            });
            continue;
          }

          const analyses = await analyzeGame(game.pgn, {
            depth,
            onProgress: (current, total) => {
              setProgress((prev) => ({
                ...prev,
                [game.id]: {
                  gameId: game.id,
                  current,
                  total,
                  completed: false,
                },
              }));
            },
          });

          if (analyses.length === 0) {
            throw new Error("Aucune analyse générée");
          }

          // Préparer les analyses pour insertion
          const analysesToInsert = prepareAnalysesForInsert(game.id, analyses);

          // Sauvegarder via le service unifié
          await dataService.saveAnalyses(game.id, analysesToInsert);
          await dataService.updateGameAnalyzedAt(
            game.id,
            new Date().toISOString(),
          );

          setProgress((prev) => ({
            ...prev,
            [game.id]: {
              gameId: game.id,
              current: analyses.length,
              total: analyses.length,
              completed: true,
            },
          }));

          // Invalider les caches
          queryClient.invalidateQueries({
            queryKey: ["game-analyses", game.id],
          });
          queryClient.invalidateQueries({ queryKey: ["games"] });
          queryClient.invalidateQueries({
            queryKey: ["game-metadata", game.id],
          });

          // Générer les exercices en différé
          setTimeout(() => {
            if (isGuest) {
              generateExercisesForGameGuest(
                game.id,
                game,
                platforms,
                queryClient,
                "useAnalyzeGames",
              );
            } else {
              generateExercisesForGame(
                supabase,
                game.id,
                game,
                platforms,
                queryClient,
                "useAnalyzeGames",
              );
            }
          }, 100);

          results.push({ gameId: game.id, success: true });
        } catch (error: any) {
          console.error(
            `[useAnalyzeGames] Erreur analyse partie ${game.id}:`,
            error,
          );
          setProgress((prev) => ({
            ...prev,
            [game.id]: {
              gameId: game.id,
              current: 0,
              total: 0,
              completed: true,
            },
          }));
          results.push({
            gameId: game.id,
            success: false,
            error: error?.message || "Erreur inconnue",
          });
        }
      }

      // Ne pas marquer comme terminé ici - onSuccess/onError le fera
      // Cela permet de garder isAnalyzing true pendant toute la durée
      return results;
    },
    onSuccess: () => {
      analyzingRef.current = false;
      setIsAnalyzingInternal(false);
      queryClient.invalidateQueries({ queryKey: ["games"] });
      Alert.alert("Analyse terminée", "Les parties ont été analysées.");
    },
    onError: (error: Error) => {
      analyzingRef.current = false;
      setIsAnalyzingInternal(false);
      Alert.alert("Erreur d'analyse", error.message);
    },
  });

  // isAnalyzing est true si :
  // - La mutation est pending (React Query)
  // - L'état interne indique une analyse en cours
  // - Il y a une progression active (même avec total=0, cela signifie qu'on a initialisé)
  const hasActiveProgress = Object.values(progress).some((p) => !p.completed);
  const isAnalyzing =
    analyzeGames.isPending || isAnalyzingInternal || hasActiveProgress;

  return {
    analyzeGames: analyzeGames.mutateAsync,
    isAnalyzing,
    progress,
  };
};
