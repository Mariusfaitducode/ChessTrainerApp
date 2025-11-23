import { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useExercises } from "@/hooks/useExercises";
import { usePrompts } from "@/hooks/usePrompts";
import { ExerciseCard } from "@/components/exercises/ExerciseCard";
import { SignUpPrompt } from "@/components/prompts/SignUpPrompt";
import type { Exercise } from "@/types/exercises";
import { colors, spacing, typography, borders } from "@/theme";

interface ExerciseSection {
  title: string;
  data: Exercise[];
}

export default function ExercisesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  // Ne garder que "pending" et "completed"
  const [filter, setFilter] = useState<"pending" | "completed">("pending");
  const { exercises, isLoading, refetch } = useExercises(
    filter === "completed",
  );
  const { showExercisePrompt, dismissExercisePrompt } = usePrompts();

  const filteredExercises =
    filter === "pending"
      ? exercises.filter((e) => !e.completed)
      : exercises.filter((e) => e.completed);

  // Grouper les exercices par adversaire
  const groupedExercises = useMemo(() => {
    const grouped = new Map<string, Exercise[]>();

    filteredExercises.forEach((exercise) => {
      const opponentKey = exercise.opponent || "Adversaire inconnu";

      if (!grouped.has(opponentKey)) {
        grouped.set(opponentKey, []);
      }
      grouped.get(opponentKey)!.push(exercise);
    });

    // Convertir en tableau et trier par nombre d'exercices (plus d'exercices en premier)
    const sections: ExerciseSection[] = Array.from(grouped.entries())
      .map(([opponent, exercisesList]) => ({
        title: opponent,
        data: exercisesList.sort((a, b) => {
          // Trier d'abord par move_number (croissant)
          const moveA = a.move_number ?? 0;
          const moveB = b.move_number ?? 0;
          if (moveA !== moveB) {
            return moveA - moveB;
          }
          // Si même move_number, trier par date de création (plus récent en premier)
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return dateB - dateA;
        }),
      }))
      .sort((a, b) => {
        // Trier les sections par nombre d'exercices (plus d'exercices en premier)
        return b.data.length - a.data.length;
      });

    return sections;
  }, [filteredExercises]);

  const handleExercisePress = (exerciseId: string) => {
    router.push(`/(protected)/exercise/${exerciseId}` as any);
  };

  const renderExercise = ({ item }: { item: Exercise }) => (
    <ExerciseCard
      exercise={item}
      onPress={() => handleExercisePress(item.id)}
    />
  );

  const renderSectionHeader = ({ section }: { section: ExerciseSection }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      <Text style={styles.sectionCount}>
        {section.data.length} exercice{section.data.length > 1 ? "s" : ""}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Mes exercices</Text>
        <View style={styles.filters}>
          <TouchableOpacity
            style={[styles.filter, filter === "pending" && styles.filterActive]}
            onPress={() => setFilter("pending")}
            activeOpacity={0.7}
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
            activeOpacity={0.7}
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

      <SectionList
        sections={groupedExercises}
        renderItem={renderExercise}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          filteredExercises.length === 0 && styles.listEmpty,
        ]}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.text.primary} colors={[colors.text.primary]}/>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {filter === "pending"
                ? "Aucun exercice en attente."
                : "Aucun exercice terminé."}
            </Text>
            <Text style={styles.emptySubtext}>
              Analyse tes parties pour générer des exercices personnalisés.
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
      />

      <SignUpPrompt
        visible={showExercisePrompt}
        onDismiss={dismissExercisePrompt}
        type="exercise"
        count={exercises.filter((e) => e.completed).length}
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
    paddingHorizontal: spacing[6],
    paddingTop: spacing[4],
    paddingBottom: spacing[4],
    backgroundColor: colors.background.primary,
  },
  title: {
    fontFamily: typography.fontFamily.display, // Patrick Hand
    fontSize: 32,
    color: colors.text.primary,
    marginBottom: spacing[4],
  },
  filters: {
    flexDirection: "row",
    gap: spacing[3],
  },
  filter: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    borderRadius: borders.radius.full,
    backgroundColor: colors.background.primary,
    borderWidth: borders.width.thin,
    borderColor: colors.border.medium,
  },
  filterActive: {
    backgroundColor: colors.text.primary,
    borderColor: colors.text.primary,
  },
  filterText: {
    fontFamily: typography.fontFamily.body, // System
    fontSize: 14,
    fontWeight: "600",
    color: colors.text.primary,
  },
  filterTextActive: {
    color: colors.text.inverse,
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
    fontFamily: typography.fontFamily.display, // Patrick Hand
    fontSize: 22,
    color: colors.text.primary,
  },
  sectionCount: {
    fontFamily: typography.fontFamily.body, // System
    fontSize: 14,
    color: colors.text.secondary,
  },
  emptyContainer: {
    padding: spacing[8],
    alignItems: "center",
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
