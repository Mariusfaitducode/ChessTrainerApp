import { useQuery } from "@tanstack/react-query";

import { useSupabase } from "./useSupabase";
import { useGuestMode } from "./useGuestMode";
import { LocalStorage } from "@/utils/local-storage";
import type { Game, GameAnalysis } from "@/types/games";

export const useGame = (gameId: string | null) => {
  const { supabase } = useSupabase();
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

      if (isGuest) {
        // Mode guest : récupérer depuis LocalStorage
        const games = await LocalStorage.getGames();
        const game = games.find((g) => g.id === gameId);
        if (!game) return null;
        
        // Retourner les métadonnées (sans PGN)
        return {
          id: game.id,
          platform: game.platform,
          platform_game_id: game.platform_game_id,
          white_player: game.white_player,
          black_player: game.black_player,
          result: game.result,
          time_control: game.time_control,
          played_at: game.played_at,
          analyzed_at: game.analyzed_at,
        };
      }

      // Mode authentifié : utiliser Supabase
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
    queryKey: ["game-pgn", gameId, isGuest ? "guest" : "authenticated"],
    queryFn: async () => {
      if (!gameId) return null;

      if (isGuest) {
        // Mode guest : récupérer depuis LocalStorage
        const games = await LocalStorage.getGames();
        const game = games.find((g) => g.id === gameId);
        return game?.pgn || null;
      }

      // Mode authentifié : utiliser Supabase
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
    queryKey: ["game-analyses", gameId, isGuest ? "guest" : "authenticated"],
    queryFn: async () => {
      if (!gameId) return [];

      if (isGuest) {
        // Mode guest : récupérer depuis LocalStorage
        const guestAnalyses = await LocalStorage.getAnalyses(gameId);
        return guestAnalyses as GameAnalysis[];
      }

      // Mode authentifié : utiliser Supabase
      const { data, error } = await supabase
        .from("game_analyses")
        .select(
          "id, game_id, move_number, evaluation, best_move, move_quality, game_phase, evaluation_loss, evaluation_type, mate_in",
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
