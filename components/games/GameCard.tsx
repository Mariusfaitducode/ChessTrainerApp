import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

import type { Game } from "@/types/games";
import { formatDate, formatTimeControl, getResultLabel } from "@/utils";
import { Platform } from "@/types/chess";

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
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  platform: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    textTransform: "uppercase",
  },
  badge: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },
  players: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  player: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
    color: "#000",
  },
  vs: {
    marginHorizontal: 12,
    fontSize: 14,
    color: "#999",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  result: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  meta: {
    fontSize: 12,
    color: "#999",
  },
});
