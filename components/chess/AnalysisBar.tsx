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
  // Log pour debug
  console.log("[AnalysisBar] Props reçues:", {
    evaluation,
    evaluationType,
    mateIn,
    isWhiteToMove,
    userColor,
    orientation,
  });

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

  // Couleurs : blanc/noir selon la couleur du joueur
  // Si on est blanc : bas = blanc, haut = noir
  // Si on est noir : bas = noir, haut = blanc
  const bottomColor = userColor === "white" ? "#FFFFFF" : "#000000";
  const topColor = userColor === "white" ? "#000000" : "#FFFFFF";

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
    // Barre verticale avec blanc/noir :
    // - barHeight représente notre avantage (0-100%, où 50% = égalité)
    // - Barre en bas : notre couleur (blanc si on est blanc, noir si on est noir), hauteur = barHeight
    // - Barre en haut : couleur adverse (noir si on est blanc, blanc si on est noir), hauteur = 100 - barHeight
    // - Pour les mats : barre à 100% de la couleur gagnante

    let bottomBarHeight: number;
    let topBarHeight: number;

    if (isMate) {
      // Mat : barre à 100% de la couleur gagnante
      if (isUserWinning) {
        bottomBarHeight = 100;
        topBarHeight = 0;
      } else {
        bottomBarHeight = 0;
        topBarHeight = 100;
      }
    } else {
      // Évaluation normale : barre en bas = notre avantage, barre en haut = avantage adverse
      bottomBarHeight = barHeight;
      topBarHeight = 100 - barHeight;
    }

    // S'assurer que les hauteurs sont toujours visibles (minimum 1% si > 0)
    const finalBottomHeight =
      bottomBarHeight > 0 ? Math.max(1, bottomBarHeight) : 0;
    const finalTopHeight = topBarHeight > 0 ? Math.max(1, topBarHeight) : 0;

    console.log(
      `[AnalysisBar] Vertical - userAdvantage=${userAdvantage}, isUserWinning=${isUserWinning}, barHeight=${barHeight}, bottomBarHeight=${finalBottomHeight}, topBarHeight=${finalTopHeight}`,
    );

    return (
      <View style={styles.verticalBarContainer}>
        {/* Barre en haut : couleur adverse */}
        {finalTopHeight > 0 && (
          <View
            style={[
              {
                width: "100%",
                height: `${finalTopHeight}%`,
                backgroundColor: topColor,
                alignSelf: "flex-start",
              },
            ]}
          />
        )}
        {/* Barre en bas : notre couleur */}
        {finalBottomHeight > 0 && (
          <View
            style={[
              {
                width: "100%",
                height: `${finalBottomHeight}%`,
                backgroundColor: bottomColor,
                alignSelf: "flex-end",
              },
            ]}
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
  const horizontalBarColor =
    isWhiteToMove && userColor === "white"
      ? bottomColor
      : !isWhiteToMove && userColor === "black"
        ? bottomColor
        : topColor;

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
