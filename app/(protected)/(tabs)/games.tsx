import { useState } from "react";
import { View, Text, StyleSheet, FlatList, RefreshControl } from "react-native";
import { useRouter } from "expo-router";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useGames } from "@/hooks/useGames";
import { GameCard } from "@/components/games/GameCard";
import type { Game } from "@/types/games";

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
        <Text style={styles.count}>{games.length} partie{games.length > 1 ? "s" : ""}</Text>
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
            <Text style={styles.emptyText}>
              Aucune partie importée.
            </Text>
            <Text style={styles.emptySubtext}>
              Connecte ton compte Lichess ou Chess.com pour synchroniser tes
              parties.
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
    backgroundColor: "#f5f5f5",
  },
  header: {
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 4,
  },
  count: {
    fontSize: 14,
    color: "#666",
  },
  list: {
    padding: 16,
  },
  emptyContainer: {
    padding: 32,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
});
