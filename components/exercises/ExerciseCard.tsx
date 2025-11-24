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

  // Couleur du texte selon le type d'erreur pour garder l'info visuelle
  let textColor = colors.text.primary;
  if (moveQuality === "blunder") textColor = colors.chess.blunder;
  else if (moveQuality === "mistake") textColor = colors.chess.mistake;
  else if (moveQuality === "inaccuracy") textColor = colors.chess.inaccuracy;

  return (
    <TouchableOpacity
      style={[styles.card, exercise.completed && styles.completedCard]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        {/* Badge type d'erreur */}
        <View style={styles.iconContainer}>
          <Image
            source={qualityBadgeImage}
            style={styles.badge}
            resizeMode="contain"
          />
        </View>

        {/* Infos */}
        <View style={styles.infoContainer}>
          <Text
            style={[styles.errorType, { color: textColor }]}
            numberOfLines={1}
          >
            {exercise.completed ? "Terminé" : errorLabel}
          </Text>

          <View style={styles.moveDetails}>
            {exercise.move_number && (
              <Text style={styles.moveNumber}>#{exercise.move_number}</Text>
            )}
            <Text style={styles.move}>{playedMove}</Text>
          </View>

          {lossInPawns && !exercise.completed && (
            <Text style={styles.loss} numberOfLines={1}>
              -{lossInPawns}
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
    borderRadius: borders.radius.card,
    padding: spacing[4],
    marginBottom: spacing[3],
    ...shadows.md,
  },
  completedCard: {
    backgroundColor: colors.background.secondary,
    opacity: 0.6,
    shadowOpacity: 0,
    elevation: 0,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
  },
  iconContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  badge: {
    width: 28,
    height: 28,
  },
  infoContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  errorType: {
    fontFamily: typography.fontFamily.body, // System
    fontWeight: "600",
    fontSize: 16,
    minWidth: 90,
  },
  moveDetails: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
  moveNumber: {
    fontFamily: typography.fontFamily.body,
    fontSize: 14,
    color: colors.text.tertiary,
  },
  move: {
    fontFamily: typography.fontFamily.body,
    fontSize: 18,
    color: colors.text.primary,
    fontWeight: "bold",
  },
  loss: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 14,
    color: colors.error.main,
  },
});
