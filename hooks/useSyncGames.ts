import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";

import { useDataService } from "./useDataService";
import { useSupabase } from "./useSupabase";
import { useChessPlatform } from "./useChessPlatform";
import { useGuestMode } from "./useGuestMode";
import type { Platform } from "@/types/chess";
import { getAllPlayerGames, type ChessComGame } from "@/services/chesscom/api";
import {
  getUserGames,
  type LichessGame,
} from "@/services/lichess/api";
import { prepareGamesForInsert } from "@/services/sync/games";

/**
 * Hook pour synchroniser les parties depuis les plateformes
 */
export const useSyncGames = () => {
  const dataService = useDataService();
  const { supabase, session } = useSupabase();
  const { platforms } = useChessPlatform();
  const { isGuest } = useGuestMode();
  const queryClient = useQueryClient();

  const syncGames = useMutation({
    mutationFn: async ({
      maxGames = 50,
      platform,
    }: {
      maxGames?: number;
      platform?: Platform;
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
          console.log(
            `[Sync] Récupération des parties pour ${userPlatform.platform} (${userPlatform.platform_username})`,
          );

          // Récupérer les parties depuis l'API
          let apiGames: (ChessComGame | LichessGame)[] = [];

          if (userPlatform.platform === "chesscom") {
            const months = Math.ceil(maxGames / 50);
            console.log(
              `[Sync] Chess.com: récupération de ${Math.min(months, 12)} mois`,
            );
            apiGames = await getAllPlayerGames(
              userPlatform.platform_username,
              Math.min(months, 12),
            );
            console.log(
              `[Sync] Chess.com: ${apiGames.length} parties récupérées`,
            );
            apiGames = apiGames.slice(0, maxGames);
            console.log(
              `[Sync] Chess.com: ${apiGames.length} parties après limite`,
            );
          } else if (userPlatform.platform === "lichess") {
            console.log(`[Sync] Lichess: récupération de ${maxGames} parties`);
            apiGames = await getUserGames(
              userPlatform.platform_username,
              maxGames,
            );
            console.log(
              `[Sync] Lichess: ${apiGames.length} parties récupérées`,
            );
          }

          if (apiGames.length === 0) {
            console.warn(
              `[Sync] Aucune partie trouvée pour ${userPlatform.platform}`,
            );
            continue;
          }

          console.log(`[Sync] Conversion de ${apiGames.length} parties...`);

          // Convertir les parties au format DB
          const userId = isGuest ? "guest" : session!.user.id;
          const gamesToInsert = await prepareGamesForInsert(
            userPlatform.platform,
            apiGames,
            userId,
          );

          console.log(`[Sync] ${gamesToInsert.length} parties converties`);

          if (gamesToInsert.length === 0) {
            console.warn(
              `[Sync] Aucune partie n'a pu être convertie pour ${userPlatform.platform}`,
            );
            continue;
          }

          // Récupérer les parties existantes pour détecter les doublons
          const existingGames = await dataService.getGames();
          const existingIds = new Set(
            existingGames.map(
              (g) => `${g.platform}_${g.platform_game_id}`,
            ),
          );

          // Filtrer les nouvelles parties
          const newGames = gamesToInsert.filter(
            (g) => !existingIds.has(`${g.platform}_${g.platform_game_id}`),
          );

          console.log(
            `[Sync] ${newGames.length} nouvelles parties (${gamesToInsert.length - newGames.length} déjà existantes)`,
          );

          if (newGames.length === 0) {
            totalSkipped += gamesToInsert.length;
            console.log(`[Sync] Toutes les parties sont déjà importées`);
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

      console.log(
        `[Sync] Résultat: ${totalImported} importées, ${totalSkipped} ignorées, ${totalErrors} erreurs`,
      );

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
