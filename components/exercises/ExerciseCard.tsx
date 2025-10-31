import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

import type { Exercise } from "@/types/exercises";
import { formatDate } from "@/utils/date";

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
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: "#2196F3",
  },
  completedCard: {
    borderLeftColor: "#4CAF50",
    opacity: 0.8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  type: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    flex: 1,
  },
  completedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#4CAF50",
    justifyContent: "center",
    alignItems: "center",
  },
  completedText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  description: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  difficulty: {
    flexDirection: "row",
  },
  difficultyText: {
    fontSize: 14,
    color: "#FF9800",
  },
  stats: {
    flexDirection: "row",
    gap: 12,
  },
  score: {
    fontSize: 12,
    color: "#4CAF50",
    fontWeight: "600",
  },
  attempts: {
    fontSize: 12,
    color: "#999",
  },
  date: {
    fontSize: 11,
    color: "#999",
  },
});
