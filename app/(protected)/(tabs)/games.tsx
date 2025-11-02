import { useState } from "react";
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

import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useGames } from "@/hooks/useGames";
import { useSyncGames } from "@/hooks/useSyncGames";
import { GameCard } from "@/components/games/GameCard";
import type { Game } from "@/types/games";

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
    } catch (error) {
      // L'erreur est déjà gérée dans le hook avec Alert
    }
  };

  const renderGame = ({ item }: { item: Game }) => (
    <GameCard game={item} onPress={() => handleGamePress(item.id)} />
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.title}>Mes parties</Text>
            <Text style={styles.count}>
              {games.length} partie{games.length > 1 ? "s" : ""}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.syncButton, isSyncing && styles.syncButtonDisabled]}
            onPress={handleSync}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.syncButtonText}>Synchroniser</Text>
            )}
          </TouchableOpacity>
        </View>
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
    backgroundColor: "#f5f5f5",
  },
  header: {
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  syncButton: {
    backgroundColor: "#2196F3",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  syncButtonDisabled: {
    opacity: 0.6,
  },
  syncButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
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