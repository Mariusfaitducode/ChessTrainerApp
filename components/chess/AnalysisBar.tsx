import { View, Text, StyleSheet } from "react-native";
import { colors, spacing, typography, borders } from "@/theme";

interface AnalysisBarProps {
  evaluation: number; // en pawns (depuis la DB)
  isWhiteToMove?: boolean;
  bestMove?: string | null;
  mistakeLevel?: "blunder" | "mistake" | "inaccuracy" | null;
  orientation?: "horizontal" | "vertical";
  boardOrientation?: "white" | "black"; // Orientation du plateau (qui est en bas)
}

export const AnalysisBar = ({
  evaluation,
  isWhiteToMove = true,
  bestMove,
  mistakeLevel,
  orientation = "horizontal",
  boardOrientation = "white",
}: AnalysisBarProps) => {
  // L'évaluation est déjà en pawns depuis la DB
  const pawns = evaluation || 0;

  // Normaliser pour l'affichage (max ±10 pawns)
  const normalized = Math.max(-10, Math.min(10, pawns));
  const percentage = ((normalized + 10) / 20) * 100;

  // Adapter selon le joueur au trait et l'orientation du plateau
  // L'évaluation est toujours du point de vue des blancs (positif = blanc gagne)
  // Pour vertical :
  //   - Si boardOrientation = "white" : haut = avantage blanc (100%), bas = avantage noir (0%)
  //   - Si boardOrientation = "black" : haut = avantage blanc (100%), bas = avantage noir (0%)
  //     (même logique, car l'évaluation est toujours du point de vue des blancs)
  const adjustedPercentage =
    orientation === "vertical"
      ? percentage // Pour vertical, on garde la logique normale (haut = blanc, bas = noir)
      : isWhiteToMove
        ? percentage
        : 100 - percentage;
  const barColor =
    adjustedPercentage > 50 ? colors.success.main : colors.error.main;

  // Formater l'évaluation pour l'affichage
  const formatEvaluation = () => {
    if (Math.abs(pawns) < 0.01) return "0.00";
    if (Math.abs(pawns) >= 10) {
      return pawns > 0 ? `+${pawns.toFixed(1)}` : pawns.toFixed(1);
    }
    return pawns > 0 ? `+${pawns.toFixed(2)}` : pawns.toFixed(2);
  };

  const getMistakeLabel = () => {
    if (!mistakeLevel) return null;
    const labels = {
      blunder: "Erreur grave",
      mistake: "Erreur",
      inaccuracy: "Imprécision",
    };
    return labels[mistakeLevel];
  };

  if (orientation === "vertical") {
    // Version simplifiée : juste la barre verticale
    return (
      <View style={styles.verticalBarContainer}>
        <View
          style={[
            {
              height: `${adjustedPercentage}%`,
              backgroundColor: barColor,
            },
          ]}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.barContainer}>
        <View
          style={[
            styles.bar,
            {
              width: `${adjustedPercentage}%`,
              backgroundColor: barColor,
            },
          ]}
        />
      </View>
      <View style={styles.infoContainer}>
        <Text style={styles.evaluation}>{formatEvaluation()}</Text>
        {bestMove && (
          <Text style={styles.bestMove} numberOfLines={1}>
            Meilleur: {bestMove}
          </Text>
        )}
        {mistakeLevel && (
          <Text style={styles.mistakeLabel}>{getMistakeLabel()}</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    backgroundColor: colors.background.secondary,
    borderRadius: borders.radius.lg,
    gap: spacing[3],
  },
  barContainer: {
    flex: 1,
    height: 8,
    backgroundColor: colors.border.light,
    borderRadius: borders.radius.sm,
    overflow: "hidden",
  },
  bar: {
    height: "100%",
    alignSelf: "flex-end",
  },
  infoContainer: {
    alignItems: "flex-end",
    minWidth: 80,
  },
  evaluation: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    fontFamily: "monospace",
  },
  bestMove: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    marginTop: spacing[1],
  },
  mistakeLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.error.main,
    marginTop: spacing[1],
    fontWeight: typography.fontWeight.medium,
  },
  // Styles pour la version verticale (simplifiée)
  verticalBarContainer: {
    width: 12,
    height: "100%",
    backgroundColor: colors.border.light,
  },
});
