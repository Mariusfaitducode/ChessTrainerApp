import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { useSupabase } from "./useSupabase";
import type { Game } from "@/types/games";

export const useGames = () => {
  const { supabase } = useSupabase();
  const queryClient = useQueryClient();

  const {
    data: games,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["games"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("games")
        .select("*")
        .order("played_at", { ascending: false });

      if (error) throw error;
      return data as Game[];
    },
  });

  return {
    games: games ?? [],
    isLoading,
    error,
    refetch,
  };
};
