import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";

import { useSupabase } from "./useSupabase";
import { useChessPlatform } from "./useChessPlatform";
import type { Platform } from "@/types/chess";
import { getAllPlayerGames, type ChessComGame } from "@/services/chesscom/api";
import { getUserGames, getGamePGN, type LichessGame } from "@/services/lichess/api";
import { prepareGamesForInsert } from "@/services/sync/games";

/**
 * Hook pour synchroniser les parties depuis les plateformes
 */
export const useSyncGames = () => {
  const { supabase, session } = useSupabase();
  const { platforms } = useChessPlatform();
  const queryClient = useQueryClient();

  const syncGames = useMutation({
    mutationFn: async ({
      maxGames = 50,
      platform,
    }: {
      maxGames?: number;
      platform?: Platform;
    } = {}) => {
      if (!session?.user) {
        throw new Error("Vous devez être connecté pour synchroniser les parties");
      }

      const platformsToSync = platform
        ? platforms.filter((p) => p.platform === platform)
        : platforms;

      if (platformsToSync.length === 0) {
        throw new Error(
          "Aucun username configuré. Ajoute un username dans l'onglet Profil."
        );
      }

      let totalImported = 0;
      let totalSkipped = 0;
      let totalErrors = 0;

      for (const userPlatform of platformsToSync) {
        try {
          console.log(`[Sync] Récupération des parties pour ${userPlatform.platform} (${userPlatform.platform_username})`);
          
          // Récupérer les parties depuis l'API
          let apiGames: (ChessComGame | LichessGame)[] = [];

          if (userPlatform.platform === "chesscom") {
            const months = Math.ceil(maxGames / 50);
            console.log(`[Sync] Chess.com: récupération de ${Math.min(months, 12)} mois`);
            apiGames = await getAllPlayerGames(
              userPlatform.platform_username,
              Math.min(months, 12)
            );
            console.log(`[Sync] Chess.com: ${apiGames.length} parties récupérées`);
            apiGames = apiGames.slice(0, maxGames);
            console.log(`[Sync] Chess.com: ${apiGames.length} parties après limite`);
          } else if (userPlatform.platform === "lichess") {
            console.log(`[Sync] Lichess: récupération de ${maxGames} parties`);
            apiGames = await getUserGames(userPlatform.platform_username, maxGames);
            console.log(`[Sync] Lichess: ${apiGames.length} parties récupérées`);
          }

          if (apiGames.length === 0) {
            console.warn(`[Sync] Aucune partie trouvée pour ${userPlatform.platform}`);
            continue;
          }

          console.log(`[Sync] Conversion de ${apiGames.length} parties...`);

          // Convertir les parties au format DB
          const gamesToInsert = await prepareGamesForInsert(
            userPlatform.platform,
            apiGames,
            session.user.id
          );

          console.log(`[Sync] ${gamesToInsert.length} parties converties`);

          if (gamesToInsert.length === 0) {
            console.warn(`[Sync] Aucune partie n'a pu être convertie pour ${userPlatform.platform}`);
            continue;
          }

          // Vérifier quelles parties existent déjà
          const platformGameIds = gamesToInsert.map((g) => g.platform_game_id);
          console.log(`[Sync] Vérification des doublons parmi ${platformGameIds.length} parties...`);
          
          let existingGames: { platform_game_id: string }[] = [];
          if (platformGameIds.length > 0) {
            // Supabase .in() a une limite, on doit gérer ça par batch si nécessaire
            const { data, error } = await supabase
              .from("games")
              .select("platform_game_id")
              .eq("user_id", session.user.id)
              .eq("platform", userPlatform.platform)
              .in("platform_game_id", platformGameIds);
            
            if (error) {
              console.error("[Sync] Erreur lors de la vérification des doublons:", error);
            } else {
              existingGames = data || [];
            }
          }

          const existingIds = new Set(
            existingGames?.map((g) => g.platform_game_id) || []
          );

          // Filtrer les nouvelles parties
          const newGames = gamesToInsert.filter(
            (g) => !existingIds.has(g.platform_game_id)
          );

          console.log(`[Sync] ${newGames.length} nouvelles parties (${gamesToInsert.length - newGames.length} déjà existantes)`);

          if (newGames.length === 0) {
            totalSkipped += gamesToInsert.length;
            console.log(`[Sync] Toutes les parties sont déjà importées`);
            continue;
          }

          console.log(`[Sync] Insertion de ${newGames.length} nouvelles parties...`);
          
          // Insérer les nouvelles parties
          const { error: insertError, data } = await supabase
            .from("games")
            .insert(newGames)
            .select();

          if (insertError) {
            console.error("Erreur lors de l'insertion:", insertError);
            totalErrors += newGames.length;
          } else {
            totalImported += data?.length || 0;
            totalSkipped += gamesToInsert.length - (data?.length || 0);
          }

          // Mettre à jour last_sync_at
          await supabase
            .from("user_platforms")
            .update({ last_sync_at: new Date().toISOString() })
            .eq("id", userPlatform.id);
        } catch (error: any) {
          console.error(`Erreur lors de la sync pour ${userPlatform.platform}:`, error);
          totalErrors++;
          throw new Error(
            `Erreur lors de la synchronisation de ${userPlatform.platform}: ${
              error?.message || "Erreur inconnue"
            }`
          );
        }
      }

      console.log(`[Sync] Résultat: ${totalImported} importées, ${totalSkipped} ignorées, ${totalErrors} erreurs`);

      if (totalImported === 0 && totalSkipped === 0 && totalErrors === 0) {
        throw new Error("Aucune partie trouvée. Vérifie que le username est correct et qu'il a des parties.");
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
          `Toutes les parties sont déjà importées (${result.skipped} parties vérifiées)`
        );
      } else if (result.imported > 0) {
        Alert.alert(
          "Synchronisation réussie",
          `${result.imported} nouvelle${result.imported > 1 ? "s" : ""} partie${result.imported > 1 ? "s" : ""} importée${result.imported > 1 ? "s" : ""}`
        );
      } else {
        Alert.alert(
          "Synchronisation",
          `Aucune nouvelle partie trouvée. Vérifie que le username est correct et qu'il a des parties récentes.`
        );
      }
    },
    onError: (error: any) => {
      Alert.alert("Erreur de synchronisation", error?.message || "Une erreur est survenue");
    },
  });

  return {
    syncGames: syncGames.mutateAsync,
    isSyncing: syncGames.isPending,
  };
};
