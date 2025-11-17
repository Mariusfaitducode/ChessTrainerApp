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
  evaluationType?: "cp" | "mate" | null; // Type d'évaluation
  mateIn?: number | null; // Nombre de coups jusqu'au mat
  userColor?: "white" | "black"; // Couleur du joueur (nous)
}

export const AnalysisBar = ({
  evaluation,
  isWhiteToMove = true,
  bestMove,
  moveQuality,
  orientation = "horizontal",
  boardOrientation = "white",
  evaluationType = null,
  mateIn = null,
  userColor = "white",
}: AnalysisBarProps) => {
  // L'évaluation est du point de vue des blancs (positif = avantage blanc, négatif = avantage noir)
  const pawns = evaluation || 0;
  const isMate = evaluationType === "mate";

  // Calculer l'avantage de notre joueur (en pawns)
  // Si on est blanc : l'évaluation représente directement notre avantage
  // Si on est noir : on inverse (car l'évaluation est du point de vue des blancs)
  const userAdvantage = userColor === "white" ? pawns : -pawns;

  // Déterminer si on gagne ou perd
  let isUserWinning: boolean;
  let barHeight: number; // Hauteur de la barre (0-100%)

  if (isMate) {
    // Pour les mats : déterminer qui gagne
    if (mateIn !== null && mateIn > 0) {
      // Les blancs matent
      isUserWinning = userColor === "white";
    } else if (mateIn !== null && mateIn < 0) {
      // Les noirs matent
      isUserWinning = userColor === "black";
    } else {
      // Mat immédiat : celui qui est au trait est maté
      const isUserMated = isWhiteToMove
        ? userColor === "white"
        : userColor === "black";
      isUserWinning = !isUserMated;
    }
    // Pour les mats : barre toujours à 100%
    barHeight = 100;
  } else {
    // Pour les évaluations normales
    isUserWinning = userAdvantage > 0;

    // Normaliser l'avantage entre -10 et +10 pawns
    const normalized = Math.max(-10, Math.min(10, userAdvantage));
    // Convertir en pourcentage : +10 pawns = 100%, 0 pawns = 50%, -10 pawns = 0%
    // La hauteur représente notre avantage : 50% = égalité, >50% = on gagne, <50% = on perd
    barHeight = ((normalized + 10) / 20) * 100;
  }

  // Couleurs custom : #e1e1e1 (clair) et #454242 (foncé)
  const lightShade = "#ffffff";
  const darkShade = "#454242";
  const bottomColor = userColor === "white" ? lightShade : darkShade;
  const topColor = userColor === "white" ? darkShade : lightShade;

  // Formater l'évaluation pour l'affichage
  const formatEvaluation = () => {
    if (isMate && mateIn !== null) {
      if (mateIn === 0) {
        return "Mat";
      }
      // mateIn est positif si les blancs matent, négatif si les noirs matent
      const absMateIn = Math.abs(mateIn);
      return `Mat en ${absMateIn}`;
    }
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
    const baseBottom = isMate ? (isUserWinning ? 100 : 0) : barHeight;
    const baseTop = 100 - baseBottom;
    const normalize = (value: number) => (value <= 0 ? 0 : Math.max(1, value));

    const topHeight = normalize(baseTop);
    const bottomHeight = normalize(baseBottom);

    return (
      <View style={styles.verticalBarContainer}>
        {topHeight > 0 && (
          <View
            style={{
              width: "100%",
              height: `${topHeight}%`,
              backgroundColor: topColor,
              alignSelf: "flex-start",
            }}
          />
        )}
        {bottomHeight > 0 && (
          <View
            style={{
              width: "100%",
              height: `${bottomHeight}%`,
              backgroundColor: bottomColor,
              alignSelf: "flex-end",
            }}
          />
        )}
      </View>
    );
  }

  // Pour l'orientation horizontale, calculer le pourcentage ajusté
  const adjustedPercentage =
    orientation === "horizontal"
      ? isWhiteToMove
        ? barHeight // Blanc au trait : utiliser barHeight tel quel
        : 100 - barHeight // Noir au trait : inverser
      : barHeight;

  // Pour l'orientation horizontale, utiliser la couleur du joueur au trait
  const isUserTurn =
    (isWhiteToMove && userColor === "white") ||
    (!isWhiteToMove && userColor === "black");
  const horizontalBarColor = isUserTurn ? bottomColor : topColor;

  return (
    <View style={styles.container}>
      <View style={styles.barContainer}>
        <View
          style={[
            styles.bar,
            {
              width: `${adjustedPercentage}%`,
              backgroundColor: horizontalBarColor,
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
