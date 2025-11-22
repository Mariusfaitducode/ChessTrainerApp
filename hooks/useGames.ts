import { useQuery } from "@tanstack/react-query";

import { useDataService } from "./useDataService";
import { useGuestMode } from "./useGuestMode";
import type { Game } from "@/types/games";

export const useGames = () => {
  const dataService = useDataService();
  const { isGuest } = useGuestMode();

  const {
    data: games,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["games", isGuest ? "guest" : "authenticated"],
    queryFn: async () => {
      return await dataService.getGames();
    },
  });

  return {
    games: games ?? [],
    isLoading,
    error,
    refetch,
  };
};
