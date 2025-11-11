import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { CheckCircle2 } from "lucide-react-native";

import type { Exercise } from "@/types/exercises";
import type { MoveQuality } from "@/services/chess/move-classification";
import { colors, spacing, typography, shadows, borders } from "@/theme";
import { uciToSan } from "@/utils/chess-move-format";
import { getQualityBadgeImage } from "@/utils/chess-badge";

interface ExerciseCardProps {
  exercise: Exercise;
  onPress: () => void;
}

const getErrorTypeLabel = (moveQuality: MoveQuality | null | undefined) => {
  if (!moveQuality) return "Erreur";
  switch (moveQuality) {
    case "blunder":
      return "Blunder";
    case "mistake":
      return "Mistake";
    case "inaccuracy":
      return "Inaccuracy";
    default:
      return "Erreur";
  }
};

// Convertir UCI en SAN pour affichage
const formatMove = (
  uciMove: string | null | undefined,
  fenBefore: string | null | undefined,
): string => {
  if (!uciMove) return "?";
  // Essayer de convertir en SAN si on a le FEN avant le coup
  if (fenBefore) {
    const san = uciToSan(uciMove, fenBefore);
    if (san) return san;
  }
  // Fallback: afficher juste la destination si conversion échoue
  if (uciMove.length >= 4) {
    const to = uciMove.substring(2, 4);
    // Si promotion, ajouter la pièce
    if (uciMove.length > 4) {
      const promotion = uciMove[4].toUpperCase();
      return `${to}=${promotion}`;
    }
    return to;
  }
  return "?";
};

export const ExerciseCard = ({ exercise, onPress }: ExerciseCardProps) => {
  const moveQuality = exercise.move_quality;
  const errorLabel = getErrorTypeLabel(moveQuality);
  const playedMove = formatMove(exercise.played_move, exercise.fen_before);
  const lossInPawns =
    exercise.evaluation_loss !== undefined
      ? (exercise.evaluation_loss / 100).toFixed(1)
      : null;

  const qualityBadgeImage = getQualityBadgeImage(moveQuality);

  return (
    <TouchableOpacity
      style={[
        styles.card,
        moveQuality &&
          (styles[`${moveQuality}Card` as keyof typeof styles] as any),
        exercise.completed && styles.completedCard,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        {/* Badge type d'erreur */}
        <View style={styles.iconContainer}>
          {/* {exercise.completed ? (
            <CheckCircle2 size={18} color={colors.success.main} />
          ) : qualityBadgeImage ? ( */}
          <Image
            source={qualityBadgeImage}
            style={styles.badge}
            resizeMode="contain"
          />
          {/* ) : null} */}
        </View>

        {/* Type d'erreur, numéro du coup, coup joué et loss */}
        <View style={styles.infoContainer}>
          <Text style={styles.errorType} numberOfLines={1}>
            {exercise.completed ? "Terminé" : errorLabel}
          </Text>
          {exercise.move_number && (
            <Text style={styles.moveNumber} numberOfLines={1}>
              #{exercise.move_number}
            </Text>
          )}
          <Text style={styles.move} numberOfLines={1}>
            {playedMove}
          </Text>
          {lossInPawns && (
            <Text style={styles.loss} numberOfLines={1}>
              -{lossInPawns} ♟
            </Text>
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
    borderLeftColor: colors.orange[200],
  },
  completedCard: {
    borderLeftColor: colors.success.main,
    opacity: 0.9,
  },
  blunderCard: {
    borderLeftColor: colors.error.main,
  },
  mistakeCard: {
    borderLeftColor: colors.warning.main,
  },
  inaccuracyCard: {
    borderLeftColor: colors.orange[500],
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
  },
  iconContainer: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  badge: {
    width: 24,
    height: 24,
  },
  infoContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
  },
  errorType: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    minWidth: 80,
  },
  moveNumber: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.tertiary,
    fontFamily: "monospace",
  },
  move: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
    fontFamily: "monospace",
  },
  loss: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.error.main,
    marginLeft: "auto",
  },
});
