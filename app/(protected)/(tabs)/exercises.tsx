import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useExercises } from "@/hooks/useExercises";
import { ExerciseCard } from "@/components/exercises/ExerciseCard";
import type { Exercise } from "@/types/exercises";
import { colors, spacing, typography, borders } from "@/theme";

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
          <TouchableOpacity
            style={[
              styles.filter,
              filter === "all" && styles.filterActive,
            ]}
            onPress={() => setFilter("all")}
          >
            <Text
              style={[
                styles.filterText,
                filter === "all" && styles.filterTextActive,
              ]}
            >
              Tous
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filter,
              filter === "pending" && styles.filterActive,
            ]}
            onPress={() => setFilter("pending")}
          >
            <Text
              style={[
                styles.filterText,
                filter === "pending" && styles.filterTextActive,
              ]}
            >
              En attente
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filter,
              filter === "completed" && styles.filterActive,
            ]}
            onPress={() => setFilter("completed")}
          >
            <Text
              style={[
                styles.filterText,
                filter === "completed" && styles.filterTextActive,
              ]}
            >
              Terminés
            </Text>
          </TouchableOpacity>
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
    marginBottom: spacing[3],
  },
  filters: {
    flexDirection: "row",
    gap: spacing[4],
  },
  filter: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: borders.radius.md,
    backgroundColor: colors.background.tertiary,
  },
  filterActive: {
    backgroundColor: colors.orange[100],
  },
  filterText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  filterTextActive: {
    color: colors.orange[600],
    fontWeight: typography.fontWeight.semibold,
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