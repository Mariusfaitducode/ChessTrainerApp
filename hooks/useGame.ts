import { useQuery } from "@tanstack/react-query";

import { useDataService } from "./useDataService";
import { useGuestMode } from "./useGuestMode";
import type { Game } from "@/types/games";

export const useGame = (gameId: string | null) => {
  const dataService = useDataService();
  const { isGuest } = useGuestMode();

  // Métadonnées (sans PGN pour charger plus rapidement la page)
  const {
    data: gameMetadata,
    isLoading: isLoadingMetadata,
    error,
  } = useQuery({
    queryKey: ["game-metadata", gameId, isGuest ? "guest" : "authenticated"],
    queryFn: async () => {
      if (!gameId) return null;
      return await dataService.getGame(gameId);
    },
    enabled: !!gameId,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // PGN (chargé en parallèle, peut être plus volumineux)
  const { data: gamePgn, isLoading: isLoadingPgn } = useQuery({
    queryKey: ["game-pgn", gameId, isGuest ? "guest" : "authenticated"],
    queryFn: async () => {
      if (!gameId) return null;
      return await dataService.getGamePGN(gameId);
    },
    enabled: !!gameId,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // Analyses de la partie
  const { data: analyses, isLoading: isLoadingAnalyses } = useQuery({
    queryKey: ["game-analyses", gameId, isGuest ? "guest" : "authenticated"],
    queryFn: async () => {
      if (!gameId) return [];
      return await dataService.getAnalyses(gameId);
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
