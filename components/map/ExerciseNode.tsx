import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { Lock, Play } from "lucide-react-native";
import { colors, shadows } from "@/theme";
import { getQualityBadgeImage } from "@/utils/chess-badge";
import type { MapItem } from "@/types/map";

interface ExerciseNodeProps {
  item: MapItem;
  y: number;
  x: number;
  lockedExerciseIds: Set<string>;
  currentExerciseId: string | null;
  onPress: (id: string) => void;
  nodeSize: number;
}

export const ExerciseNode = ({
  item,
  y,
  x,
  lockedExerciseIds,
  currentExerciseId,
  onPress,
  nodeSize,
}: ExerciseNodeProps) => {
  const ex = item.data!.exercise!;
  const isCompleted = ex.completed;
  const isLocked = lockedExerciseIds.has(ex.id);
  const isCurrent = currentExerciseId === ex.id;
  const badgeImage = getQualityBadgeImage(ex.move_quality);

  // Affichage du Loss (Perte en pions)
  const lossText = ex.evaluation_loss
    ? `-${(ex.evaluation_loss / 100).toFixed(1)}`
    : "";

  return (
    <View
      style={[
        styles.nodeContainer,
        {
          top: y,
          left: x - nodeSize / 2,
          height: nodeSize,
          width: nodeSize,
        },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.node,
          isCompleted && styles.nodeCompleted,
          isLocked && styles.nodeLocked,
          isCurrent && styles.nodeCurrent,
        ]}
        onPress={() => onPress(ex.id)}
        activeOpacity={isLocked ? 1 : 0.7}
        disabled={isLocked}
      >
        <View style={styles.nodeContent}>
          {!isLocked && (
            <>
              <Text style={[styles.moveNumber, isLocked && styles.textLocked]}>
                #{ex.move_number}
              </Text>
              <Text style={[styles.lossText, isLocked && styles.textLocked]}>
                {lossText}
              </Text>
            </>
          )}
        </View>

        {/* Badge */}
        {!isLocked && (
          <View style={styles.badgeCorner}>
            <Image source={badgeImage} style={styles.badgeImageSmall} />
          </View>
        )}

        {/* Lock */}
        {isLocked && (
          <View style={styles.lockOverlay}>
            <Lock size={16} color={colors.text.tertiary} />
          </View>
        )}

        {/* Current Indicator (Play Icon) */}
        {isCurrent && (
          <View style={styles.playBadge}>
            <Play
              size={12}
              color={colors.background.primary}
              fill={colors.background.primary}
            />
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  nodeContainer: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 3,
  },
  node: {
    width: "100%",
    height: "100%",
    backgroundColor: colors.background.primary,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: colors.text.primary,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.sm,
  },
  nodeCompleted: {
    backgroundColor: colors.success.light,
    borderColor: colors.success.main,
  },
  nodeLocked: {
    backgroundColor: colors.background.tertiary,
    borderColor: colors.border.medium,
    borderStyle: "solid",
    ...shadows.none,
  },
  nodeCurrent: {
    borderColor: colors.text.primary,
    borderWidth: 3,
    transform: [{ scale: 1.1 }],
    backgroundColor: colors.background.primary,
    ...shadows.md,
  },
  nodeContent: {
    alignItems: "center",
  },
  moveNumber: {
    fontSize: 10,
    color: colors.text.tertiary,
    fontWeight: "600",
    marginBottom: 0,
  },
  lossText: {
    fontSize: 14,
    color: colors.text.primary,
    fontWeight: "bold",
  },
  textLocked: {
    color: colors.text.tertiary,
  },
  badgeCorner: {
    position: "absolute",
    top: -8,
    right: -8,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 5,
  },
  badgeImageSmall: {
    width: 28,
    height: 28,
    resizeMode: "contain",
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.4)",
    borderRadius: 20,
  },
  playBadge: {
    position: "absolute",
    bottom: -10,
    alignSelf: "center",
    backgroundColor: colors.text.primary,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.background.primary,
    zIndex: 10,
    ...shadows.sm,
  },
});
