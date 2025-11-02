import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { RefreshCw } from "lucide-react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useGames } from "@/hooks/useGames";
import { useSyncGames } from "@/hooks/useSyncGames";
import { GameCard } from "@/components/games/GameCard";
import type { Game } from "@/types/games";
import { colors, spacing, typography, shadows, borders } from "@/theme";

export default function GamesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { games, isLoading, refetch } = useGames();
  const { syncGames, isSyncing } = useSyncGames();

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

  const renderGame = ({ item }: { item: Game }) => (
    <GameCard game={item} onPress={() => handleGamePress(item.id)} />
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

      <FlatList
        data={games}
        renderItem={renderGame}
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
