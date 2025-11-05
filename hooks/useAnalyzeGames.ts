import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";

import { useSupabase } from "./useSupabase";
import {
  analyzeGame,
  prepareAnalysesForInsert,
} from "@/services/chess/analyzer";
import { insertAnalyses } from "@/utils/analysis";
import { generateExercisesForGame } from "@/utils/exercise";
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
  const { supabase, session } = useSupabase();
  const queryClient = useQueryClient();
  const { platforms } = useChessPlatform();
  const [progress, setProgress] = useState<Record<string, Progress>>({});

  const analyzeGames = useMutation({
    mutationFn: async ({
      games,
      options = {},
    }: {
      games: Game[];
      options?: AnalyzeGamesOptions;
    }) => {
      if (!session?.user) {
        throw new Error("Vous devez être connecté pour analyser les parties");
      }

      if (games.length === 0) {
        throw new Error("Aucune partie à analyser");
      }

      const depth = options.depth ?? 13;
      const results: {
        gameId: string;
        success: boolean;
        error?: string;
      }[] = [];

      // Initialiser le progress
      const initialProgress: Record<string, Progress> = {};
      games.forEach((game) => {
        initialProgress[game.id] = {
          gameId: game.id,
          current: 0,
          total: 0,
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

          const analysesToInsert = prepareAnalysesForInsert(game.id, analyses);
          await insertAnalyses(supabase, game.id, analysesToInsert);

          setProgress((prev) => ({
            ...prev,
            [game.id]: {
              gameId: game.id,
              current: analyses.length,
              total: analyses.length,
              completed: true,
            },
          }));

          // Générer les exercices en différé (pour ne pas bloquer l'analyse)
          setTimeout(() => {
            generateExercisesForGame(
              supabase,
              game.id,
              game,
              platforms,
              queryClient,
              "useAnalyzeGames",
            );
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

      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["games"] });
      Alert.alert("Analyse terminée", "Les parties ont été analysées.");
    },
    onError: (error: Error) => {
      Alert.alert("Erreur d'analyse", error.message);
    },
  });

  return {
    analyzeGames: analyzeGames.mutateAsync,
    isAnalyzing: analyzeGames.isPending,
    progress,
  };
};
