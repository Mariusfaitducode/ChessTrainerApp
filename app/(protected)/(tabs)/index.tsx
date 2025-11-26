import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { Zap } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useGames } from "@/hooks/useGames";
import { useExercises } from "@/hooks/useExercises";
import { useSync } from "@/providers/sync-provider";
import { colors, spacing, typography, shadows, borders } from "@/theme";
import { getQualityBadgeImage } from "@/utils/chess-badge";
import { ExerciseActionCard } from "@/components/exercises/ExerciseActionCard";

// Composant StatCard "Clean Wireframe"
const StatCard = ({
  label,
  value,
  subtitle,
}: {
  label: string;
  value: string | number;
  subtitle?: string;
}) => (
  <View style={styles.statCard}>
    <Text style={styles.statNumber}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
    {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
  </View>
);

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
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
  // Utiliser le contexte global pour l'état de sync et d'analyse
  const { isAnalyzing, progress } = useSync();

  const isLoading = isLoadingGames || isLoadingExercises;

  const onRefresh = async () => {
    await Promise.all([refetchGames(), refetchExercises()]);
  };

  const pendingExercises = exercises.filter((e) => !e.completed);
  const completedExercises = exercises.filter((e) => e.completed);

  const analyzedGamesCount = games.filter((g) => g.analyzed_at).length;

  const handleStartExercise = () => {
    if (pendingExercises.length === 0) return;

    // Prendre le premier exercice non complété (le prochain à résoudre)
    const nextExercise = pendingExercises[0];
    router.push(`/(protected)/exercise/${nextExercise.id}` as any);
  };

  // Trouver la partie en cours d'analyse
  const analyzingGameProgress = isAnalyzing
    ? Object.values(progress).find((p) => !p.completed)
    : null;

  // Afficher l'indicateur si on analyse
  const showAnalyzingIndicator = isAnalyzing;

  const analyzingProgressPercent =
    analyzingGameProgress && analyzingGameProgress.total > 0
      ? Math.round(
          (analyzingGameProgress.current / analyzingGameProgress.total) * 100,
        )
      : 0;

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={onRefresh} />
      }
    >
      {/* Header - Seul titre en Patrick Hand */}
      <Text style={styles.title}>Dashboard</Text>

      {/* Stats */}
      <View style={styles.statsRow}>
        <StatCard
          value={`${analyzedGamesCount}/${games.length}`}
          label="Parties"
          subtitle="analysées"
        />
        <StatCard
          value={`${completedExercises.length}/${exercises.length}`}
          label="Exercices"
          subtitle="résolus"
        />
      </View>

      {/* Indicateur d'analyse en cours */}
      {showAnalyzingIndicator && (
        <View style={styles.analyzingCard}>
          <View style={styles.analyzingContent}>
            <View style={styles.analyzingIconContainer}>
              <ActivityIndicator size="small" color={colors.text.primary} />
            </View>
            <View style={styles.analyzingTextContainer}>
              <Text style={styles.analyzingTitle}>Analyse en cours</Text>
              <Text style={styles.analyzingSubtitle}>
                {analyzingGameProgress && analyzingGameProgress.total > 0
                  ? `Coup ${analyzingGameProgress.current}/${analyzingGameProgress.total}`
                  : "Préparation de l'analyse..."}
              </Text>
            </View>
          </View>
          {analyzingGameProgress && analyzingGameProgress.total > 0 && (
            <View style={styles.analyzingProgressContainer}>
              <View style={styles.analyzingProgressBar}>
                <View
                  style={[
                    styles.analyzingProgressFill,
                    { width: `${analyzingProgressPercent}%` },
                  ]}
                />
              </View>
              <Text style={styles.analyzingProgressText}>
                {analyzingProgressPercent}%
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Section Exercices */}
      <View style={styles.section}>
        {/* <Text style={styles.sectionTitle}>Entraînement</Text> */}
        <ExerciseActionCard
          exercise={pendingExercises.length > 0 ? pendingExercises[0] : null}
          title="Résoudre des exercices"
          subtitle={
            pendingExercises.length > 0
              ? `${pendingExercises.length} exercices t'attendent`
              : "Aucun exercice pour le moment"
          }
          icon={Zap}
          onPress={handleStartExercise}
          disabled={pendingExercises.length === 0}
        />
      </View>

      {/* Badges Card avec les vrais assets */}
      <View style={styles.badgesCard}>
        <Text style={styles.sectionTitle}>Légende</Text>
        <View style={styles.badgesRow}>
          <Image
            source={getQualityBadgeImage("brilliant")}
            style={styles.badgeIcon}
          />
          <Image source={getQualityBadgeImage("ok")} style={styles.badgeIcon} />
          <Image
            source={getQualityBadgeImage("best")}
            style={styles.badgeIcon}
          />
          <Image
            source={getQualityBadgeImage("excellent")}
            style={styles.badgeIcon}
          />
          <Image
            source={getQualityBadgeImage("good")}
            style={styles.badgeIcon}
          />
        </View>
        <View style={styles.badgesRow}>
          <Image
            source={getQualityBadgeImage("inaccuracy")}
            style={styles.badgeIcon}
          />
          <Image
            source={getQualityBadgeImage("mistake")}
            style={styles.badgeIcon}
          />
          <Image
            source={getQualityBadgeImage("miss")}
            style={styles.badgeIcon}
          />
          <Image
            source={getQualityBadgeImage("blunder")}
            style={styles.badgeIcon}
          />
          <Image
            source={getQualityBadgeImage("theory")}
            style={styles.badgeIcon}
          />
        </View>
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
    padding: spacing[4], // Un peu plus standard (16px) au lieu de 24px
  },
  title: {
    fontFamily: typography.fontFamily.display, // Patrick Hand
    fontSize: 34, // Un peu plus grand pour l'impact
    marginBottom: spacing[6],
    color: colors.text.primary,
    textAlign: "left", // Alignement gauche demandé
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.heading, // System
    fontSize: 20, // Taille standard titre section
    fontWeight: "700",
    marginBottom: spacing[4],
    color: colors.text.primary,
    letterSpacing: -0.5,
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing[4],
    marginBottom: spacing[6],
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.background.secondary,
    borderRadius: borders.radius.card,
    padding: spacing[5],
    alignItems: "center",
    justifyContent: "center",
    ...shadows.md,
    aspectRatio: 1.1,
  },
  statNumber: {
    fontFamily: typography.fontFamily.heading, // System
    fontWeight: "800", // Extra bold
    fontSize: 36,
    color: colors.text.primary,
    marginBottom: spacing[1],
    letterSpacing: -1,
  },
  statLabel: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  statSubtitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  section: {
    marginBottom: spacing[6],
  },
  actionCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borders.radius.card,
    padding: spacing[5],
    ...shadows.md,
  },
  actionCardDisabled: {
    opacity: 0.6,
    backgroundColor: colors.background.tertiary,
  },
  actionContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[4],
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background.primary,
    borderRadius: borders.radius.button,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontFamily: typography.fontFamily.heading,
    fontWeight: "700",
    fontSize: 17,
    color: colors.text.primary,
    marginBottom: 4,
  },
  actionSubtitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: 15,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    backgroundColor: colors.background.secondary,
    padding: spacing[5],
    borderRadius: borders.radius.card,
    ...shadows.sm,
  },
  infoCardText: {
    fontFamily: typography.fontFamily.body,
    fontSize: 15,
    color: colors.text.secondary,
    flex: 1,
    fontWeight: "500",
  },
  progressContainer: {
    marginTop: spacing[4],
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.background.tertiary, // Stone 200
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: spacing[2],
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.text.primary,
    borderRadius: 3,
  },
  progressText: {
    fontFamily: typography.fontFamily.body,
    fontSize: 13,
    textAlign: "center",
    color: colors.text.tertiary, // Plus discret
    fontWeight: "500",
  },
  badgesCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borders.radius.card,
    padding: spacing[6],
    marginTop: spacing[4],
    ...shadows.md,
  },
  badgesRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: spacing[3],
  },
  badgeIcon: {
    width: 32,
    height: 32,
    resizeMode: "contain",
  },
  analyzingCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borders.radius.card,
    padding: spacing[5],
    marginBottom: spacing[6],
    ...shadows.md,
  },
  analyzingContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[4],
  },
  analyzingIconContainer: {
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background.primary,
    borderRadius: borders.radius.button,
  },
  analyzingTextContainer: {
    flex: 1,
  },
  analyzingTitle: {
    fontFamily: typography.fontFamily.heading,
    fontWeight: "700",
    fontSize: 17,
    color: colors.text.primary,
    marginBottom: 4,
  },
  analyzingSubtitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: 15,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  analyzingProgressContainer: {
    marginTop: spacing[4],
  },
  analyzingProgressBar: {
    height: 6,
    backgroundColor: colors.background.tertiary,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: spacing[2],
  },
  analyzingProgressFill: {
    height: "100%",
    backgroundColor: colors.text.primary,
    borderRadius: 3,
  },
  analyzingProgressText: {
    fontFamily: typography.fontFamily.body,
    fontSize: 13,
    textAlign: "center",
    color: colors.text.tertiary,
    fontWeight: "500",
  },
});
