import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { useSupabase } from "./useSupabase";
import { cache } from "@/utils/cache";
import type { Game, GameAnalysis } from "@/types/games";

// Charger d'abord les métadonnées (sans PGN) pour un chargement ultra-rapide
export const useGame = (gameId: string | null) => {
  const hookStartTime = performance.now();
  console.log(`[useGame] 🔵 Hook démarré pour ${gameId}`);

  const { supabase } = useSupabase();
  const queryClient = useQueryClient();

  // Vérifier immédiatement si on a déjà les données en cache mémoire
  const cachedMetadata = queryClient.getQueryData(["game-metadata", gameId]);
  const cachedPgn = queryClient.getQueryData(["game-pgn", gameId]);
  console.log(
    `[useGame] 🔵 Cache mémoire vérifié: metadata=${cachedMetadata ? "✅" : "❌"}, pgn=${cachedPgn ? "✅" : "❌"}, temps: ${performance.now() - hookStartTime}ms`,
  );

  // NE PAS bloquer sur AsyncStorage - React Query cache en mémoire est suffisant
  // Charger AsyncStorage en arrière-plan seulement pour la persistance
  useEffect(() => {
    if (!gameId) return;

    // Charger AsyncStorage en arrière-plan (ne pas bloquer)
    queueMicrotask(async () => {
      const cachedMetadata = await cache.get(`game-metadata-${gameId}`);
      const cachedPgn = await cache.get<string>(`game-pgn-${gameId}`);

      if (cachedMetadata) {
        // Injecter seulement si pas déjà en cache React Query
        const existing = queryClient.getQueryData(["game-metadata", gameId]);
        if (!existing) {
          queryClient.setQueryData(["game-metadata", gameId], cachedMetadata);
          console.log(
            `[useGame] Cache AsyncStorage metadata injecté (arrière-plan)`,
          );
        }
      }
      if (cachedPgn) {
        const existing = queryClient.getQueryData(["game-pgn", gameId]);
        if (!existing) {
          queryClient.setQueryData(["game-pgn", gameId], cachedPgn);
          console.log(
            `[useGame] Cache AsyncStorage PGN injecté (arrière-plan)`,
          );
        }
      }
    });
  }, [gameId, queryClient]);

  // Première requête : métadonnées uniquement (SANS PGN) - ultra rapide
  const queryStartTime = performance.now();
  const {
    data: gameMetadata,
    isLoading: isLoadingMetadata,
    error,
  } = useQuery({
    queryKey: ["game-metadata", gameId],
    queryFn: async () => {
      if (!gameId) return null;

      console.log(`[useGame] queryFn metadata appelée pour ${gameId}`);

      // Vérifier d'abord le cache React Query en mémoire (ULTRA RAPIDE - 0ms)
      const cachedInMemory = queryClient.getQueryData([
        "game-metadata",
        gameId,
      ]);
      if (cachedInMemory) {
        console.log(
          `[useGame] ✅ Cache React Query hit (mémoire) - INSTANTANÉ`,
        );
        return cachedInMemory;
      }

      console.log(`[useGame] ❌ Cache mémoire miss, fetch réseau nécessaire`);

      // Si pas de cache mémoire, fetch depuis Supabase
      // NE PAS vérifier AsyncStorage ici - trop lent, on veut être rapide
      const startTime = performance.now();

      const { data, error } = await supabase
        .from("games")
        .select(
          "id, platform, platform_game_id, white_player, black_player, result, time_control, played_at, analyzed_at",
        )
        .eq("id", gameId)
        .single();

      const fetchTime = performance.now() - startTime;
      console.log(`[useGame] Fetch metadata terminé en ${fetchTime}ms`);

      if (error) throw error;

      // Sauvegarder dans AsyncStorage en arrière-plan (ne pas bloquer)
      if (data) {
        cache.set(`game-metadata-${gameId}`, data).catch((err) => {
          console.error(`[useGame] Erreur sauvegarde cache:`, err);
        });
      }

      return data;
    },
    enabled: !!gameId,
    staleTime: Infinity, // NE JAMAIS considérer comme stale - React Query gardera en cache
    gcTime: 24 * 60 * 60 * 1000, // 24 heures - garder en mémoire très longtemps
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  console.log(
    `[useGame] 🔵 useQuery metadata terminé, temps: ${performance.now() - queryStartTime}ms, data: ${gameMetadata ? "✅" : "❌"}, isLoading: ${isLoadingMetadata}`,
  );

  // Deuxième requête : PGN seulement (lazy load, chargé en parallèle si nécessaire)
  const { data: gamePgn, isLoading: isLoadingPgn } = useQuery({
    queryKey: ["game-pgn", gameId],
    queryFn: async () => {
      if (!gameId) return null;

      console.log(`[useGame] queryFn PGN appelée pour ${gameId}`);

      // Vérifier d'abord le cache React Query en mémoire (ULTRA RAPIDE - 0ms)
      const cachedInMemory = queryClient.getQueryData(["game-pgn", gameId]);
      if (cachedInMemory) {
        console.log(
          `[useGame] ✅ Cache React Query PGN hit (mémoire) - INSTANTANÉ`,
        );
        return cachedInMemory;
      }

      console.log(
        `[useGame] ❌ Cache mémoire PGN miss, fetch réseau nécessaire`,
      );

      // Si pas de cache mémoire, fetch depuis Supabase
      // NE PAS vérifier AsyncStorage ici - trop lent
      const startTime = performance.now();

      const { data, error } = await supabase
        .from("games")
        .select("pgn")
        .eq("id", gameId)
        .single();

      const fetchTime = performance.now() - startTime;
      console.log(`[useGame] Fetch PGN terminé en ${fetchTime}ms`);

      if (error) throw error;

      const pgn = data?.pgn || null;

      // Sauvegarder dans AsyncStorage en arrière-plan (ne pas bloquer)
      if (pgn) {
        cache.set(`game-pgn-${gameId}`, pgn).catch((err) => {
          console.error(`[useGame] Erreur sauvegarde cache PGN:`, err);
        });
      }

      return pgn;
    },
    enabled: !!gameId,
    staleTime: Infinity, // NE JAMAIS considérer comme stale
    gcTime: 24 * 60 * 60 * 1000, // 24 heures
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Combiner les données
  // Afficher la page dès que les métadonnées sont disponibles, même si le PGN charge encore
  const game: Game | null = gameMetadata
    ? ({
        ...gameMetadata,
        pgn: gamePgn ?? null, // null si pas encore chargé, sinon la valeur
      } as Game)
    : null;

  const { data: analyses, isLoading: isLoadingAnalyses } = useQuery({
    queryKey: ["game-analyses", gameId],
    queryFn: async () => {
      if (!gameId) return [];

      const startTime = performance.now();

      // Les analyses peuvent être vides, optimiser la requête
      const { data, error } = await supabase
        .from("game_analyses")
        .select(
          "id, game_id, move_number, evaluation, best_move, mistake_level",
        )
        .eq("game_id", gameId)
        .order("move_number", { ascending: true });

      const fetchTime = performance.now() - startTime;
      console.log(`[useGame] Fetch analyses terminé en ${fetchTime}ms`);

      if (error) throw error;
      return (data as GameAnalysis[]) ?? [];
    },
    enabled: !!gameId,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    // Ne pas bloquer si les analyses sont lentes
    retry: 1,
  });

  console.log(
    `[useGame] 🔵 Hook terminé, temps total: ${performance.now() - hookStartTime}ms, game: ${game ? "✅" : "❌"}`,
  );

  return {
    game,
    analyses: analyses ?? [],
    isLoading: isLoadingMetadata || isLoadingAnalyses, // Ne pas attendre le PGN pour afficher la page
    isPgnLoading: isLoadingPgn,
    error,
  };
};
