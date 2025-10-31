import { useQuery } from "@tanstack/react-query";

import { useSupabase } from "./useSupabase";
import type { Game, GameAnalysis } from "@/types/games";

export const useGame = (gameId: string | null) => {
  const { supabase } = useSupabase();

  const {
    data: game,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["game", gameId],
    queryFn: async () => {
      if (!gameId) return null;

      const { data, error } = await supabase
        .from("games")
        .select("*")
        .eq("id", gameId)
        .single();

      if (error) throw error;
      return data as Game;
    },
    enabled: !!gameId,
  });

  const { data: analyses, isLoading: isLoadingAnalyses } = useQuery({
    queryKey: ["game-analyses", gameId],
    queryFn: async () => {
      if (!gameId) return [];

      const { data, error } = await supabase
        .from("game_analyses")
        .select("*")
        .eq("game_id", gameId)
        .order("move_number", { ascending: true });

      if (error) throw error;
      return data as GameAnalysis[];
    },
    enabled: !!gameId,
  });

  return {
    game,
    analyses: analyses ?? [],
    isLoading: isLoading || isLoadingAnalyses,
    error,
  };
};
