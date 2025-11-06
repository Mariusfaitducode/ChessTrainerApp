import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { AlertTriangle, CheckCircle2, Target } from "lucide-react-native";

import type { Exercise } from "@/types/exercises";
import { colors, spacing, typography, shadows, borders } from "@/theme";

interface ExerciseCardProps {
  exercise: Exercise;
  onPress: () => void;
}

export const ExerciseCard = ({ exercise, onPress }: ExerciseCardProps) => {
  return (
    <TouchableOpacity
      style={[styles.card, exercise.completed && styles.completedCard]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        {/* Icône et badge */}
        <View style={styles.iconContainer}>
          {exercise.completed ? (
            <CheckCircle2 size={20} color={colors.success.main} />
          ) : (
            <AlertTriangle size={20} color={colors.error.main} />
          )}
        </View>

        {/* Informations principales */}
        <View style={styles.infoContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {exercise.completed ? "Exercice terminé" : "Blunder à corriger"}
            </Text>
            {exercise.attempts > 0 && (
              <Text style={styles.attempts}>
                {exercise.attempts} tentative{exercise.attempts > 1 ? "s" : ""}
              </Text>
            )}
          </View>

          <View style={styles.metadata}>
            {/* {exercise.opponent && (
              <Text style={styles.opponent} numberOfLines={1}>
                vs {exercise.opponent}
              </Text>
            )} */}
            {exercise.evaluation_loss !== undefined &&
              exercise.evaluation_loss > 0 && (
                <Text style={styles.loss}>
                  -{(exercise.evaluation_loss / 100).toFixed(1)} pawns
                </Text>
              )}
          </View>

          {exercise.position_description && (
            <Text style={styles.description} numberOfLines={2}>
              {exercise.position_description}
            </Text>
          )}

          {exercise.completed && exercise.score > 0 && (
            <View style={styles.scoreContainer}>
              <Target size={14} color={colors.success.main} />
              <Text style={styles.score}>Score: {exercise.score}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.secondary,
    borderRadius: borders.radius.lg,
    padding: spacing[3],
    marginBottom: spacing[3],
    ...shadows.sm,
    borderLeftWidth: borders.width.medium,
    borderLeftColor: colors.error.main,
  },
  completedCard: {
    borderLeftColor: colors.success.main,
    opacity: 0.9,
  },
  content: {
    flexDirection: "row",
    gap: spacing[3],
  },
  iconContainer: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  infoContainer: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing[1],
  },
  title: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    flex: 1,
  },
  attempts: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    fontWeight: typography.fontWeight.medium,
  },
  metadata: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  opponent: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.medium,
  },
  loss: {
    fontSize: typography.fontSize.sm,
    color: colors.error.main,
    fontWeight: typography.fontWeight.semibold,
  },
  description: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing[2],
    lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
  },
  scoreContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1],
  },
  score: {
    fontSize: typography.fontSize.xs,
    color: colors.success.main,
    fontWeight: typography.fontWeight.semibold,
  },
});
