import { View, Text, StyleSheet } from "react-native";
import { colors, spacing, typography, borders } from "@/theme";

interface AnalysisBarProps {
  evaluation: number; // en pawns (depuis la DB)
  isWhiteToMove?: boolean;
  bestMove?: string | null;
  moveQuality?:
    | "best"
    | "excellent"
    | "good"
    | "inaccuracy"
    | "mistake"
    | "blunder"
    | null;
  orientation?: "horizontal" | "vertical";
  boardOrientation?: "white" | "black"; // Orientation du plateau (qui est en bas)
}

export const AnalysisBar = ({
  evaluation,
  isWhiteToMove = true,
  bestMove,
  moveQuality,
  orientation = "horizontal",
  boardOrientation = "white",
}: AnalysisBarProps) => {
  // L'évaluation est déjà en pawns depuis la DB
  // IMPORTANT: L'évaluation est TOUJOURS du point de vue des blancs
  // Positif = avantage blanc, Négatif = avantage noir
  const pawns = evaluation || 0;

  // Normaliser pour l'affichage (max ±10 pawns)
  const normalized = Math.max(-10, Math.min(10, pawns));

  // Calculer le pourcentage : +10 pawns = 100% (haut), -10 pawns = 0% (bas)
  const percentage = ((normalized + 10) / 20) * 100;

  // Pour l'orientation verticale, l'évaluation est toujours du point de vue des blancs
  // donc on n'a pas besoin d'ajuster selon isWhiteToMove
  // Pour l'orientation horizontale, on ajuste selon le joueur au trait
  const adjustedPercentage =
    orientation === "vertical"
      ? percentage // Toujours du point de vue des blancs (haut = blanc, bas = noir)
      : isWhiteToMove
        ? percentage // Blanc au trait : positif = avantage blanc (droite)
        : 100 - percentage; // Noir au trait : positif = avantage noir (gauche), donc on inverse

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

  const getMoveQualityLabel = () => {
    if (!moveQuality) return null;
    const labels: Record<string, string> = {
      best: "Meilleur",
      excellent: "Excellent",
      good: "Bon",
      inaccuracy: "Imprécision",
      mistake: "Erreur",
      blunder: "Erreur grave",
    };
    return labels[moveQuality] || null;
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
        {moveQuality &&
          (moveQuality === "blunder" ||
            moveQuality === "mistake" ||
            moveQuality === "inaccuracy") && (
            <Text style={styles.mistakeLabel}>{getMoveQualityLabel()}</Text>
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
  verticalBarContainer: {
    flex: 1,
    width: "100%",
    backgroundColor: colors.border.light,
    overflow: "hidden",
    position: "relative",
  },
});
