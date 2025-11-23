import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import {
  SkipBack,
  ChevronLeft,
  ChevronRight,
  SkipForward,
} from "lucide-react-native";

import { colors, spacing, typography, shadows, borders } from "@/theme";

interface GameControlsProps {
  onFirst: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onLast: () => void;
  isAtStart: boolean;
  isAtEnd: boolean;
  currentMove: number;
  totalMoves: number;
}

export const GameControls = ({
  onFirst,
  onPrevious,
  onNext,
  onLast,
  isAtStart,
  isAtEnd,
  currentMove,
  totalMoves,
}: GameControlsProps) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, isAtStart && styles.buttonDisabled]}
        onPress={onFirst}
        disabled={isAtStart}
        activeOpacity={0.7}
      >
        <SkipBack size={20} color={colors.text.inverse} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, isAtStart && styles.buttonDisabled]}
        onPress={onPrevious}
        disabled={isAtStart}
        activeOpacity={0.7}
      >
        <ChevronLeft size={24} color={colors.text.inverse} />
      </TouchableOpacity>

      <View style={styles.moveCounter}>
        <Text style={styles.moveCounterText}>
          {currentMove + 1}/{totalMoves + 1}
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.button, isAtEnd && styles.buttonDisabled]}
        onPress={onNext}
        disabled={isAtEnd}
        activeOpacity={0.7}
      >
        <ChevronRight size={24} color={colors.text.inverse} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, isAtEnd && styles.buttonDisabled]}
        onPress={onLast}
        disabled={isAtEnd}
        activeOpacity={0.7}
      >
        <SkipForward size={20} color={colors.text.inverse} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[3],
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[2],
  },
  button: {
    width: 48,
    height: 48,
    borderRadius: borders.radius.full,
    backgroundColor: colors.text.primary, // Noir "Encre"
    justifyContent: "center",
    alignItems: "center",
    ...shadows.sm,
  },
  buttonDisabled: {
    opacity: 0.4,
    backgroundColor: colors.background.tertiary,
  },
  moveCounter: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    // Plus de background gris
    minWidth: 80,
    alignItems: "center",
    // Plus de bordure
  },
  moveCounterText: {
    fontSize: typography.fontSize.lg, // Plus grand
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamily.body, // System
    color: colors.text.primary,
  },
});
