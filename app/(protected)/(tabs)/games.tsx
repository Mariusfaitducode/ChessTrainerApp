import { useMemo } from "react";
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

import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useGames } from "@/hooks/useGames";
import { useSyncGames } from "@/hooks/useSyncGames";
import { useChessPlatform } from "@/hooks/useChessPlatform";
import { useSupabase } from "@/hooks/useSupabase";
import { usePrompts } from "@/hooks/usePrompts";
import { GameCard } from "@/components/games/GameCard";
import { GuestIndicator } from "@/components/prompts/GuestIndicator";
import { SignUpPrompt } from "@/components/prompts/SignUpPrompt";
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
  const { showSyncPrompt, dismissSyncPrompt } = usePrompts();

  const handleGamePress = (gameId: string) => {
    router.push(`/(protected)/game/${gameId}` as any);
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
      isAnalyzing={false} // TODO: Passer le statut réel depuis useAnalyzeGames
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
      <GuestIndicator />
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
              <ActivityIndicator color={colors.text.primary} size="small" />
            ) : (
              <>
                <RefreshCw
                  size={18}
                  color={colors.text.primary}
                  strokeWidth={1.5}
                />
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
            tintColor={colors.text.primary}
            colors={[colors.text.primary]}
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
      />

      <SignUpPrompt
        visible={showSyncPrompt}
        onDismiss={dismissSyncPrompt}
        type="sync"
        count={games.length}
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
    backgroundColor: colors.background.primary,
    paddingHorizontal: spacing[6],
    paddingTop: spacing[4],
    paddingBottom: spacing[4],
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing[3],
  },
  titleSection: {
    flex: 1,
  },
  title: {
    fontFamily: typography.fontFamily.display, // Patrick Hand
    fontSize: 32,
    color: colors.text.primary,
    marginBottom: spacing[1],
  },
  count: {
    fontFamily: typography.fontFamily.body, // System
    fontSize: 16,
    color: colors.text.secondary,
  },
  syncButton: {
    backgroundColor: colors.background.secondary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borders.radius.button,
    gap: spacing[2],
    ...shadows.sm,
  },
  syncButtonDisabled: {
    opacity: 0.6,
    backgroundColor: colors.background.tertiary,
  },
  syncButtonText: {
    color: colors.text.primary,
    fontFamily: typography.fontFamily.body, // System
    fontSize: 14,
    fontWeight: "600",
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
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[2],
    marginTop: spacing[4],
    marginBottom: spacing[2],
    backgroundColor: colors.background.primary,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.heading,
    fontSize: 13,
    fontWeight: "700",
    color: colors.text.tertiary,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  sectionCount: {
    fontFamily: typography.fontFamily.body, // System
    fontSize: 14,
    color: colors.text.secondary,
  },
  emptyContainer: {
    flex: 1,
    padding: spacing[8],
    alignItems: "center",
    justifyContent: "center",
    minHeight: 300,
  },
  emptyText: {
    fontFamily: typography.fontFamily.body, // System
    fontSize: 18,
    fontWeight: "600",
    color: colors.text.secondary,
    marginBottom: spacing[2],
    textAlign: "center",
  },
  emptySubtext: {
    fontFamily: typography.fontFamily.body, // System
    fontSize: 14,
    color: colors.text.tertiary,
    textAlign: "center",
  },
});
