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
import { Brain, Play, Trophy, Zap } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useGames } from "@/hooks/useGames";
import { useExercises } from "@/hooks/useExercises";
import { useAnalyzeGames } from "@/hooks/useAnalyzeGames";
import { colors, spacing, typography, shadows, borders } from "@/theme";
import { getQualityBadgeImage } from "@/utils/chess-badge";

// Composant StatCard "Clean Wireframe"
const StatCard = ({ label, value, subtitle }: { label: string; value: string | number; subtitle?: string }) => (
  <View style={styles.statCard}>
    <Text style={styles.statNumber}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
    {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
  </View>
);

// Composant ActionCard "Clean Wireframe"
const ActionCard = ({ title, subtitle, icon: Icon, onPress, loading = false, disabled = false }: any) => (
  <TouchableOpacity 
    style={[styles.actionCard, disabled && styles.actionCardDisabled]} 
    onPress={onPress}
    disabled={disabled}
    activeOpacity={0.8}
  >
    <View style={styles.actionContent}>
      <View style={styles.actionIconContainer}>
        {loading ? <ActivityIndicator color={colors.text.primary} /> : <Icon size={24} color={colors.text.primary} strokeWidth={1.5} />}
      </View>
      <View style={styles.actionTextContainer}>
        <Text style={styles.actionTitle}>{loading ? "Analyse en cours..." : title}</Text>
        <Text style={styles.actionSubtitle}>{subtitle}</Text>
      </View>
    </View>
  </TouchableOpacity>
);

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

      {/* Section Analyse */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Analyse</Text>
        {unanalyzedGames.length > 0 ? (
          <ActionCard
            title="Analyser mes parties"
            subtitle={`${unanalyzedGames.length} nouvelles parties détectées`}
            icon={Brain}
            onPress={handleAnalyzeFirst}
            loading={isAnalyzing}
            disabled={isAnalyzing}
          />
        ) : (
          <View style={styles.infoCard}>
            <Trophy size={24} color={colors.text.primary} strokeWidth={1.5} />
            <Text style={styles.infoCardText}>Toutes tes parties sont analysées !</Text>
          </View>
        )}

        {isAnalyzing && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
            </View>
            <Text style={styles.progressText}>
              Analyse du cerveau en cours... {progressPercent}%
            </Text>
          </View>
        )}
      </View>

      {/* Section Exercices */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Entraînement</Text>
        <ActionCard
          title="Résoudre des exercices"
          subtitle={pendingExercises.length > 0 ? `${pendingExercises.length} exercices t'attendent` : "Aucun exercice pour le moment"}
          icon={Zap}
          onPress={() => {}} // TODO: Naviguer vers exercices
          disabled={pendingExercises.length === 0}
        />
      </View>

      {/* Badges Card avec les vrais assets */}
      <View style={styles.badgesCard}>
         <Text style={styles.sectionTitle}>Légende</Text>
         <View style={styles.badgesRow}>
            <Image source={getQualityBadgeImage("brilliant")} style={styles.badgeIcon} />
            <Image source={getQualityBadgeImage("great")} style={styles.badgeIcon} />
            <Image source={getQualityBadgeImage("best")} style={styles.badgeIcon} />
            <Image source={getQualityBadgeImage("excellent")} style={styles.badgeIcon} />
            <Image source={getQualityBadgeImage("good")} style={styles.badgeIcon} />
         </View>
         <View style={styles.badgesRow}>
            <Image source={getQualityBadgeImage("inaccuracy")} style={styles.badgeIcon} />
            <Image source={getQualityBadgeImage("mistake")} style={styles.badgeIcon} />
            <Image source={getQualityBadgeImage("miss")} style={styles.badgeIcon} />
            <Image source={getQualityBadgeImage("blunder")} style={styles.badgeIcon} />
            <Image source={getQualityBadgeImage("book")} style={styles.badgeIcon} />
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
    fontSize: 32,
    marginBottom: spacing[6],
    color: colors.text.primary,
    textAlign: "center",
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.display, // Patrick Hand
    fontSize: 24, // Un peu plus gros pour Patrick Hand qui est small
    marginBottom: spacing[3],
    color: colors.text.secondary,
    // Pas d'uppercase pour garder le style manuscrit
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing[3],
    marginBottom: spacing[6],
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.background.primary,
    borderWidth: borders.width.thin, // Fin (1px)
    borderColor: colors.border.medium,
    borderRadius: borders.radius.md,
    padding: spacing[4],
    alignItems: "center",
    justifyContent: "center",
    ...shadows.sm, // Ombre légère
    aspectRatio: 1.2,
  },
  statNumber: {
    fontFamily: typography.fontFamily.display, // Patrick Hand pour le chiffre (fun)
    fontSize: 32,
    color: colors.text.primary,
    marginBottom: spacing[1],
  },
  statLabel: {
    fontFamily: typography.fontFamily.body,
    fontSize: 14,
    fontWeight: "600",
    color: colors.text.primary,
    textTransform: "uppercase",
  },
  statSubtitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: 12,
    color: colors.text.secondary,
  },
  section: {
    marginBottom: spacing[6],
  },
  actionCard: {
    backgroundColor: colors.background.primary,
    borderWidth: borders.width.thin,
    borderColor: colors.border.medium,
    borderRadius: borders.radius.md,
    padding: spacing[4],
    ...shadows.sm,
  },
  actionCardDisabled: {
    backgroundColor: colors.background.secondary, // Grisé léger
    borderColor: colors.border.light,
    ...shadows.none,
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
    borderWidth: 1,
    borderColor: colors.border.medium,
    borderRadius: 24, // Rond
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontFamily: typography.fontFamily.body, // System
    fontWeight: "600",
    fontSize: 16,
    color: colors.text.primary,
    marginBottom: 2,
  },
  actionSubtitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: 14,
    color: colors.text.secondary,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    backgroundColor: colors.background.secondary,
    padding: spacing[4],
    borderRadius: borders.radius.md,
    borderWidth: borders.width.thin,
    borderColor: colors.border.light,
  },
  infoCardText: {
    fontFamily: typography.fontFamily.body,
    fontSize: 14,
    color: colors.text.primary,
  },
  progressContainer: {
    marginTop: spacing[4],
  },
  progressBar: {
    height: 6, // Plus fin
    backgroundColor: colors.background.secondary,
    borderRadius: borders.radius.full,
    overflow: "hidden",
    marginBottom: spacing[2],
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.text.primary,
  },
  progressText: {
    fontFamily: typography.fontFamily.body,
    fontSize: 12,
    textAlign: "center",
    color: colors.text.secondary,
  },
  badgesCard: {
    backgroundColor: colors.background.primary,
    borderWidth: borders.width.thin,
    borderColor: colors.border.medium,
    borderRadius: borders.radius.md,
    padding: spacing[4],
    ...shadows.sm,
    marginTop: spacing[2],
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

