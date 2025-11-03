import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";

import type { GameMove } from "@/types/chess";
import type { GameAnalysis } from "@/types/games";
import { colors, spacing, typography, borders, shadows } from "@/theme";

interface MoveListProps {
  moves: GameMove[];
  currentMove?: number;
  onMoveSelect?: (moveNumber: number) => void;
  analyses?: GameAnalysis[];
}

export const MoveList = ({
  moves,
  currentMove,
  onMoveSelect,
  analyses = [],
}: MoveListProps) => {
  // Créer un Map pour accéder rapidement aux analyses par move_number
  const analysesMap = new Map(
    analyses.map((a) => [a.move_number, a] as [number, GameAnalysis]),
  );

  // Formater l'évaluation pour l'affichage
  const formatEval = (evaluation: number | null) => {
    if (evaluation === null) return null;
    const pawns = evaluation;
    if (Math.abs(pawns) < 0.01) return "0.00";
    if (Math.abs(pawns) >= 10) {
      return pawns > 0 ? `+${pawns.toFixed(1)}` : pawns.toFixed(1);
    }
    return pawns > 0 ? `+${pawns.toFixed(2)}` : pawns.toFixed(2);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        <View style={styles.movesContainer}>
          {moves.map((move, index) => {
            // move_number dans les analyses correspond à index + 1 (car index 0 = move_number 1)
            const moveNumber = index + 1;
            const analysis = analysesMap.get(moveNumber);
            const moveNumberDisplay = Math.floor(index / 2) + 1;
            const isWhiteMove = index % 2 === 0;
            const isCurrent = currentMove === index;

            // Déterminer le style selon le niveau d'erreur
            const getMistakeStyle = () => {
              if (!analysis?.mistake_level) return null;
              switch (analysis.mistake_level) {
                case "blunder":
                  return styles.blunderMove;
                case "mistake":
                  return styles.mistakeMove;
                case "inaccuracy":
                  return styles.inaccuracyMove;
                default:
                  return null;
              }
            };

            const mistakeStyle = getMistakeStyle();

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.move,
                  mistakeStyle,
                  isCurrent && styles.currentMove,
                  isWhiteMove && styles.moveNumber,
                ]}
                onPress={() => onMoveSelect?.(index)}
                activeOpacity={0.7}
              >
                {isWhiteMove && (
                  <Text style={styles.moveNumberText}>
                    {moveNumberDisplay}.
                  </Text>
                )}
                <Text
                  style={[
                    styles.moveText,
                    isCurrent && styles.currentMoveText,
                    isWhiteMove ? styles.whiteMove : styles.blackMove,
                  ]}
                >
                  {move.white || move.black}
                </Text>
                {analysis && analysis.evaluation !== null && (
                  <Text style={styles.evaluation}>
                    {formatEval(analysis.evaluation)}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    maxHeight: 200,
  },
  scrollView: {
    flexGrow: 0,
  },
  movesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: spacing[3],
    gap: spacing[1],
  },
  move: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borders.radius.md,
    backgroundColor: colors.background.tertiary,
  },
  currentMove: {
    backgroundColor: colors.orange[500],
    ...shadows.sm,
  },
  moveNumber: {
    marginRight: spacing[1],
  },
  moveNumberText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.medium,
  },
  moveText: {
    fontSize: typography.fontSize.sm,
    fontFamily: "monospace",
    fontWeight: typography.fontWeight.medium,
  },
  whiteMove: {
    color: colors.text.primary,
  },
  blackMove: {
    color: colors.text.secondary,
  },
  currentMoveText: {
    color: colors.text.inverse,
    fontWeight: typography.fontWeight.semibold,
  },
  evaluation: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    marginLeft: spacing[2],
    fontFamily: "monospace",
  },
  // Styles pour les erreurs
  blunderMove: {
    backgroundColor: colors.error.light,
    borderWidth: 1.5,
    borderColor: colors.error.main,
  },
  mistakeMove: {
    backgroundColor: colors.error.light,
    borderWidth: 1,
    borderColor: colors.error.main,
    opacity: 0.7,
  },
  inaccuracyMove: {
    backgroundColor: colors.warning.light,
    borderWidth: 1,
    borderColor: colors.warning.main,
    opacity: 0.6,
  },
});
