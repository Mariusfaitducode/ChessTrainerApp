import { useQuery } from "@tanstack/react-query";

import { useSupabase } from "./useSupabase";
import type { Game } from "@/types/games";

export const useGames = () => {
  const { supabase } = useSupabase();

  const {
    data: games,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["games"],
    queryFn: async () => {
      const { data: gamesData, error: gamesError } = await supabase
        .from("games")
        .select("*")
        .order("played_at", { ascending: false });

      if (gamesError) throw gamesError;

      if (!gamesData || gamesData.length === 0) {
        return [];
      }

      // Récupérer les game_ids qui ont des analyses (source de vérité)
      const gameIds = gamesData.map((g) => g.id);
      const { data: analysesData } = await supabase
        .from("game_analyses")
        .select("game_id, mistake_level")
        .in("game_id", gameIds);

      const gamesWithAnalyses = new Set(
        (analysesData || []).map((a) => a.game_id),
      );

      // Compter les blunders par partie
      const blundersCountByGame = new Map<string, number>();
      (analysesData || []).forEach((analysis) => {
        if (analysis.mistake_level === "blunder") {
          const current = blundersCountByGame.get(analysis.game_id) || 0;
          blundersCountByGame.set(analysis.game_id, current + 1);
        }
      });

      // Synchroniser analyzed_at avec la présence d'analyses
      // On fait une seule requête batch pour optimiser
      const gamesToUpdate: { id: string; analyzed_at: string | null }[] = [];

      const gamesWithCorrectStatus = gamesData.map((game) => {
        const hasAnalyses = gamesWithAnalyses.has(game.id);
        const blundersCount = blundersCountByGame.get(game.id) || 0;

        if (hasAnalyses !== !!game.analyzed_at) {
          gamesToUpdate.push({
            id: game.id,
            analyzed_at: hasAnalyses ? new Date().toISOString() : null,
          });
          return {
            ...game,
            analyzed_at: hasAnalyses ? new Date().toISOString() : null,
            blunders_count: blundersCount,
          };
        }

        return {
          ...game,
          blunders_count: blundersCount,
        };
      });

      // Mettre à jour en batch si nécessaire
      if (gamesToUpdate.length > 0) {
        // Note: Supabase ne supporte pas les updates batch directement
        // On fait les updates en parallèle mais sans bloquer
        Promise.all(
          gamesToUpdate.map((game) =>
            supabase
              .from("games")
              .update({ analyzed_at: game.analyzed_at })
              .eq("id", game.id),
          ),
        ).catch((err) => {
          console.error("[useGames] Erreur synchronisation:", err);
        });
      }

      return gamesWithCorrectStatus as Game[];
    },
  });

  return {
    games: games ?? [],
    isLoading,
    error,
    refetch,
  };
};
