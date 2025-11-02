import { useMemo, useCallback } from "react";
import { cache } from "@/utils/cache";
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { RefreshCw } from "lucide-react-native";
import { useQueryClient } from "@tanstack/react-query";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useGames } from "@/hooks/useGames";
import { useSyncGames } from "@/hooks/useSyncGames";
import { useChessPlatform } from "@/hooks/useChessPlatform";
import { useSupabase } from "@/hooks/useSupabase";
import { GameCard } from "@/components/games/GameCard";
import type { Game } from "@/types/games";
import { colors, spacing, typography, shadows, borders } from "@/theme";

interface GameSection {
  title: string;
  data: Game[];
}

const formatSectionDate = (dateString: string | null): string => {
  if (!dateString) return "Date inconnue";

  const date = new Date(dateString);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const gameDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  const diffInDays = Math.floor(
    (today.getTime() - gameDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffInDays === 0) return "Aujourd'hui";
  if (diffInDays === 1) return "Hier";
  if (diffInDays < 7) return `Il y a ${diffInDays} jours`;

  // Même année
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
    });
  }

  // Année différente
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

export default function GamesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { games, isLoading, refetch } = useGames();
  const { syncGames, isSyncing } = useSyncGames();
  const { platforms } = useChessPlatform();

  const queryClient = useQueryClient();
  const { supabase } = useSupabase();

  // Précharger les données de la partie au hover/press (pour mobile: onPressIn)
  // Optimisé : charger d'abord les métadonnées (ultra rapide), puis le PGN en parallèle
  const prefetchGameData = useCallback(
    async (gameId: string) => {
      // Vérifier si les métadonnées sont déjà en cache
      const cachedMetadata = queryClient.getQueryData([
        "game-metadata",
        gameId,
      ]);

      if (!cachedMetadata) {
        // Vérifier d'abord le cache persistant
        const persistentCache = await cache.get(`game-metadata-${gameId}`);
        if (persistentCache) {
          // Utiliser le cache persistant comme initialData
          queryClient.setQueryData(["game-metadata", gameId], persistentCache);
        } else {
          // Précharger les métadonnées (sans PGN) - utilise la même logique que useGame
          queryClient.prefetchQuery({
            queryKey: ["game-metadata", gameId],
            queryFn: async () => {
              // ESSAYER LE CACHE D'ABORD
              const cachedData = await cache.get(`game-metadata-${gameId}`);
              if (cachedData) {
                return cachedData;
              }

              // Si pas de cache, fetch depuis Supabase
              const { data, error } = await supabase
                .from("games")
                .select(
                  "id, platform, platform_game_id, white_player, black_player, result, time_control, played_at, analyzed_at",
                )
                .eq("id", gameId)
                .single();
              if (error) throw error;
              // Sauvegarder dans le cache persistant
              if (data) {
                cache.set(`game-metadata-${gameId}`, data);
              }
              return data;
            },
            staleTime: 10 * 60 * 1000,
          });
        }
      }

      // Précharger le PGN en parallèle (mais ne pas bloquer)
      const cachedPgn = queryClient.getQueryData(["game-pgn", gameId]);
      if (!cachedPgn) {
        // Vérifier d'abord le cache persistant
        const persistentPgn = await cache.get(`game-pgn-${gameId}`);
        if (persistentPgn !== null) {
          queryClient.setQueryData(["game-pgn", gameId], persistentPgn);
        } else {
          queryClient.prefetchQuery({
            queryKey: ["game-pgn", gameId],
            queryFn: async () => {
              // ESSAYER LE CACHE D'ABORD
              const cachedPgn = await cache.get<string>(`game-pgn-${gameId}`);
              if (cachedPgn) {
                return cachedPgn;
              }

              // Si pas de cache, fetch depuis Supabase
              const { data, error } = await supabase
                .from("games")
                .select("pgn")
                .eq("id", gameId)
                .single();
              if (error) throw error;
              const pgn = data?.pgn || null;
              // Sauvegarder dans le cache persistant
              if (pgn) {
                cache.set(`game-pgn-${gameId}`, pgn);
              }
              return pgn;
            },
            staleTime: 10 * 60 * 1000,
          });
        }
      }

      // Précharger aussi les analyses en parallèle
      const cachedAnalyses = queryClient.getQueryData([
        "game-analyses",
        gameId,
      ]);
      if (!cachedAnalyses) {
        queryClient.prefetchQuery({
          queryKey: ["game-analyses", gameId],
          queryFn: async () => {
            const { data, error } = await supabase
              .from("game_analyses")
              .select(
                "id, game_id, move_number, evaluation, best_move, mistake_level",
              )
              .eq("game_id", gameId)
              .order("move_number", { ascending: true });
            if (error) throw error;
            return data ?? [];
          },
          staleTime: 10 * 60 * 1000,
        });
      }
    },
    [queryClient, supabase],
  );

  const handleGamePress = (gameId: string) => {
    const clickTime = performance.now();
    console.log(`[GamesScreen] 🔵 Clic sur partie ${gameId} à ${clickTime}ms`);
    // Utiliser InteractionManager pour différer la navigation si nécessaire
    router.push(`/(protected)/game/${gameId}` as any);
    console.log(
      `[GamesScreen] 🔵 router.push appelé, temps: ${performance.now() - clickTime}ms`,
    );
  };

  const handleSync = async () => {
    try {
      await syncGames({ maxGames: 50 });
    } catch {
      // L'erreur est déjà gérée dans le hook avec Alert
    }
  };

  // Grouper les parties par date
  const groupedGames = useMemo(() => {
    const grouped = new Map<string, Game[]>();

    games.forEach((game) => {
      const dateKey = game.played_at
        ? new Date(game.played_at).toISOString().split("T")[0]
        : "unknown";

      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(game);
    });

    // Convertir en tableau et trier par date (plus récent en premier)
    const sections: GameSection[] = Array.from(grouped.entries())
      .map(([dateKey, gamesList]) => ({
        title: formatSectionDate(
          gamesList[0]?.played_at || new Date(dateKey).toISOString(),
        ),
        data: gamesList.sort((a, b) => {
          const dateA = a.played_at ? new Date(a.played_at).getTime() : 0;
          const dateB = b.played_at ? new Date(b.played_at).getTime() : 0;
          return dateB - dateA; // Plus récent en premier
        }),
      }))
      .sort((a, b) => {
        // Trier les sections par date (plus récent en premier)
        const dateA = a.data[0]?.played_at
          ? new Date(a.data[0].played_at).getTime()
          : 0;
        const dateB = b.data[0]?.played_at
          ? new Date(b.data[0].played_at).getTime()
          : 0;
        return dateB - dateA;
      });

    return sections;
  }, [games]);

  const renderGame = ({ item }: { item: Game }) => (
    <GameCard
      game={item}
      userPlatforms={platforms}
      onPress={() => handleGamePress(item.id)}
      onPressIn={() => prefetchGameData(item.id)}
    />
  );

  const renderSectionHeader = ({ section }: { section: GameSection }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      <Text style={styles.sectionCount}>
        {section.data.length} partie{section.data.length > 1 ? "s" : ""}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.titleSection}>
            <Text style={styles.title}>Mes parties</Text>
            <Text style={styles.count}>
              {games.length} partie{games.length > 1 ? "s" : ""}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.syncButton, isSyncing && styles.syncButtonDisabled]}
            onPress={handleSync}
            disabled={isSyncing}
            activeOpacity={0.7}
          >
            {isSyncing ? (
              <ActivityIndicator color={colors.text.inverse} size="small" />
            ) : (
              <>
                <RefreshCw size={16} color={colors.text.inverse} />
                <Text style={styles.syncButtonText}>Synchroniser</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <SectionList
        sections={groupedGames}
        renderItem={renderGame}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          games.length === 0 && styles.listEmpty,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor={colors.orange[500]}
            colors={[colors.orange[500]]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Aucune partie importée</Text>
            <Text style={styles.emptySubtext}>
              Ajoute ton username dans le profil pour synchroniser tes parties.
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        onViewableItemsChanged={useCallback(
          ({
            viewableItems,
          }: {
            viewableItems: Array<{ item: Game; index: number | null }>;
          }) => {
            // Précharger les parties visibles + les prochaines (pour un scroll fluide)
            viewableItems.forEach(({ item }: { item: Game }) => {
              if (item) {
                // Précharger la partie actuelle (idempotent, vérifie le cache avant)
                prefetchGameData(item.id);
              }
            });
          },
          [prefetchGameData],
        )}
        viewabilityConfig={{
          itemVisiblePercentThreshold: 50,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    backgroundColor: colors.background.secondary,
    borderBottomWidth: borders.width.thin,
    borderBottomColor: colors.border.light,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    paddingBottom: spacing[4],
    ...shadows.sm,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing[3],
  },
  titleSection: {
    flex: 1,
  },
  title: {
    fontSize: typography.fontSize["2xl"],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing[1],
  },
  count: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  syncButton: {
    backgroundColor: colors.orange[500],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: borders.radius.md,
    gap: spacing[2],
    minWidth: 120,
  },
  syncButtonDisabled: {
    opacity: 0.6,
  },
  syncButtonText: {
    color: colors.text.inverse,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  list: {
    padding: spacing[4],
    paddingBottom: spacing[8],
  },
  listEmpty: {
    flexGrow: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    marginTop: spacing[4],
    marginBottom: spacing[2],
    backgroundColor: colors.background.primary,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  sectionCount: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.medium,
  },
  emptyContainer: {
    flex: 1,
    padding: spacing[8],
    alignItems: "center",
    justifyContent: "center",
    minHeight: 300,
  },
  emptyText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.secondary,
    marginBottom: spacing[2],
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    textAlign: "center",
    lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
  },
});
