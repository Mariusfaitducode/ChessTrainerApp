import { useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Chess } from "chess.js";

import { colors, spacing, typography, shadows, borders } from "@/theme";
import { ChessboardPreview } from "@/components/chess/ChessboardPreview";
import type { Exercise } from "@/types/exercises";

interface ExerciseActionCardProps {
  exercise: Exercise | null;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{
    size: number;
    color: string;
    strokeWidth: number;
  }>;
  onPress: () => void;
  disabled?: boolean;
}

/**
 * Carte d'action pour les exercices avec prévisualisation du plateau
 * Le chessboard prend toute la hauteur et toute la partie gauche
 */
export const ExerciseActionCard = ({
  exercise,
  title,
  subtitle,
  icon: Icon,
  onPress,
  disabled = false,
}: ExerciseActionCardProps) => {
  // Déterminer l'orientation du plateau à partir du FEN
  const boardOrientation = useMemo<"white" | "black">(() => {
    if (!exercise?.fen) return "white";
    try {
      const chess = new Chess();
      chess.load(exercise.fen);
      return chess.turn() === "w" ? "white" : "black";
    } catch {
      return "white";
    }
  }, [exercise?.fen]);

  return (
    <TouchableOpacity
      style={[styles.card, disabled && styles.cardDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <View style={styles.content}>
        {/* Prévisualisation du plateau - prend toute la hauteur et la partie gauche */}
        {exercise?.fen ? (
          <View style={styles.chessboardContainer}>
            <ChessboardPreview
              fen={exercise.fen}
              boardOrientation={boardOrientation}
            />
          </View>
        ) : (
          <View style={styles.iconContainer}>
            <Icon size={24} color={colors.text.primary} strokeWidth={1.5} />
          </View>
        )}
        {/* Contenu texte - prend le reste de l'espace */}
        <View style={styles.textContainer}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.secondary,
    borderRadius: borders.radius.card,
    overflow: "hidden",
    ...shadows.md,
  },
  cardDisabled: {
    backgroundColor: colors.background.tertiary,
    opacity: 0.6,
    ...shadows.none,
  },
  content: {
    flexDirection: "row",
    alignItems: "stretch",
    height: 120,
  },
  chessboardContainer: {
    height: "100%",
    aspectRatio: 1,
  },
  iconContainer: {
    width: 80,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background.primary, // Stone 50 pour le contraste
  },
  textContainer: {
    flex: 1,
    padding: spacing[4],
    justifyContent: "center",
  },
  title: {
    fontFamily: typography.fontFamily.heading,
    fontWeight: "700",
    fontSize: 17,
    color: colors.text.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
});
