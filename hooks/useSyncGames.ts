import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";

import { useDataService } from "./useDataService";
import { useSupabase } from "./useSupabase";
import { useChessPlatform } from "./useChessPlatform";
import { useGuestMode } from "./useGuestMode";
import type { Platform } from "@/types/chess";
import { getAllPlayerGames, type ChessComGame } from "@/services/chesscom/api";
import { getUserGames, type LichessGame } from "@/services/lichess/api";
import { prepareGamesForInsert } from "@/services/sync/games";

/**
 * Hook pour synchroniser les parties depuis les plateformes
 */
export const useSyncGames = (options?: {
  onSuccess?: (result: {
    imported: number;
    skipped: number;
    errors: number;
  }) => void;
  onError?: (error: Error) => void;
  silent?: boolean;
}) => {
  const dataService = useDataService();
  const { supabase, session } = useSupabase();
  const { platforms } = useChessPlatform();
  const { isGuest } = useGuestMode();
  const queryClient = useQueryClient();

  const syncGames = useMutation({
    mutationFn: async ({
      maxGames = 50,
      platform,
      since,
    }: {
      maxGames?: number;
      platform?: Platform;
      since?: number; // Timestamp de référence : ne récupérer que les parties plus récentes
    } = {}) => {
      const platformsToSync = platform
        ? platforms.filter((p) => p.platform === platform)
        : platforms;

      if (platformsToSync.length === 0) {
        throw new Error(
          "Aucun username configuré. Ajoute un username dans l'onglet Profil.",
        );
      }

      let totalImported = 0;
      let totalSkipped = 0;
      let totalErrors = 0;

      for (const userPlatform of platformsToSync) {
        try {
          // Récupérer les parties depuis l'API
          let apiGames: (ChessComGame | LichessGame)[] = [];

          if (userPlatform.platform === "chesscom") {
            const months = Math.ceil(maxGames / 50);
            apiGames = await getAllPlayerGames(
              userPlatform.platform_username,
              Math.min(months, 12),
            );

            // Filtrer par date si since est fourni
            if (since) {
              const sinceDate = new Date(since);
              apiGames = apiGames.filter((game) => {
                const gameDate = new Date(game.end_time * 1000);
                return gameDate > sinceDate;
              });
            }

            apiGames = apiGames.slice(0, maxGames);
          } else if (userPlatform.platform === "lichess") {
            apiGames = await getUserGames(
              userPlatform.platform_username,
              maxGames,
              since,
            );
          }

          if (apiGames.length === 0) {
            continue;
          }

          // Convertir les parties au format DB
          const userId = isGuest ? "guest" : session!.user.id;
          const gamesToInsert = await prepareGamesForInsert(
            userPlatform.platform,
            apiGames,
            userId,
          );

          if (gamesToInsert.length === 0) {
            continue;
          }

          // Récupérer les parties existantes pour détecter les doublons
          const existingGames = await dataService.getGames();
          const existingIds = new Set(
            existingGames.map((g) => `${g.platform}_${g.platform_game_id}`),
          );

          // Filtrer les nouvelles parties
          const newGames = gamesToInsert.filter(
            (g) => !existingIds.has(`${g.platform}_${g.platform_game_id}`),
          );

          if (newGames.length === 0) {
            totalSkipped += gamesToInsert.length;
            continue;
          }

          // Ajouter les nouvelles parties via le service unifié
          for (const game of newGames) {
            await dataService.addGame(game);
          }

          totalImported += newGames.length;
          totalSkipped += gamesToInsert.length - newGames.length;

          // Mettre à jour last_sync_at (seulement en mode authentifié)
          if (!isGuest && userPlatform.id) {
            await supabase
              .from("user_platforms")
              .update({ last_sync_at: new Date().toISOString() })
              .eq("id", userPlatform.id);
          }
        } catch (error: any) {
          console.error(
            `Erreur lors de la sync pour ${userPlatform.platform}:`,
            error,
          );
          totalErrors++;
          throw new Error(
            `Erreur lors de la synchronisation de ${userPlatform.platform}: ${
              error?.message || "Erreur inconnue"
            }`,
          );
        }
      }

      if (totalImported === 0 && totalSkipped === 0 && totalErrors === 0) {
        throw new Error(
          "Aucune partie trouvée. Vérifie que le username est correct et qu'il a des parties.",
        );
      }

      return {
        imported: totalImported,
        skipped: totalSkipped,
        errors: totalErrors,
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["games"] });

      if (options?.onSuccess) {
        options.onSuccess(result);
        return;
      }

      if (options?.silent) return;

      if (result.imported === 0 && result.skipped > 0) {
        Alert.alert(
          "Synchronisation terminée",
          `Toutes les parties sont déjà importées (${result.skipped} parties vérifiées)`,
        );
      } else if (result.imported > 0) {
        Alert.alert(
          "Synchronisation réussie",
          `${result.imported} nouvelle${result.imported > 1 ? "s" : ""} partie${result.imported > 1 ? "s" : ""} importée${result.imported > 1 ? "s" : ""}`,
        );
      } else {
        Alert.alert(
          "Synchronisation",
          `Aucune nouvelle partie trouvée. Vérifie que le username est correct et qu'il a des parties récentes.`,
        );
      }
    },
    onError: (error: any) => {
      if (options?.onError) {
        options.onError(error);
        return;
      }

      if (options?.silent) return;

      Alert.alert(
        "Erreur de synchronisation",
        error?.message || "Une erreur est survenue",
      );
    },
  });

  return {
    syncGames: syncGames.mutateAsync,
    isSyncing: syncGames.isPending,
  };
};
