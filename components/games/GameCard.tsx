import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

import type { Game } from "@/types/games";
import { formatDate, formatTimeControl, getResultLabel } from "@/utils";
import type { Platform } from "@/types/chess";
import { colors, spacing, typography, shadows, borders } from "@/theme";

interface GameCardProps {
  game: Game;
  onPress: () => void;
}

const getPlatformLabel = (platform: Platform): string => {
  return platform === "lichess" ? "Lichess" : "Chess.com";
};

export const GameCard = ({ game, onPress }: GameCardProps) => {
  const isAnalyzed = !!game.analyzed_at;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <Text style={styles.platform}>{getPlatformLabel(game.platform)}</Text>
        {isAnalyzed && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Analysé</Text>
          </View>
        )}
      </View>

      <View style={styles.players}>
        <Text style={styles.player} numberOfLines={1}>
          {game.white_player || "Blancs"}
        </Text>
        <Text style={styles.vs}>vs</Text>
        <Text style={styles.player} numberOfLines={1}>
          {game.black_player || "Noirs"}
        </Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.result}>{getResultLabel(game.result)}</Text>
        <Text style={styles.meta}>
          {formatTimeControl(game.time_control)} • {formatDate(game.played_at)}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.secondary,
    borderRadius: borders.radius.lg,
    padding: spacing[4],
    marginBottom: spacing[3],
    ...shadows.sm,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing[3],
  },
  platform: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.secondary,
    textTransform: "uppercase",
  },
  badge: {
    backgroundColor: colors.success.main,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borders.radius.md,
  },
  badgeText: {
    color: colors.text.inverse,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
  },
  players: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing[3],
  },
  player: {
    flex: 1,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  },
  vs: {
    marginHorizontal: spacing[3],
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  result: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  meta: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
  },
});