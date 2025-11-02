import { useState } from "react";
import { View, Text, StyleSheet, FlatList, RefreshControl } from "react-native";
import { useRouter } from "expo-router";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useGames } from "@/hooks/useGames";
import { GameCard } from "@/components/games/GameCard";
import type { Game } from "@/types/games";
import { colors, spacing, typography, borders } from "@/theme";

export default function GamesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { games, isLoading, refetch } = useGames();

  const handleGamePress = (gameId: string) => {
    router.push(`/(protected)/game/${gameId}` as any);
  };

  const renderGame = ({ item }: { item: Game }) => (
    <GameCard game={item} onPress={() => handleGamePress(item.id)} />
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Mes parties</Text>
        <Text style={styles.count}>
          {games.length} partie{games.length > 1 ? "s" : ""}
        </Text>
      </View>

      <FlatList
        data={games}
        renderItem={renderGame}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Aucune partie importée.</Text>
            <Text style={styles.emptySubtext}>
              Ajoute ton username dans le profil pour synchroniser tes parties.
            </Text>
          </View>
        }
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
    padding: spacing[4],
    backgroundColor: colors.background.secondary,
    borderBottomWidth: borders.width.thin,
    borderBottomColor: colors.border.light,
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
  list: {
    padding: spacing[4],
  },
  emptyContainer: {
    padding: spacing[8],
    alignItems: "center",
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
  },
});