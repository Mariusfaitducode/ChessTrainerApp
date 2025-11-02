import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

import type { Exercise } from "@/types/exercises";
import { formatDate } from "@/utils/date";
import { colors, spacing, typography, shadows, borders } from "@/theme";

interface ExerciseCardProps {
  exercise: Exercise;
  onPress: () => void;
}

const getExerciseTypeLabel = (type: Exercise["exercise_type"]): string => {
  switch (type) {
    case "find_best_move":
      return "Trouver le meilleur coup";
    case "find_mistake":
      return "Trouver l'erreur";
    case "tactical_puzzle":
      return "Puzzle tactique";
    default:
      return "Exercice";
  }
};

const getDifficultyStars = (difficulty: number | null): string => {
  if (!difficulty) return "★☆☆☆☆";
  return "★".repeat(difficulty) + "☆".repeat(5 - difficulty);
};

export const ExerciseCard = ({ exercise, onPress }: ExerciseCardProps) => {
  return (
    <TouchableOpacity
      style={[styles.card, exercise.completed && styles.completedCard]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <Text style={styles.type}>
          {getExerciseTypeLabel(exercise.exercise_type)}
        </Text>
        {exercise.completed && (
          <View style={styles.completedBadge}>
            <Text style={styles.completedText}>✓</Text>
          </View>
        )}
      </View>

      {exercise.position_description && (
        <Text style={styles.description} numberOfLines={2}>
          {exercise.position_description}
        </Text>
      )}

      <View style={styles.footer}>
        <View style={styles.difficulty}>
          <Text style={styles.difficultyText}>
            {getDifficultyStars(exercise.difficulty)}
          </Text>
        </View>
        <View style={styles.stats}>
          {exercise.completed && (
            <Text style={styles.score}>Score: {exercise.score}</Text>
          )}
          {exercise.attempts > 0 && (
            <Text style={styles.attempts}>
              {exercise.attempts} tentative{exercise.attempts > 1 ? "s" : ""}
            </Text>
          )}
        </View>
      </View>

      <Text style={styles.date}>{formatDate(exercise.created_at)}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.secondary,
    borderRadius: borders.radius.lg,
    padding: spacing[4],
    marginBottom: spacing[3],
    ...shadows.sm,
    borderLeftWidth: borders.width.medium,
    borderLeftColor: colors.orange[500],
  },
  completedCard: {
    borderLeftColor: colors.success.main,
    opacity: 0.85,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing[2],
  },
  type: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    flex: 1,
  },
  completedBadge: {
    width: spacing[6],
    height: spacing[6],
    borderRadius: borders.radius.full,
    backgroundColor: colors.success.main,
    justifyContent: "center",
    alignItems: "center",
  },
  completedText: {
    color: colors.text.inverse,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
  },
  description: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing[3],
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing[2],
  },
  difficulty: {
    flexDirection: "row",
  },
  difficultyText: {
    fontSize: typography.fontSize.sm,
    color: colors.warning.main,
  },
  stats: {
    flexDirection: "row",
    gap: spacing[3],
  },
  score: {
    fontSize: typography.fontSize.xs,
    color: colors.success.main,
    fontWeight: typography.fontWeight.semibold,
  },
  attempts: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
  },
  date: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
  },
});