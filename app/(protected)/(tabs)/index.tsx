import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { Brain, Trophy, Zap } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useGames } from "@/hooks/useGames";
import { useExercises } from "@/hooks/useExercises";
import { useAnalyzeGames } from "@/hooks/useAnalyzeGames";
import { useAutoSync } from "@/hooks/useAutoSync";
import { useAutoAnalyze } from "@/hooks/useAutoAnalyze";
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

// Composant ActionCard "Clean Wireframe"
const ActionCard = ({
  title,
  subtitle,
  icon: Icon,
  onPress,
  loading = false,
  disabled = false,
}: any) => (
  <TouchableOpacity
    style={[styles.actionCard, disabled && styles.actionCardDisabled]}
    onPress={onPress}
    disabled={disabled}
    activeOpacity={0.8}
  >
    <View style={styles.actionContent}>
      <View style={styles.actionIconContainer}>
        {loading ? (
          <ActivityIndicator color={colors.text.primary} />
        ) : (
          <Icon size={24} color={colors.text.primary} strokeWidth={1.5} />
        )}
      </View>
      <View style={styles.actionTextContainer}>
        <Text style={styles.actionTitle}>
          {loading ? "Analyse en cours..." : title}
        </Text>
        <Text style={styles.actionSubtitle}>{subtitle}</Text>
      </View>
    </View>
  </TouchableOpacity>
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
  const { analyzeGames, isAnalyzing, progress } = useAnalyzeGames();

  // Synchronisation automatique : charge les 10 premières parties puis vérifie périodiquement
  useAutoSync();

  // Analyse automatique : analyse la prochaine partie si moins de 3 parties avec exercices
  useAutoAnalyze();

  const [analyzingGameId, setAnalyzingGameId] = useState<string | null>(null);

  const isLoading = isLoadingGames || isLoadingExercises;

  const onRefresh = async () => {
    await Promise.all([refetchGames(), refetchExercises()]);
  };

  const pendingExercises = exercises.filter((e) => !e.completed);
  const completedExercises = exercises.filter((e) => e.completed);

  const unanalyzedGames = games.filter((g) => !g.analyzed_at).slice(0, 5);
  const analyzedGamesCount = games.filter((g) => g.analyzed_at).length;

  const handleAnalyzeFirst = async () => {
    if (unanalyzedGames.length === 0) return;

    const firstGame = unanalyzedGames[0];
    setAnalyzingGameId(firstGame.id);

    try {
      await analyzeGames({ games: [firstGame] });
      await Promise.all([refetchGames(), refetchExercises()]);
    } catch {
      // L'erreur est déjà gérée dans le hook avec Alert
    } finally {
      setAnalyzingGameId(null);
    }
  };

  const handleStartExercise = () => {
    if (pendingExercises.length === 0) return;

    // Prendre le premier exercice non complété (le prochain à résoudre)
    const nextExercise = pendingExercises[0];
    router.push(`/(protected)/exercise/${nextExercise.id}` as any);
  };

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
          <Image
            source={getQualityBadgeImage("great")}
            style={styles.badgeIcon}
          />
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
            source={getQualityBadgeImage("book")}
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
});
