import { useEffect, useRef, useCallback } from "react";
import { AppState, AppStateStatus } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useSyncGames } from "./useSyncGames";
import { useGames } from "./useGames";
import { useChessPlatform } from "./useChessPlatform";
import type { Game } from "@/types/games";

const STORAGE_KEY_LATEST_GAME_DATE = "latest_game_date";
const INITIAL_SYNC_GAMES = 10;

/**
 * Récupère la date de la partie la plus récente
 */
const getLatestGameDate = async (games: Game[]): Promise<number | null> => {
  if (games.length === 0) return null;

  const sortedGames = [...games].sort((a, b) => {
    const dateA = a.played_at ? new Date(a.played_at).getTime() : 0;
    const dateB = b.played_at ? new Date(b.played_at).getTime() : 0;
    return dateB - dateA;
  });

  const latestGame = sortedGames[0];
  if (!latestGame?.played_at) return null;

  return new Date(latestGame.played_at).getTime();
};

/**
 * Stocke la date de la partie la plus récente
 */
const saveLatestGameDate = async (timestamp: number | null): Promise<void> => {
  try {
    if (timestamp === null) {
      await AsyncStorage.removeItem(STORAGE_KEY_LATEST_GAME_DATE);
    } else {
      await AsyncStorage.setItem(
        STORAGE_KEY_LATEST_GAME_DATE,
        timestamp.toString(),
      );
    }
  } catch {
    // Ignore errors
  }
};

/**
 * Récupère la date de référence stockée
 */
const getStoredLatestGameDate = async (): Promise<number | null> => {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY_LATEST_GAME_DATE);
    if (!stored) return null;
    return parseInt(stored, 10);
  } catch {
    return null;
  }
};

/**
 * Hook pour la synchronisation automatique des parties
 * - Charge les 10 premières parties au démarrage
 * - Vérifie les nouvelles parties quand l'application devient active
 * - Ne charge que les parties plus récentes que la date de référence
 */
export const useAutoSync = () => {
  const { games, isLoading: isLoadingGames } = useGames();
  const { platforms } = useChessPlatform();
  const { syncGames } = useSyncGames({ silent: true });

  const isCheckingRef = useRef(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // Fonction pour obtenir la date de référence
  const getReferenceDate = useCallback(async (): Promise<number | null> => {
    const latestDate = await getLatestGameDate(games);
    if (latestDate) return latestDate;
    return await getStoredLatestGameDate();
  }, [games]);

  // Synchronisation initiale : charger les 10 premières parties
  useEffect(() => {
    if (!isLoadingGames && games.length === 0 && platforms.length > 0) {
      syncGames({ maxGames: INITIAL_SYNC_GAMES }).catch(() => {
        // Ignore errors
      });
    }
  }, [isLoadingGames, games.length, platforms.length, syncGames]);

  // Mettre à jour la date de référence après chaque chargement de parties
  useEffect(() => {
    if (!isLoadingGames && games.length > 0) {
      getLatestGameDate(games).then((date) => {
        if (date) {
          saveLatestGameDate(date);
        }
      });
    }
  }, [games, isLoadingGames]);

  // Fonction pour vérifier les nouvelles parties
  const checkForNewGames = useCallback(async () => {
    if (games.length === 0 || platforms.length === 0 || isCheckingRef.current) {
      return;
    }

    isCheckingRef.current = true;

    const referenceDate = await getReferenceDate();
    if (!referenceDate) {
      isCheckingRef.current = false;
      return;
    }

    try {
      await syncGames({
        maxGames: 50,
        since: referenceDate,
      });
    } catch {
      // Ignore errors
    } finally {
      isCheckingRef.current = false;
    }
  }, [platforms.length, games.length, syncGames, getReferenceDate]);

  // Vérifier les nouvelles parties quand l'application devient active
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        checkForNewGames();
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [checkForNewGames]);
};
