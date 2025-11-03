import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Brain } from "lucide-react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useGames } from "@/hooks/useGames";
import { useExercises } from "@/hooks/useExercises";
import { useAnalyzeGames } from "@/hooks/useAnalyzeGames";
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
  const { analyzeGames, isAnalyzing, progress } = useAnalyzeGames();
  const [analyzingGameId, setAnalyzingGameId] = useState<string | null>(null);

  const isLoading = isLoadingGames || isLoadingExercises;

  const onRefresh = async () => {
    await Promise.all([refetchGames(), refetchExercises()]);
  };

  const pendingExercises = exercises.filter((e) => !e.completed);
  const recentGames = games.slice(0, 5);

  // Obtenir les 5 dernières parties non analysées
  const unanalyzedGames = games.filter((g) => !g.analyzed_at).slice(0, 5);

  const handleAnalyzeFirst = async () => {
    if (unanalyzedGames.length === 0) {
      return;
    }

    const firstGame = unanalyzedGames[0];
    setAnalyzingGameId(firstGame.id);

    try {
      await analyzeGames({ games: [firstGame] });
      // Rafraîchir les données après analyse
      await Promise.all([refetchGames(), refetchExercises()]);
    } catch {
      // L'erreur est déjà gérée dans le hook avec Alert
    } finally {
      setAnalyzingGameId(null);
    }
  };

  // Calculer le progress pour la partie en cours d'analyse
  const currentProgress = analyzingGameId ? progress[analyzingGameId] : null;
  const progressPercent =
    currentProgress && currentProgress.total > 0
      ? Math.round((currentProgress.current / currentProgress.total) * 100)
      : 0;

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
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Analyse</Text>
          {unanalyzedGames.length > 0 && (
            <TouchableOpacity
              style={[
                styles.analyzeButton,
                isAnalyzing && styles.analyzeButtonDisabled,
              ]}
              onPress={handleAnalyzeFirst}
              disabled={isAnalyzing}
              activeOpacity={0.7}
            >
              {isAnalyzing ? (
                <>
                  <ActivityIndicator
                    color={colors.text.inverse}
                    size="small"
                    style={styles.buttonSpinner}
                  />
                  <Text style={styles.analyzeButtonText}>
                    Analyse en cours...
                  </Text>
                </>
              ) : (
                <>
                  <Brain size={16} color={colors.text.inverse} />
                  <Text style={styles.analyzeButtonText}>
                    Analyser la prochaine
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
        {isAnalyzing && currentProgress && currentProgress.total > 0 && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[styles.progressFill, { width: `${progressPercent}%` }]}
              />
            </View>
            <Text style={styles.progressText}>
              {progressPercent}% ({currentProgress.current}/
              {currentProgress.total} coups analysés)
            </Text>
          </View>
        )}
        {unanalyzedGames.length === 0 && games.length > 0 ? (
          <Text style={styles.infoText}>
            Toutes les parties ont déjà été analysées
          </Text>
        ) : unanalyzedGames.length === 0 ? (
          <Text style={styles.emptyText}>
            Aucune partie. Synchronise tes comptes pour importer tes parties.
          </Text>
        ) : (
          <Text style={styles.infoText}>
            {unanalyzedGames.length} partie
            {unanalyzedGames.length > 1 ? "s" : ""} non analysée
            {unanalyzedGames.length > 1 ? "s" : ""} disponible
            {unanalyzedGames.length > 1 ? "s" : ""}
          </Text>
        )}
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
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing[3],
  },
  analyzeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    backgroundColor: colors.orange[500],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borders.radius.md,
    ...shadows.sm,
  },
  analyzeButtonDisabled: {
    opacity: 0.7,
  },
  buttonSpinner: {
    marginRight: spacing[1],
  },
  analyzeButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.inverse,
  },
  progressContainer: {
    marginTop: spacing[3],
    marginBottom: spacing[2],
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.background.tertiary,
    borderRadius: borders.radius.full,
    overflow: "hidden",
    marginBottom: spacing[2],
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.orange[500],
    borderRadius: borders.radius.full,
  },
  progressText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    textAlign: "center",
  },
});
