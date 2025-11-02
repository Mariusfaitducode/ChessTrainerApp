import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";

import type { GameMove } from "@/types/chess";
import { colors, spacing, typography, borders, shadows } from "@/theme";

interface MoveListProps {
  moves: GameMove[];
  currentMove?: number;
  onMoveSelect?: (moveNumber: number) => void;
}

export const MoveList = ({
  moves,
  currentMove,
  onMoveSelect,
}: MoveListProps) => {
  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        <View style={styles.movesContainer}>
          {moves.map((move, index) => {
            const moveNumber = Math.floor(index / 2) + 1;
            const isWhiteMove = index % 2 === 0;
            const isCurrent = currentMove === index;

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.move,
                  isCurrent && styles.currentMove,
                  isWhiteMove && styles.moveNumber,
                ]}
                onPress={() => onMoveSelect?.(index)}
                activeOpacity={0.7}
              >
                {isWhiteMove && (
                  <Text style={styles.moveNumberText}>{moveNumber}.</Text>
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
});
