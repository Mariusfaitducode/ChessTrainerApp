import { useQuery } from "@tanstack/react-query";

import { useSupabase } from "./useSupabase";
import type { Game, GameAnalysis } from "@/types/games";

export const useGame = (gameId: string | null) => {
  const { supabase } = useSupabase();

  // Métadonnées (sans PGN pour charger plus rapidement la page)
  const {
    data: gameMetadata,
    isLoading: isLoadingMetadata,
    error,
  } = useQuery({
    queryKey: ["game-metadata", gameId],
    queryFn: async () => {
      if (!gameId) return null;

      const { data, error } = await supabase
        .from("games")
        .select(
          "id, platform, platform_game_id, white_player, black_player, result, time_control, played_at, analyzed_at",
        )
        .eq("id", gameId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!gameId,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // PGN (chargé en parallèle, peut être plus volumineux)
  const { data: gamePgn, isLoading: isLoadingPgn } = useQuery({
    queryKey: ["game-pgn", gameId],
    queryFn: async () => {
      if (!gameId) return null;

      const { data, error } = await supabase
        .from("games")
        .select("pgn")
        .eq("id", gameId)
        .single();

      if (error) throw error;
      return data?.pgn || null;
    },
    enabled: !!gameId,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // Analyses de la partie
  const { data: analyses, isLoading: isLoadingAnalyses } = useQuery({
    queryKey: ["game-analyses", gameId],
    queryFn: async () => {
      if (!gameId) return [];

      const { data, error } = await supabase
        .from("game_analyses")
        .select(
          "id, game_id, move_number, evaluation, best_move, mistake_level",
        )
        .eq("game_id", gameId)
        .order("move_number", { ascending: true });

      if (error) throw error;
      return (data as GameAnalysis[]) ?? [];
    },
    enabled: !!gameId,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
  });

  // Combiner les données
  const game: Game | null = gameMetadata
    ? ({
        ...gameMetadata,
        pgn: gamePgn ?? null,
      } as Game)
    : null;

  return {
    game,
    analyses: analyses ?? [],
    isLoading: isLoadingMetadata || isLoadingAnalyses,
    isPgnLoading: isLoadingPgn,
    error,
  };
};
