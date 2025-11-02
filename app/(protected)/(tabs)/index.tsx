import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useGames } from "@/hooks/useGames";
import { useExercises } from "@/hooks/useExercises";
import { colors, spacing, typography, shadows, borders } from "@/theme";

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const {
    games,
    isLoading: isLoadingGames,
    refetch: refetchGames,
  } = useGames();
  const {
    exercises,
    isLoading: isLoadingExercises,
    refetch: refetchExercises,
  } = useExercises();

  const isLoading = isLoadingGames || isLoadingExercises;

  const onRefresh = async () => {
    await Promise.all([refetchGames(), refetchExercises()]);
  };

  const pendingExercises = exercises.filter((e) => !e.completed);
  const recentGames = games.slice(0, 5);

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={onRefresh} />
      }
    >
      <Text style={styles.title}>Dashboard</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Statistiques</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{games.length}</Text>
            <Text style={styles.statLabel}>Parties</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{exercises.length}</Text>
            <Text style={styles.statLabel}>Exercices</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{pendingExercises.length}</Text>
            <Text style={styles.statLabel}>En attente</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dernières parties</Text>
        {recentGames.length === 0 ? (
          <Text style={styles.emptyText}>
            Aucune partie. Synchronise tes comptes pour importer tes parties.
          </Text>
        ) : (
          <Text style={styles.infoText}>
            {recentGames.length} partie{recentGames.length > 1 ? "s" : ""}{" "}
            récente{recentGames.length > 1 ? "s" : ""}
          </Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Exercices disponibles</Text>
        {pendingExercises.length === 0 ? (
          <Text style={styles.emptyText}>
            Aucun exercice en attente. Analyse tes parties pour générer des
            exercices.
          </Text>
        ) : (
          <Text style={styles.infoText}>
            {pendingExercises.length} exercice
            {pendingExercises.length > 1 ? "s" : ""} à résoudre
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  content: {
    padding: spacing[4],
  },
  title: {
    fontSize: typography.fontSize["3xl"],
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing[6],
    color: colors.text.primary,
  },
  section: {
    marginBottom: spacing[6],
  },
  sectionTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing[3],
    color: colors.text.primary,
  },
  statsGrid: {
    flexDirection: "row",
    gap: spacing[3],
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.background.secondary,
    borderRadius: borders.radius.lg,
    padding: spacing[4],
    alignItems: "center",
    ...shadows.sm,
  },
  statNumber: {
    fontSize: typography.fontSize["3xl"],
    fontWeight: typography.fontWeight.bold,
    color: colors.orange[500],
    marginBottom: spacing[1],
  },
  statLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    fontStyle: "italic",
    paddingVertical: spacing[4],
  },
  infoText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    paddingVertical: spacing[2],
  },
});
