import { useState } from "react";
import { View, Text, StyleSheet, FlatList, RefreshControl } from "react-native";
import { useRouter } from "expo-router";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useExercises } from "@/hooks/useExercises";
import { ExerciseCard } from "@/components/exercises/ExerciseCard";
import type { Exercise } from "@/types/exercises";

export default function ExercisesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("all");
  const { exercises, isLoading, refetch } = useExercises(
    filter === "all" ? undefined : filter === "completed"
  );

  const filteredExercises =
    filter === "all"
      ? exercises
      : filter === "pending"
      ? exercises.filter((e) => !e.completed)
      : exercises.filter((e) => e.completed);

  const handleExercisePress = (exerciseId: string) => {
    router.push(`/(protected)/exercise/${exerciseId}` as any);
  };

  const renderExercise = ({ item }: { item: Exercise }) => (
    <ExerciseCard
      exercise={item}
      onPress={() => handleExercisePress(item.id)}
    />
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Mes exercices</Text>
        <View style={styles.filters}>
          <Text
            style={[styles.filter, filter === "all" && styles.filterActive]}
            onPress={() => setFilter("all")}
          >
            Tous
          </Text>
          <Text
            style={[
              styles.filter,
              filter === "pending" && styles.filterActive,
            ]}
            onPress={() => setFilter("pending")}
          >
            En attente
          </Text>
          <Text
            style={[
              styles.filter,
              filter === "completed" && styles.filterActive,
            ]}
            onPress={() => setFilter("completed")}
          >
            Terminés
          </Text>
        </View>
      </View>

      <FlatList
        data={filteredExercises}
        renderItem={renderExercise}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {filter === "pending"
                ? "Aucun exercice en attente."
                : filter === "completed"
                ? "Aucun exercice terminé."
                : "Aucun exercice disponible."}
            </Text>
            <Text style={styles.emptySubtext}>
              Analyse tes parties pour générer des exercices personnalisés.
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
    marginBottom: 12,
  },
  filters: {
    flexDirection: "row",
    gap: 16,
  },
  filter: {
    fontSize: 14,
    color: "#666",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "#f0f0f0",
    overflow: "hidden",
  },
  filterActive: {
    color: "#2196F3",
    backgroundColor: "#E3F2FD",
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
